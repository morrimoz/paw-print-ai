import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRINTFUL_BASE = "https://api.printful.com";

function normalizePlacement(value: string) {
  return value.trim().toLowerCase();
}

function normalizeTechnique(value: string) {
  return value.trim().toLowerCase();
}

type CatalogProductOptionValue =
  | string
  | boolean
  | {
      value?: string | boolean;
      title?: string;
      label?: string;
      key?: string;
    };

type CatalogProductOption = {
  name?: string;
  techniques?: string[];
  type?: string;
  values?: CatalogProductOptionValue[];
};

function normalizeOptionValue(value: CatalogProductOptionValue): string | boolean | null {
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return null;

  if (typeof value.value === "string" || typeof value.value === "boolean") return value.value;
  if (typeof value.key === "string") return value.key;
  if (typeof value.label === "string") return value.label;
  if (typeof value.title === "string") return value.title;

  return null;
}

function pickDefaultProductOptionValue(option: CatalogProductOption): string | boolean | null {
  const values = Array.isArray(option.values) ? option.values : [];

  if (option.name === "stitch_color") {
    const autoValue = values.find((value) => {
      const normalized = normalizeOptionValue(value);
      return typeof normalized === "string" && normalized.toLowerCase() === "auto";
    });
    if (autoValue !== undefined) return normalizeOptionValue(autoValue);
  }

  if (values.length > 0) {
    return normalizeOptionValue(values[0]);
  }

  if (option.type === "boolean") return true;

  return null;
}

function buildRequiredProductOptions(
  productOptions: CatalogProductOption[],
  technique: string,
): Array<{ name: string; value: unknown }> {
  const normalizedTechnique = normalizeTechnique(technique);

  return productOptions
    .filter((option) => {
      if (!option?.name) return false;

      const optionTechniques = Array.isArray(option.techniques)
        ? option.techniques.map((t) => normalizeTechnique(String(t)))
        : [];

      // If techniques are specified, only include options relevant to the chosen technique.
      if (optionTechniques.length > 0 && !optionTechniques.includes(normalizedTechnique)) {
        return false;
      }

      const value = pickDefaultProductOptionValue(option);
      return value !== null && value !== undefined;
    })
    .map((option) => ({
      name: String(option.name),
      value: pickDefaultProductOptionValue(option),
    }));
}

function extractMockupTask(taskResponse: unknown) {
  const payload = taskResponse as Record<string, unknown>;
  if (Array.isArray(payload?.data)) return payload.data[0] as Record<string, unknown>;
  return (payload?.data as Record<string, unknown>) || payload;
}

function extractMockupUrl(taskResponse: unknown): string | null {
  const task = extractMockupTask(taskResponse);
  const directCandidates = [task?.mockup_url, task?.url].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (directCandidates[0]) return directCandidates[0];

  const variantMockups = [
    ...(Array.isArray(task?.catalog_variant_mockups) ? task.catalog_variant_mockups : []),
    ...(Array.isArray(task?.mockups) ? task.mockups : []),
  ] as Array<Record<string, unknown>>;

  for (const variantMockup of variantMockups) {
    const nestedCandidates = [variantMockup?.mockup_url, variantMockup?.url].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    if (nestedCandidates[0]) return nestedCandidates[0];

    const placements = [
      ...(Array.isArray(variantMockup?.placements) ? variantMockup.placements : []),
      ...(Array.isArray(variantMockup?.mockups) ? variantMockup.mockups : []),
    ] as Array<Record<string, unknown>>;

    for (const placement of placements) {
      const placementCandidates = [placement?.mockup_url, placement?.url].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      );
      if (placementCandidates[0]) return placementCandidates[0];
    }
  }

  return null;
}

/**
 * Printful integration with strong rate-limit safety:
 * - Catalog browsing: V1 (/categories, /products, /products/{id}) — V2 catalog is partial.
 * - Mockup generation: V2 (/v2/catalog-products/{id}/mockup-styles, /mockup-templates,
 *   /v2/mockup-tasks). V2 mockup-styles is the source of truth for "does this product
 *   support live mockups" and which placements are available.
 *
 * Rate-limit handling:
 *  - Aggressive in-memory cache (per warm container) for hot endpoints.
 *  - 429s are NEGATIVE-cached for 60s and surfaced to the client as 429 (not 500).
 *  - In-flight request dedup so concurrent identical calls share one upstream fetch.
 */
const cache = new Map<string, { data: unknown; expires: number }>();
function getCache<T>(key: string): T | null {
  const e = cache.get(key);
  if (e && e.expires > Date.now()) return e.data as T;
  if (e) cache.delete(key);
  return null;
}
function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

// Negative-cache for 429s, keyed by endpoint identity.
const rateLimitedUntil = new Map<string, number>();
function isRateLimited(key: string): number | null {
  const until = rateLimitedUntil.get(key);
  if (!until) return null;
  if (until <= Date.now()) {
    rateLimitedUntil.delete(key);
    return null;
  }
  return Math.ceil((until - Date.now()) / 1000);
}

// In-flight dedup
const inflight = new Map<string, Promise<unknown>>();
function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p as Promise<T>;
}

class RateLimitError extends Error {
  retryAfter: number;
  endpoint: string;
  constructor(endpoint: string, retryAfter: number, body: string) {
    super(`Printful rate limit on ${endpoint}: retry after ${retryAfter}s. ${body}`);
    this.endpoint = endpoint;
    this.retryAfter = retryAfter;
  }
}

async function pfFetch(endpoint: string, init: RequestInit, headers: HeadersInit): Promise<Response> {
  const limited = isRateLimited(endpoint);
  if (limited !== null) {
    throw new RateLimitError(endpoint, limited, "negative-cached");
  }
  const res = await fetch(endpoint, { ...init, headers: { ...(init.headers || {}), ...headers } });
  if (res.status === 429) {
    const retryHeader = res.headers.get("Retry-After");
    const body = await res.text();
    let retryAfter = parseInt(retryHeader || "0", 10);
    if (!retryAfter) {
      // Try to parse "after N seconds" from the body.
      const m = body.match(/after (\d+) seconds?/i);
      retryAfter = m ? parseInt(m[1], 10) : 60;
    }
    rateLimitedUntil.set(endpoint, Date.now() + retryAfter * 1000);
    throw new RateLimitError(endpoint, retryAfter, body);
  }
  return res;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PRINTFUL_API_KEY = Deno.env.get("PRINTFUL_API_KEY");
    if (!PRINTFUL_API_KEY) {
      throw new Error("PRINTFUL_API_KEY is not configured");
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const storeId = Deno.env.get("PRINTFUL_STORE_ID");

    const headers: HeadersInit = {
      Authorization: `Bearer ${PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
      ...(storeId ? { "X-PF-Store-Id": storeId } : {}),
    };

    let result: unknown;

    switch (action) {
      // ---------- CATALOG (V1) ----------
      case "categories": {
        const cached = getCache("categories");
        if (cached) {
          result = cached;
          break;
        }
        result = await dedupe("categories", async () => {
          const res = await pfFetch(`${PRINTFUL_BASE}/categories`, {}, headers);
          if (!res.ok) throw new Error(`Printful categories failed [${res.status}]: ${await res.text()}`);
          const json = await res.json();
          setCache("categories", json, 24 * 60 * 60 * 1000);
          return json;
        });
        break;
      }

      case "products": {
        const categoryId = url.searchParams.get("category_id");
        const key = `products-${categoryId || "all"}`;
        const cached = getCache(key);
        if (cached) {
          result = cached;
          break;
        }
        result = await dedupe(key, async () => {
          const endpoint = categoryId
            ? `${PRINTFUL_BASE}/products?category_id=${categoryId}`
            : `${PRINTFUL_BASE}/products`;
          const res = await pfFetch(endpoint, {}, headers);
          if (!res.ok) throw new Error(`Printful products failed [${res.status}]: ${await res.text()}`);
          const json = await res.json();
          setCache(key, json, 6 * 60 * 60 * 1000);
          return json;
        });
        break;
      }

      case "product":
      case "variants": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const key = `product-${productId}`;
        const cached = getCache(key);
        if (cached) {
          result = cached;
          break;
        }

        result = await dedupe(key, async () => {
          const [v1Res, v2Res] = await Promise.all([
            pfFetch(`${PRINTFUL_BASE}/products/${productId}`, {}, headers),
            pfFetch(`${PRINTFUL_BASE}/v2/catalog-products/${productId}`, {}, headers),
          ]);

          if (!v1Res.ok) {
            throw new Error(`Printful product failed [${v1Res.status}]: ${await v1Res.text()}`);
          }
          if (!v2Res.ok) {
            throw new Error(`Printful catalog product failed [${v2Res.status}]: ${await v2Res.text()}`);
          }

          const v1Json = await v1Res.json();
          const v2Json = await v2Res.json();
          const v2Product = (v2Json?.data || v2Json) as Record<string, unknown>;

          const enriched = {
            ...v1Json,
            result: {
              ...(v1Json?.result || {}),
              designSpec: {
                product_options: Array.isArray(v2Product?.product_options) ? v2Product.product_options : [],
                placements: Array.isArray(v2Product?.placements) ? v2Product.placements : [],
                techniques: Array.isArray(v2Product?.techniques) ? v2Product.techniques : [],
              },
            },
          };

          setCache(key, enriched, 6 * 60 * 60 * 1000);
          return enriched;
        });

        break;
      }

      // ---------- MOCKUPS (V2) ----------
      case "mockup-styles": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const key = `mockup-styles-${productId}`;
        const cached = getCache(key);
        if (cached) {
          result = cached;
          break;
        }
        result = await dedupe(key, async () => {
          const res = await pfFetch(`${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-styles`, {}, headers);
          if (res.status === 404) {
            const out = { data: [], supported: false };
            setCache(key, out, 24 * 60 * 60 * 1000);
            return out;
          }
          if (!res.ok) {
            throw new Error(`Printful mockup-styles failed [${res.status}]: ${await res.text()}`);
          }
          const json = await res.json();
          const data = json?.data || [];
          // Each entry has { placement, technique, mockup_styles: [...] }
          const placements: string[] = Array.isArray(data)
            ? [...new Set(data.map((d: { placement?: string }) => d.placement).filter(Boolean))]
            : [];
          const out = {
            data,
            supported: Array.isArray(data) && data.length > 0,
            placements,
          };
          setCache(key, out, 24 * 60 * 60 * 1000);
          return out;
        });
        break;
      }

      case "mockup-templates": {
        const productId = url.searchParams.get("product_id");
        const variantIds = url.searchParams.get("variant_ids");
        if (!productId) throw new Error("product_id is required");
        const key = `mockup-templates-${productId}-${variantIds || "all"}`;
        const cached = getCache(key);
        if (cached) {
          result = cached;
          break;
        }
        result = await dedupe(key, async () => {
          const qs = variantIds ? `?catalog_variant_ids=${variantIds}` : "";
          const res = await pfFetch(
            `${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-templates${qs}`,
            {},
            headers,
          );
          if (!res.ok) {
            throw new Error(`Printful mockup-templates failed [${res.status}]: ${await res.text()}`);
          }
          const json = await res.json();
          setCache(key, json, 6 * 60 * 60 * 1000);
          return json;
        });
        break;
      }

      // POST /v2/mockup-tasks
      case "create-mockup-task": {
        const body = await req.json();
        const {
          catalog_product_id,
          catalog_variant_ids,
          placement,
          image_url,
          format = "jpg",
          mockup_style_id,
          technique,
          store_id,
          product_options,
        } = body as {
          catalog_product_id: number | string;
          catalog_variant_ids: Array<number | string>;
          placement: string;
          image_url: string;
          format?: "jpg" | "png";
          mockup_style_id?: number | string;
          technique?: string;
          store_id?: number | string;
          product_options?: Record<string, unknown>;
        };

        const variantId = Array.isArray(catalog_variant_ids) ? catalog_variant_ids[0] : null;

        if (!catalog_product_id || !variantId || !placement || !image_url) {
          throw new Error("catalog_product_id, catalog_variant_ids[0], placement, image_url are required");
        }

        let resolvedMockupStyleId = mockup_style_id ? Number(mockup_style_id) : null;
        let resolvedTechnique = technique || null;

        if (!resolvedMockupStyleId || !resolvedTechnique) {
          const stylesRes = await pfFetch(
            `${PRINTFUL_BASE}/v2/catalog-products/${catalog_product_id}/mockup-styles`,
            {},
            headers,
          );

          if (!stylesRes.ok) {
            throw new Error(`Printful mockup-styles failed [${stylesRes.status}]: ${await stylesRes.text()}`);
          }

          const stylesJson = await stylesRes.json();
          const groups = stylesJson?.data || [];

          const normalizedPlacement = normalizePlacement(placement);

          const matchingGroup = Array.isArray(groups)
            ? groups.find(
                (g: {
                  placement?: string;
                  technique?: string;
                  mockup_styles?: Array<{ id: number; restricted_to_variants?: number[] }>;
                }) => {
                  if (!g.placement || normalizePlacement(g.placement) !== normalizedPlacement) return false;

                  const styles = g.mockup_styles || [];
                  if (styles.length === 0) return false;

                  return styles.some((style) => {
                    const restricted = style.restricted_to_variants;
                    return !restricted || restricted.length === 0 || restricted.includes(Number(variantId));
                  });
                },
              )
            : null;

          if (!matchingGroup) {
            throw new Error(
              `No Printful mockup style group found for placement "${placement}" and variant "${variantId}"`,
            );
          }

          resolvedTechnique = resolvedTechnique || matchingGroup.technique || null;

          const matchingStyle = Array.isArray(matchingGroup.mockup_styles)
            ? matchingGroup.mockup_styles.find((style: { id: number; restricted_to_variants?: number[] }) => {
                const restricted = style.restricted_to_variants;
                return !restricted || restricted.length === 0 || restricted.includes(Number(variantId));
              }) || matchingGroup.mockup_styles[0]
            : null;

          if (!resolvedMockupStyleId && matchingStyle?.id) {
            resolvedMockupStyleId = Number(matchingStyle.id);
          }

          if (!resolvedMockupStyleId) {
            throw new Error(`No Printful mockup style id found for placement "${placement}"`);
          }

          if (!resolvedTechnique) {
            throw new Error(`No Printful technique found for placement "${placement}"`);
          }
        }

        const catalogProductRes = await pfFetch(
          `${PRINTFUL_BASE}/v2/catalog-products/${catalog_product_id}`,
          {},
          headers,
        );

        if (!catalogProductRes.ok) {
          throw new Error(
            `Printful catalog product failed [${catalogProductRes.status}]: ${await catalogProductRes.text()}`,
          );
        }

        const catalogProductJson = await catalogProductRes.json();
        const catalogProduct = (catalogProductJson?.data || catalogProductJson) as Record<string, unknown>;

        const availableProductOptions = Array.isArray(catalogProduct?.product_options)
          ? (catalogProduct.product_options as CatalogProductOption[])
          : [];

        const defaultProductOptions = buildRequiredProductOptions(availableProductOptions, String(resolvedTechnique));

        const uiProductOptions = Object.entries(product_options || {})
          .filter(([name, value]) => name && value !== null && value !== undefined && value !== "")
          .map(([name, value]) => ({ name, value }));

        const mergedProductOptionsMap = new Map<string, { name: string; value: unknown }>();

        for (const option of defaultProductOptions) {
          mergedProductOptionsMap.set(option.name, option);
        }
        for (const option of uiProductOptions) {
          mergedProductOptionsMap.set(option.name, option);
        }

        const resolvedProductOptions = Array.from(mergedProductOptionsMap.values());

        const taskHeaders: HeadersInit = { ...headers };
        if (store_id) {
          taskHeaders["X-PF-Store-Id"] = String(store_id);
        }

        const taskBody = {
          format,
          products: [
            {
              source: "catalog",
              mockup_style_ids: [Number(resolvedMockupStyleId)],
              catalog_product_id: Number(catalog_product_id),
              catalog_variant_ids: [Number(variantId)],
              product_options: resolvedProductOptions,
              placements: [
                {
                  placement,
                  technique: resolvedTechnique,
                  layers: [
                    {
                      type: "file",
                      url: image_url,
                    },
                  ],
                },
              ],
            },
          ],
        };

        const taskRes = await pfFetch(
          `${PRINTFUL_BASE}/v2/mockup-tasks`,
          { method: "POST", body: JSON.stringify(taskBody) },
          taskHeaders,
        );

        if (!taskRes.ok) {
          const errText = await taskRes.text();
          console.error(
            "v2 create-mockup-task failed:",
            taskRes.status,
            errText,
            JSON.stringify({
              taskBody,
              resolvedTechnique,
              resolvedMockupStyleId,
              resolvedProductOptions,
            }),
          );
          throw new Error(`Mockup task creation failed [${taskRes.status}]: ${errText}`);
        }

        result = await taskRes.json();
        break;
      }

      case "get-mockup-task": {
        const taskId = url.searchParams.get("task_id");
        if (!taskId) throw new Error("task_id is required");
        const res = await pfFetch(`${PRINTFUL_BASE}/v2/mockup-tasks?id=${encodeURIComponent(taskId)}`, {}, headers);
        if (!res.ok) throw new Error(`Printful get-mockup-task failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ---------- ORDERS ----------
      case "create-order": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Authorization required for orders");

        const body = await req.json();
        const { items, shipping_address } = body;
        if (!items || !shipping_address) {
          throw new Error("items and shipping_address are required");
        }

        const res = await pfFetch(
          `${PRINTFUL_BASE}/v2/orders`,
          { method: "POST", body: JSON.stringify({ recipient: shipping_address, items }) },
          headers,
        );

        if (!res.ok) throw new Error(`Printful order failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof RateLimitError) {
      // Surface rate limits as 429, not 500. Client can back off.
      return new Response(JSON.stringify({ error: "rate_limited", retry_after: e.retryAfter }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(e.retryAfter),
        },
      });
    }
    console.error("printful error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
