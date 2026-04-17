import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PRINTFUL_API_KEY = Deno.env.get("PRINTFUL_API_KEY");

const MERCH_BONUS_TREATS = 10;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Stripe event:", event.type, "env:", env);

    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object, env);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const meta = session.metadata || {};
  const kind = meta.kind;
  const userId = meta.userId;

  if (!userId) {
    console.error("No userId in session metadata, skipping");
    return;
  }
  if (session.payment_status !== "paid") {
    console.log("Session not paid, skipping:", session.id, session.payment_status);
    return;
  }

  if (kind === "treats") {
    await handleTreatsPurchase(session, userId);
  } else if (kind === "merch") {
    await handleMerchPurchase(session, userId);
  } else {
    console.warn("Unknown checkout kind:", kind);
  }
}

async function handleTreatsPurchase(session: any, userId: string) {
  // Idempotency: skip if a credit_transaction already exists for this session
  const { data: existing } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (existing) {
    console.log("Treat purchase already processed:", session.id);
    return;
  }

  const lookupKey = session.metadata?.priceLookupKey;
  const { data: pkg } = await supabase
    .from("credit_packages")
    .select("id, credits_amount, price")
    .eq("price_lookup_key", lookupKey)
    .maybeSingle();

  if (!pkg) {
    console.error("Credit package not found for lookup_key:", lookupKey);
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("id", userId)
    .single();
  if (!profile) {
    console.error("Profile not found:", userId);
    return;
  }

  const newBalance = (profile.credits_balance || 0) + pkg.credits_amount;
  await supabase.from("profiles").update({ credits_balance: newBalance }).eq("id", userId);

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: pkg.credits_amount,
    type: "purchase",
    credit_package_id: pkg.id,
    stripe_checkout_session_id: session.id,
  });

  console.log(`Credited ${pkg.credits_amount} treats to user ${userId} for session ${session.id}`);
}

async function handleMerchPurchase(session: any, userId: string) {
  // Idempotency
  const { data: existing } = await supabase
    .from("orders")
    .select("id, merch_treats_awarded")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  let orderId = existing?.id as string | undefined;
  let alreadyAwarded = existing?.merch_treats_awarded === true;

  if (!existing) {
    const meta = session.metadata || {};
    const totalAmount = Number(meta.amountCents || 0) / 100;
    const shipping = session.shipping_details || session.customer_details?.address
      ? {
          name: session.shipping_details?.name || session.customer_details?.name,
          address: session.shipping_details?.address || session.customer_details?.address,
          email: session.customer_details?.email,
        }
      : { email: session.customer_details?.email };

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        product_type: meta.productTitle || meta.variantName || "Custom Pet Product",
        quantity: 1,
        total_amount: totalAmount,
        status: "paid",
        shipping_address: shipping,
        stripe_checkout_session_id: session.id,
      })
      .select()
      .single();

    if (orderErr) {
      console.error("Failed to create order:", orderErr);
      return;
    }
    orderId = order.id;
    console.log("Created order:", order.id);
  } else {
    console.log("Merch order already exists:", session.id);
  }

  // ===== +10 free treats bonus (idempotent) =====
  if (orderId && !alreadyAwarded) {
    // Atomic-ish flip: only credit if we successfully flip the guard from false→true.
    const { data: flipped, error: flipErr } = await supabase
      .from("orders")
      .update({ merch_treats_awarded: true })
      .eq("id", orderId)
      .eq("merch_treats_awarded", false)
      .select("id")
      .maybeSingle();

    if (flipErr) {
      console.error("Failed to flip merch_treats_awarded:", flipErr);
    } else if (flipped) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("id", userId)
        .single();
      if (profile) {
        const newBalance = (profile.credits_balance || 0) + MERCH_BONUS_TREATS;
        await supabase.from("profiles").update({ credits_balance: newBalance }).eq("id", userId);
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: MERCH_BONUS_TREATS,
          type: "merch_bonus",
          related_order_id: orderId,
          stripe_checkout_session_id: session.id,
        });
        console.log(`Awarded ${MERCH_BONUS_TREATS} bonus treats to user ${userId} for order ${orderId}`);
      }
    } else {
      console.log("Bonus treats already awarded (race condition).");
    }
  }

  // Auto-submit to Printful (only on first creation)
  if (existing) return;
  if (!PRINTFUL_API_KEY) {
    console.warn("PRINTFUL_API_KEY missing, skipping Printful order submission");
    return;
  }
  const meta = session.metadata || {};
  if (!meta.variantId || !meta.artworkUrl) {
    console.warn("Missing variantId/artworkUrl, can't submit to Printful");
    return;
  }
  const recipientAddr = session.shipping_details?.address || session.customer_details?.address;
  if (!recipientAddr) {
    console.warn("No shipping address, can't submit to Printful");
    return;
  }

  try {
    const printfulRes = await fetch("https://api.printful.com/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PRINTFUL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: {
          name: session.shipping_details?.name || session.customer_details?.name || "Customer",
          address1: recipientAddr.line1,
          address2: recipientAddr.line2,
          city: recipientAddr.city,
          state_code: recipientAddr.state,
          country_code: recipientAddr.country,
          zip: recipientAddr.postal_code,
          email: session.customer_details?.email,
        },
        items: [{
          variant_id: Number(meta.variantId),
          quantity: 1,
          files: [{ url: meta.artworkUrl }],
        }],
      }),
    });

    if (printfulRes.ok) {
      const printfulData = await printfulRes.json();
      const printfulOrderId = String(printfulData?.result?.id || "");
      await supabase
        .from("orders")
        .update({ printful_order_id: printfulOrderId, status: "fulfilling" })
        .eq("id", orderId!);
      console.log("Printful order submitted:", printfulOrderId);
    } else {
      const errText = await printfulRes.text();
      console.error("Printful order failed:", printfulRes.status, errText);
      await supabase
        .from("orders")
        .update({ status: "fulfillment_failed" })
        .eq("id", orderId!);
    }
  } catch (e) {
    console.error("Printful submit exception:", e);
  }
}
