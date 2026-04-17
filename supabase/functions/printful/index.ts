import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRINTFUL_BASE = "https://api.printful.com";

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

    const headers = {
      Authorization: `Bearer ${PRINTFUL_API_KEY}`,
      "Content-Type": "application/json",
    };

    let result: unknown;

    switch (action) {
      // ---------- CATALOG (V1) ----------
      case "categories": {
        const cached = getCache("categories");
        if (cached) { result = cached; break; }
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
        if (cached) { result = cached; break; }
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
        if (cached) { result = cached; break; }
        result = await dedupe(key, async () => {
          const res = await pfFetch(`${PRINTFUL_BASE}/products/${productId}`, {}, headers);
          if (!res.ok) throw new Error(`Printful product failed [${res.status}]: ${await res.text()}`);
          const json = await res.json();
          setCache(key, json, 6 * 60 * 60 * 1000);
          return json;
        });
        break;
      }

      // ---------- MOCKUPS (V2) ----------
      case "mockup-styles": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const key = `mockup-styles-${productId}`;
        const cached = getCache(key);
        if (cached) { result = cached; break; }
        result = await dedupe(key, async () => {
          const res = await pfFetch(
            `${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-styles`,
            {},
            headers
          );
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
            ? data.map((d: { placement?: string }) => d.placement).filter(Boolean)
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
        if (cached) { result = cached; break; }
        result = await dedupe(key, async () => {
          const qs = variantIds ? `?catalog_variant_ids=${variantIds}` : "";
          const res = await pfFetch(
            `${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-templates${qs}`,
            {},
            headers
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
          catalog_variant_id,
          placement,
          image_url,
          format = "jpg",
        } = body as {
          catalog_product_id: number | string;
          catalog_variant_id: number | string;
          placement: string;
          image_url: string;
          format?: string;
        };

        if (!catalog_product_id || !catalog_variant_id || !placement || !image_url) {
          throw new Error("catalog_product_id, catalog_variant_id, placement, image_url are required");
        }

        const taskBody = {
          catalog_product_id: Number(catalog_product_id),
          format,
          products: [{
            source: "catalog",
            catalog_variant_id: Number(catalog_variant_id),
            placements: [{
              placement,
              technique: "digital",
              image_url,
              source: "url",
            }],
          }],
        };

        const taskRes = await pfFetch(
          `${PRINTFUL_BASE}/v2/mockup-tasks`,
          { method: "POST", body: JSON.stringify(taskBody) },
          headers
        );

        if (!taskRes.ok) {
          const errText = await taskRes.text();
          console.error("v2 create-mockup-task failed:", taskRes.status, errText);
          throw new Error(`Mockup task creation failed [${taskRes.status}]: ${errText}`);
        }
        result = await taskRes.json();
        break;
      }

      case "get-mockup-task": {
        const taskId = url.searchParams.get("task_id");
        if (!taskId) throw new Error("task_id is required");
        const res = await pfFetch(
          `${PRINTFUL_BASE}/v2/mockup-tasks?id=${encodeURIComponent(taskId)}`,
          {},
          headers
        );
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
          `${PRINTFUL_BASE}/orders`,
          { method: "POST", body: JSON.stringify({ recipient: shipping_address, items }) },
          headers
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
      return new Response(
        JSON.stringify({ error: "rate_limited", retry_after: e.retryAfter }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(e.retryAfter),
          },
        }
      );
    }
    console.error("printful error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
