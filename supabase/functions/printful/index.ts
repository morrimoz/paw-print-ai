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

      case "mockup-styles": {
        const productId = url.searchParams.get("product_id");
        if (!productId) throw new Error("product_id is required");
        // Use v2 API for mockup styles
        const res = await fetch(`${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-styles`, {
          headers,
        });
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
        // Use v2 API for mockup templates
        const res = await fetch(`${PRINTFUL_BASE}/v2/catalog-products/${productId}/mockup-templates`, {
          headers,
        });
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
        const { product_id, variant_ids, image_url, mockup_style_ids } = body;
        if (!product_id || !image_url) throw new Error("product_id and image_url are required");

        // Step 1: Get mockup styles if not provided
        let styleIds = mockup_style_ids;
        if (!styleIds || styleIds.length === 0) {
          try {
            const stylesRes = await fetch(`${PRINTFUL_BASE}/v2/catalog-products/${product_id}/mockup-styles`, { headers });
            if (stylesRes.ok) {
              const stylesData = await stylesRes.json();
              const styles = stylesData?.data || [];
              // Pick the first style (usually "front" view)
              if (styles.length > 0) {
                styleIds = [styles[0].id];
              }
            }
          } catch (e) {
            console.error("Failed to get mockup styles:", e);
          }
        }

        // Step 2: Get mockup templates to know placement details
        let placements: any[] = [];
        try {
          const templatesRes = await fetch(`${PRINTFUL_BASE}/v2/catalog-products/${product_id}/mockup-templates`, { headers });
          if (templatesRes.ok) {
            const templatesData = await templatesRes.json();
            placements = templatesData?.data || [];
          }
        } catch (e) {
          console.error("Failed to get mockup templates:", e);
        }

        // Build placement data from templates
        const placementConfigs: any[] = [];
        if (placements.length > 0) {
          // Use the first template's placement info
          const template = placements[0];
          placementConfigs.push({
            placement: template.placement || "front",
            image_url: image_url,
            position: template.print_area ? {
              area_width: template.print_area.width || 1800,
              area_height: template.print_area.height || 2400,
              width: template.print_area.width || 1800,
              height: template.print_area.height || 2400,
              top: 0,
              left: 0,
            } : {
              area_width: 1800,
              area_height: 2400,
              width: 1800,
              height: 2400,
              top: 0,
              left: 0,
            },
          });
        } else {
          // Fallback placement
          placementConfigs.push({
            placement: "front",
            image_url: image_url,
            position: {
              area_width: 1800,
              area_height: 2400,
              width: 1800,
              height: 2400,
              top: 0,
              left: 0,
            },
          });
        }

        // Step 3: Try v2 mockup task creation
        try {
          const mockupBody: Record<string, unknown> = {
            catalog_product_id: Number(product_id),
            catalog_variant_ids: variant_ids || [],
            mockup_style_ids: styleIds || [],
            placements: placementConfigs.map(p => ({
              placement: p.placement,
              image_url: p.image_url,
              ...(p.position ? { position: p.position } : {}),
            })),
          };

          const mockupRes = await fetch(`${PRINTFUL_BASE}/v2/mockup-tasks`, {
            method: "POST",
            headers,
            body: JSON.stringify(mockupBody),
          });

          if (mockupRes.ok) {
            const taskData = await mockupRes.json();
            const taskId = taskData?.data?.id;

            if (taskId) {
              // Poll for result (max 30s)
              for (let i = 0; i < 15; i++) {
                await new Promise((r) => setTimeout(r, 2000));
                const statusRes = await fetch(`${PRINTFUL_BASE}/v2/mockup-tasks?id=${taskId}`, { headers });
                if (statusRes.ok) {
                  const statusData = await statusRes.json();
                  const task = statusData?.data;
                  if (task?.status === "completed") {
                    result = {
                      code: 200,
                      result: {
                        mockups: (task.catalog_variant_mockups || []).map((m: any) => ({
                          placement: m.placement,
                          variant_ids: m.catalog_variant_ids || [],
                          mockup_url: m.mockup_url,
                        })),
                      },
                    };
                    break;
                  } else if (task?.status === "failed") {
                    console.error("Mockup task failed:", task.failure_reasons);
                    break;
                  }
                }
              }
            }
          } else {
            const errText = await mockupRes.text();
            console.error("v2 mockup creation failed:", errText);
          }
        } catch (e) {
          console.error("v2 mockup error:", e);
        }

        // If v2 failed, try v1 fallback
        if (!result) {
          try {
            const v1Body = {
              variant_ids: variant_ids || [],
              files: [{
                placement: "default",
                image_url: image_url,
                position: {
                  area_width: 1800,
                  area_height: 2400,
                  width: 1800,
                  height: 2400,
                  top: 0,
                  left: 0,
                },
              }],
            };

            const v1Res = await fetch(`${PRINTFUL_BASE}/mockup-generator/create-task/${product_id}`, {
              method: "POST",
              headers,
              body: JSON.stringify(v1Body),
            });

            if (v1Res.ok) {
              const taskData = await v1Res.json();
              const taskKey = taskData?.result?.task_key;
              if (taskKey) {
                for (let i = 0; i < 15; i++) {
                  await new Promise((r) => setTimeout(r, 2000));
                  const statusRes = await fetch(`${PRINTFUL_BASE}/mockup-generator/task?task_key=${taskKey}`, { headers });
                  if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (statusData?.result?.status === "completed") {
                      result = { code: 200, result: statusData.result };
                      break;
                    } else if (statusData?.result?.status === "failed") {
                      break;
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error("v1 mockup fallback error:", e);
          }
        }

        if (!result) {
          result = { code: 200, result: { mockups: [], fallback: true } };
        }
        break;
      }

      case "create-order": {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Authorization required for orders");

        const body = await req.json();
        const { items, shipping_address } = body;
        if (!items || !shipping_address) throw new Error("items and shipping_address are required");

        const orderBody = {
          recipient: shipping_address,
          items: items,
        };

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
