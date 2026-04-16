import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRINTFUL_BASE = "https://api.printful.com";

/**
 * Printful integration.
 * Mockups use the v1 Mockup Generator API (POST /mockup-generator/create-task/{product_id})
 * because it's stable, well-documented, and works for the broadest set of catalog products.
 * Docs: https://developers.printful.com/docs/#tag/Mockup-Generator-API
 */
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
      // ---------- CATALOG ----------
      case "categories": {
        const res = await fetch(`${PRINTFUL_BASE}/categories`, { headers });
        if (!res.ok) throw new Error(`Printful categories failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      case "products": {
        const categoryId = url.searchParams.get("category_id");
        const endpoint = categoryId
          ? `${PRINTFUL_BASE}/products?category_id=${categoryId}`
          : `${PRINTFUL_BASE}/products`;
        const res = await fetch(endpoint, { headers });
        if (!res.ok) throw new Error(`Printful products failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      case "product":
      case "variants": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const res = await fetch(`${PRINTFUL_BASE}/products/${productId}`, { headers });
        if (!res.ok) throw new Error(`Printful product failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      // ---------- MOCKUPS (v1 - stable + well-supported) ----------
      // Returns the print files (placements: front, back, default) supported by the product.
      // Used to know which products mockup-generator can render.
      case "printfiles": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const res = await fetch(
          `${PRINTFUL_BASE}/mockup-generator/printfiles/${productId}`,
          { headers }
        );
        if (!res.ok) {
          console.error(`Printfiles failed [${res.status}]: ${await res.text()}`);
          result = { code: res.status, result: null };
          break;
        }
        result = await res.json();
        break;
      }

      case "create-mockup": {
        const body = await req.json();
        const { product_id, variant_ids, image_url } = body as {
          product_id: number | string;
          variant_ids?: number[];
          image_url: string;
        };

        if (!product_id || !image_url) {
          throw new Error("product_id and image_url are required");
        }

        // 1) Fetch printfiles to discover supported variant_ids and the canonical placement key.
        let placement = "default";
        let supportedVariantIds: number[] = variant_ids ?? [];
        try {
          const pfRes = await fetch(
            `${PRINTFUL_BASE}/mockup-generator/printfiles/${product_id}`,
            { headers }
          );
          if (pfRes.ok) {
            const pfData = await pfRes.json();
            const printfiles = pfData?.result?.printfiles ?? [];
            const variantPrintfiles = pfData?.result?.variant_printfiles ?? [];

            // Pick first available placement key (front, default, etc.)
            if (printfiles.length > 0) {
              const placementKeys = Object.keys(printfiles[0].placements ?? { default: "" });
              if (placementKeys.length > 0) placement = placementKeys[0];
            }
            // If caller didn't pass variants, use the first few that printfiles supports
            if (!supportedVariantIds.length && variantPrintfiles.length > 0) {
              supportedVariantIds = variantPrintfiles
                .slice(0, 3)
                .map((v: { variant_id: number }) => v.variant_id);
            }
          }
        } catch (e) {
          console.error("printfiles lookup failed:", e);
        }

        if (!supportedVariantIds.length) {
          // No variants available - the mockup generator cannot run for this product.
          result = { code: 200, result: { mockups: [], fallback: true, reason: "no_variants" } };
          break;
        }

        // 2) Create v1 mockup task.
        const mockupBody = {
          variant_ids: supportedVariantIds,
          format: "jpg",
          files: [
            {
              placement,
              image_url,
              position: {
                area_width: 1800,
                area_height: 2400,
                width: 1800,
                height: 1800,
                top: 300,
                left: 0,
              },
            },
          ],
        };

        try {
          const taskRes = await fetch(
            `${PRINTFUL_BASE}/mockup-generator/create-task/${product_id}`,
            {
              method: "POST",
              headers,
              body: JSON.stringify(mockupBody),
            }
          );

          if (!taskRes.ok) {
            console.error("v1 mockup create-task failed:", await taskRes.text());
            result = { code: 200, result: { mockups: [], fallback: true, reason: "create_failed" } };
            break;
          }

          const taskData = await taskRes.json();
          const taskKey = taskData?.result?.task_key;

          if (!taskKey) {
            result = { code: 200, result: { mockups: [], fallback: true, reason: "no_task_key" } };
            break;
          }

          // 3) Poll task up to ~30s.
          let mockups: { placement: string; variant_ids: number[]; mockup_url: string }[] = [];
          for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const statusRes = await fetch(
              `${PRINTFUL_BASE}/mockup-generator/task?task_key=${encodeURIComponent(taskKey)}`,
              { headers }
            );
            if (!statusRes.ok) continue;
            const statusData = await statusRes.json();
            const task = statusData?.result;
            if (task?.status === "completed") {
              mockups = (task.mockups ?? []).map((m: { placement: string; variant_ids: number[]; mockup_url: string }) => ({
                placement: m.placement,
                variant_ids: m.variant_ids,
                mockup_url: m.mockup_url,
              }));
              break;
            }
            if (task?.status === "failed") {
              console.error("v1 mockup task failed");
              break;
            }
          }

          result = { code: 200, result: { mockups, fallback: mockups.length === 0 } };
        } catch (e) {
          console.error("v1 mockup-generator error:", e);
          result = { code: 200, result: { mockups: [], fallback: true, reason: "exception" } };
        }
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
