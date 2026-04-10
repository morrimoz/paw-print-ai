import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRINTFUL_BASE = "https://api.printful.com";

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

    let result;

    switch (action) {
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

      case "product": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const res = await fetch(`${PRINTFUL_BASE}/products/${productId}`, { headers });
        if (!res.ok) throw new Error(`Printful product failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      case "variants": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const res = await fetch(`${PRINTFUL_BASE}/products/${productId}`, { headers });
        if (!res.ok) throw new Error(`Printful variants failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      case "mockup-templates": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const res = await fetch(`${PRINTFUL_BASE}/mockup-generator/printfiles/${productId}`, { headers });
        if (!res.ok) throw new Error(`Printful mockup templates failed [${res.status}]: ${await res.text()}`);
        result = await res.json();
        break;
      }

      case "create-mockup": {
        const body = await req.json();
        const { product_id, variant_ids, image_url } = body;
        if (!product_id || !image_url) throw new Error("product_id and image_url are required");

        // First get print files to know placement
        const printfilesRes = await fetch(`${PRINTFUL_BASE}/mockup-generator/printfiles/${product_id}`, { headers });
        if (!printfilesRes.ok) {
          // Fallback - return the artwork URL as-is
          result = { code: 200, result: { mockups: [], fallback: true } };
          break;
        }
        const printfiles = await printfilesRes.json();

        // Find the default print file placement
        const placements = printfiles?.result?.printfiles || [];
        const defaultPlacement = placements[0];

        if (!defaultPlacement) {
          result = { code: 200, result: { mockups: [], fallback: true } };
          break;
        }

        // Create mockup task
        const mockupBody: Record<string, unknown> = {
          variant_ids: variant_ids || [defaultPlacement.variant_ids?.[0]].filter(Boolean),
          files: [
            {
              placement: defaultPlacement.printfile_id ? "default" : "front",
              image_url: image_url,
              position: {
                area_width: defaultPlacement.printfiles?.[0]?.width || 1800,
                area_height: defaultPlacement.printfiles?.[0]?.height || 2400,
                width: defaultPlacement.printfiles?.[0]?.width || 1800,
                height: defaultPlacement.printfiles?.[0]?.height || 2400,
                top: 0,
                left: 0,
              },
            },
          ],
        };

        const mockupRes = await fetch(`${PRINTFUL_BASE}/mockup-generator/create-task/${product_id}`, {
          method: "POST",
          headers,
          body: JSON.stringify(mockupBody),
        });

        if (!mockupRes.ok) {
          result = { code: 200, result: { mockups: [], fallback: true } };
          break;
        }

        const taskData = await mockupRes.json();
        const taskKey = taskData?.result?.task_key;

        if (!taskKey) {
          result = { code: 200, result: { mockups: [], fallback: true } };
          break;
        }

        // Poll for result (max 30s)
        let mockupResult = null;
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const statusRes = await fetch(`${PRINTFUL_BASE}/mockup-generator/task?task_key=${taskKey}`, { headers });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData?.result?.status === "completed") {
              mockupResult = statusData.result;
              break;
            } else if (statusData?.result?.status === "failed") {
              break;
            }
          }
        }

        result = {
          code: 200,
          result: mockupResult || { mockups: [], fallback: true },
        };
        break;
      }

      case "create-order": {
        // Validate auth
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Authorization required for orders");

        const body = await req.json();
        const { items, shipping_address } = body;
        if (!items || !shipping_address) throw new Error("items and shipping_address are required");

        const orderBody = {
          recipient: shipping_address,
          items: items,
        };

        // Create draft order
        const res = await fetch(`${PRINTFUL_BASE}/orders`, {
          method: "POST",
          headers,
          body: JSON.stringify(orderBody),
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
