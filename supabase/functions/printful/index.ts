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

    let result: unknown;

    switch (action) {
      // ---------- CATALOG (v1 — stable, paginated, rich data) ----------
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

      // ---------- MOCKUPS (v2 — async task with polling) ----------
      case "mockup-styles": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const res = await fetch(
          `${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-styles`,
          { headers }
        );
        if (!res.ok) {
          console.error(`Mockup styles failed [${res.status}]: ${await res.text()}`);
          result = { data: [] };
          break;
        }
        result = await res.json();
        break;
      }

      case "mockup-templates": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        const res = await fetch(
          `${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-templates`,
          { headers }
        );
        if (!res.ok) {
          console.error(`Mockup templates failed [${res.status}]: ${await res.text()}`);
          result = { data: [] };
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
          mockup_style_ids?: number[];
        };
        let { mockup_style_ids } = body as { mockup_style_ids?: number[] };

        if (!product_id || !image_url) {
          throw new Error("product_id and image_url are required");
        }

        // 1) Resolve mockup styles if not provided — use the first available style.
        if (!mockup_style_ids?.length) {
          try {
            const stylesRes = await fetch(
              `${PRINTFUL_BASE}/v2/catalog-products/${product_id}/mockup-styles`,
              { headers }
            );
            if (stylesRes.ok) {
              const stylesData = await stylesRes.json();
              const styles = stylesData?.data || [];
              if (styles.length > 0) mockup_style_ids = [styles[0].id];
            }
          } catch (e) {
            console.error("mockup-styles lookup failed:", e);
          }
        }

        // 2) Resolve placements via mockup-templates so we know the real placement key
        //    (front, back, etc.) and print-area dimensions.
        let placement = "front";
        let position: Record<string, number> | undefined;
        try {
          const templatesRes = await fetch(
            `${PRINTFUL_BASE}/v2/catalog-products/${product_id}/mockup-templates`,
            { headers }
          );
          if (templatesRes.ok) {
            const templatesData = await templatesRes.json();
            const templates = templatesData?.data || [];
            if (templates.length > 0) {
              const t = templates[0];
              if (t.placement) placement = t.placement;
              if (t.print_area) {
                const w = t.print_area.width || 1800;
                const h = t.print_area.height || 2400;
                position = {
                  area_width: w,
                  area_height: h,
                  width: w,
                  height: h,
                  top: 0,
                  left: 0,
                };
              }
            }
          }
        } catch (e) {
          console.error("mockup-templates lookup failed:", e);
        }

        // 3) Create the mockup task (v2 async API).
        const mockupBody: Record<string, unknown> = {
          catalog_product_id: Number(product_id),
          ...(variant_ids?.length ? { catalog_variant_ids: variant_ids } : {}),
          ...(mockup_style_ids?.length ? { mockup_style_ids } : {}),
          placements: [
            {
              placement,
              image_url,
              ...(position ? { position } : {}),
            },
          ],
        };

        try {
          const taskRes = await fetch(`${PRINTFUL_BASE}/v2/mockup-tasks`, {
            method: "POST",
            headers,
            body: JSON.stringify(mockupBody),
          });

          if (taskRes.ok) {
            const taskData = await taskRes.json();
            const taskId = taskData?.data?.id;

            if (taskId) {
              // Poll up to ~30s
              for (let i = 0; i < 15; i++) {
                await new Promise((r) => setTimeout(r, 2000));
                const statusRes = await fetch(
                  `${PRINTFUL_BASE}/v2/mockup-tasks?id=${taskId}`,
                  { headers }
                );
                if (!statusRes.ok) continue;
                const statusData = await statusRes.json();
                const task = statusData?.data;
                if (task?.status === "completed") {
                  const mockups = (task.catalog_variant_mockups || []).flatMap((v: any) =>
                    (v.mockups || []).map((m: any) => ({
                      placement: m.placement,
                      variant_ids: [v.catalog_variant_id],
                      mockup_url: m.mockup_url,
                    }))
                  );
                  result = { code: 200, result: { mockups } };
                  break;
                }
                if (task?.status === "failed") {
                  console.error("Mockup task failed:", task.failure_reasons);
                  break;
                }
              }
            }
          } else {
            console.error("v2 mockup-tasks create failed:", await taskRes.text());
          }
        } catch (e) {
          console.error("v2 mockup-task error:", e);
        }

        if (!result) {
          // Graceful: tell client the mockup is unavailable; UI will show product image only.
          result = { code: 200, result: { mockups: [], fallback: true } };
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
