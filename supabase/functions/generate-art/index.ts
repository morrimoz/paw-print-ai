import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { original_image_url, style } = await req.json();
    if (!original_image_url || !style) throw new Error("Missing required fields");

    // Check credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits_balance < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate art using Lovable AI
    let generated_image_url = original_image_url; // fallback

    if (lovableApiKey) {
      const prompt = `Transform this pet photo into a beautiful ${style} style artwork. Make it vibrant, artistic, and capture the pet's personality.`;
      
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: original_image_url } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (imageData) {
          // Upload generated image to storage
          const base64Data = imageData.split(",")[1];
          const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          const fileName = `${user.id}/${crypto.randomUUID()}.png`;
          
          const { error: uploadError } = await supabase.storage
            .from("generated_art")
            .upload(fileName, imageBytes, { contentType: "image/png" });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("generated_art").getPublicUrl(fileName);
            // Since bucket is private, we'll use a signed URL
            const { data: signedData } = await supabase.storage
              .from("generated_art")
              .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year
            generated_image_url = signedData?.signedUrl || urlData.publicUrl;
          }
        }
      }
    }

    // Create artwork record
    const { data: artwork, error: artworkError } = await supabase
      .from("artworks")
      .insert({
        user_id: user.id,
        original_image_url,
        generated_image_url,
        style,
        prompt: `${style} style pet art`,
        credits_consumed: 1,
      })
      .select()
      .single();

    if (artworkError) throw artworkError;

    // Deduct credit
    await supabase
      .from("profiles")
      .update({ credits_balance: profile.credits_balance - 1 })
      .eq("id", user.id);

    // Log transaction
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: -1,
      type: "consumption",
      related_artwork_id: artwork.id,
    });

    return new Response(JSON.stringify({ artwork }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-art error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
