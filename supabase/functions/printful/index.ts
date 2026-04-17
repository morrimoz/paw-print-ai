import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRINTFUL_BASE = "https://api.printful.com";

/**
 * Printful integration.
 * - Catalog browsing: V1 (/categories, /products, /products/{id}) — V2 catalog is partial.
 * - Mockup generation: V2 (/v2/catalog-products/{id}/mockup-styles, /mockup-templates,
 *   /v2/mockup-tasks). V2 mockup-styles is the source of truth for "does this product
 *   support live mockups" and which placements are available per variant.
 *
 * In-memory cache (per warm container) reduces 429s on hot endpoints.
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
        const res = await fetch(`${PRINTFUL_BASE}/categories`, { headers });
        if (!res.ok) throw new Error(`Printful categories failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        setCache("categories", result, 24 * 60 * 60 * 1000);
        break;
      }

      case "products": {
        const categoryId = url.searchParams.get("category_id");
        const key = `products-${categoryId || "all"}`;
        const cached = getCache(key);
        if (cached) { result = cached; break; }
        const endpoint = categoryId
          ? `${PRINTFUL_BASE}/products?category_id=${categoryId}`
          : `${PRINTFUL_BASE}/products`;
        const res = await fetch(endpoint, { headers });
        if (!res.ok) throw new Error(`Printful products failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        setCache(key, result, 60 * 60 * 1000);
        break;
      }

      case "product":
      case "variants": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const key = `product-${productId}`;
        const cached = getCache(key);
        if (cached) { result = cached; break; }
        const res = await fetch(`${PRINTFUL_BASE}/products/${productId}`, { headers });
        if (!res.ok) throw new Error(`Printful product failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        setCache(key, result, 60 * 60 * 1000);
        break;
      }

      // ---------- MOCKUPS (V2) ----------
      // GET /v2/catalog-products/{id}/mockup-styles
      // Returns the mockup styles + placements available for each variant.
      // We use this as the truthful "does this product support mockups" check.
      case "mockup-styles": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const key = `mockup-styles-${productId}`;
        const cached = getCache(key);
        if (cached) { result = cached; break; }
        const res = await fetch(
          `${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-styles`,
          { headers }
        );
        if (res.status === 404) {
          result = { data: [], supported: false };
          setCache(key, result, 24 * 60 * 60 * 1000);
          break;
        }
        if (!res.ok) {
          // 429 etc. — don't cache, surface so the client can retry later.
          throw new Error(`Printful mockup-styles failed [${res.status}]: ${await res.text()}`);
        }
        const json = await res.json();
        const data = json?.data || [];
        result = { data, supported: Array.isArray(data) && data.length > 0 };
        setCache(key, result, 24 * 60 * 60 * 1000);
        break;
      }

      // GET /v2/catalog-products/{id}/mockup-templates?catalog_variant_ids=...
      // Returns placement metadata for the given variants.
      case "mockup-templates": {
        const productId = url.searchParams.get("product_id");
        const variantIds = url.searchParams.get("variant_ids"); // optional comma-separated
        if (!productId) throw new Error("product_id is required");
        const key = `mockup-templates-${productId}-${variantIds || "all"}`;
        const cached = getCache(key);
        if (cached) { result = cached; break; }
        const qs = variantIds ? `?catalog_variant_ids=${variantIds}` : "";
        const res = await fetch(
          `${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-templates${qs}`,
          { headers }
        );
        if (!res.ok) {
          throw new Error(`Printful mockup-templates failed [${res.status}]: ${await res.text()}`);
        }
        result = await res.json();
        setCache(key, result, 60 * 60 * 1000);
        break;
      }

      // POST /v2/mockup-tasks  → create a mockup generation task.
      // Body: { catalog_product_id, format, products:[{ catalog_variant_id, placements:[{placement, image_url, position?}] }] }
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
            catalog_variant_id: Number(catalog_variant_id),
            placements: [{
              placement,
              image_url,
            }],
          }],
        };

        const taskRes = await fetch(`${PRINTFUL_BASE}/v2/mockup-tasks`, {
          method: "POST",
          headers,
          body: JSON.stringify(taskBody),
        });

        if (!taskRes.ok) {
          const errText = await taskRes.text();
          console.error("v2 create-mockup-task failed:", taskRes.status, errText);
          throw new Error(`Mockup task creation failed [${taskRes.status}]: ${errText}`);
        }
        result = await taskRes.json();
        break;
      }

      // GET /v2/mockup-tasks?id={taskId}
      case "get-mockup-task": {
        const taskId = url.searchParams.get("task_id");
        if (!taskId) throw new Error("task_id is required");
        const res = await fetch(`${PRINTFUL_BASE}/v2/mockup-tasks?id=${encodeURIComponent(taskId)}`, {
          headers,
        });
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

        const res = await fetch(`${PRINTFUL_BASE}/orders`, {
          method: "POST",
          headers,
          body: JSON.stringify({ recipient: shipping_address, items }),
        });

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
