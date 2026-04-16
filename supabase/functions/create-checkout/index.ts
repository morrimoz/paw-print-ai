import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Two flows:
 *  1) Treat-pack purchase  → body: { priceId, userId, customerEmail, returnUrl, environment }
 *  2) Merchandise purchase → body: { merch: { name, amountCents, productImage, variantId, variantName, size, color, artworkUrl, productTitle }, userId, customerEmail, returnUrl, environment }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { userId, customerEmail, returnUrl, environment, priceId, merch } = body;

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    let lineItems: any[] = [];
    let mode: "payment" | "subscription" = "payment";
    const metadata: Record<string, string> = {};
    if (userId) metadata.userId = String(userId);

    if (priceId) {
      // Treat pack flow
      if (typeof priceId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
        return new Response(JSON.stringify({ error: "Invalid priceId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const prices = await stripe.prices.list({ lookup_keys: [priceId] });
      if (!prices.data.length) {
        return new Response(JSON.stringify({ error: "Price not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const stripePrice = prices.data[0];
      mode = stripePrice.type === "recurring" ? "subscription" : "payment";
      lineItems = [{ price: stripePrice.id, quantity: 1 }];
      metadata.kind = "treats";
      metadata.priceLookupKey = priceId;
    } else if (merch) {
      // Merchandise flow with dynamic pricing
      const amountCents = Number(merch.amountCents);
      if (!amountCents || amountCents < 50) {
        return new Response(JSON.stringify({ error: "Invalid merch amount" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      lineItems = [{
        price_data: {
          currency: "usd",
          product_data: {
            name: merch.name || "Custom Pet Product",
            ...(merch.productImage && { images: [merch.productImage] }),
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }];
      metadata.kind = "merch";
      if (merch.variantId) metadata.variantId = String(merch.variantId);
      if (merch.variantName) metadata.variantName = String(merch.variantName).slice(0, 500);
      if (merch.productTitle) metadata.productTitle = String(merch.productTitle).slice(0, 500);
      if (merch.size) metadata.size = String(merch.size).slice(0, 100);
      if (merch.color) metadata.color = String(merch.color).slice(0, 100);
      if (merch.artworkUrl) metadata.artworkUrl = String(merch.artworkUrl).slice(0, 500);
      metadata.amountCents = String(amountCents);
    } else {
      return new Response(JSON.stringify({ error: "Either priceId or merch is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode,
      ui_mode: "embedded",
      return_url: returnUrl || `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata,
      ...(merch && {
        shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "SE", "NO", "DK", "FI", "IE", "BE"] },
      }),
      ...(customerEmail && { customer_email: customerEmail }),
      ...(mode === "subscription" && userId && {
        subscription_data: { metadata: { userId: String(userId) } },
      }),
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
