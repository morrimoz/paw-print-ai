import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Style "directors" - each one tells the model HOW to render the scene.
 * The pet identity always comes from the uploaded photo; the style only
 * controls the rendering (medium, lighting, mood, references).
 */
const STYLE_DIRECTORS: Record<string, {
  label: string;
  aesthetic: string;
  mood: string;
  medium: string;
  artistic_references: string[];
  lighting_type: string;
  color_temperature: string;
}> = {
  "dramatic-bw": {
    label: "Dramatic Black & White",
    aesthetic: "high-contrast monochrome fine-art photography, deep blacks, luminous whites, fine grain",
    mood: "cinematic, intimate, timeless, emotionally weighty",
    medium: "black-and-white photographic render, silver-gelatin print quality",
    artistic_references: ["Peter Lindbergh portraits", "Sebastião Salgado", "Annie Leibovitz BW"],
    lighting_type: "single hard key light with deep shadow falloff, Rembrandt lighting",
    color_temperature: "neutral monochrome, no color cast",
  },
  "pixar": {
    label: "Pixar Movie",
    aesthetic: "Pixar/Disney 3D animated film still, soft subsurface scattering on fur, expressive oversized eyes, slightly stylized proportions while preserving the pet's real markings and breed shape",
    mood: "joyful, heroic, heartwarming, family-friendly cinematic",
    medium: "high-end 3D animated render, Pixar RenderMan style",
    artistic_references: ["Pixar Up", "Disney Bolt", "Pixar Coco lighting", "DreamWorks character design"],
    lighting_type: "warm cinematic three-point lighting with rim light separating subject from background",
    color_temperature: "warm golden hour 4500K with vivid saturated secondary colors",
  },
  "renaissance-oil": {
    label: "Renaissance Oil Painting",
    aesthetic: "classical oil-on-canvas portrait, visible brushwork, glazed underpainting, chiaroscuro depth, regal composition with dark background",
    mood: "noble, dignified, opulent, timeless aristocratic",
    medium: "oil painting on canvas, varnished old-master finish",
    artistic_references: ["Rembrandt", "Vermeer", "Velázquez royal portraits", "Titian"],
    lighting_type: "single window-style light from upper left, deep shadows, Rembrandt triangle",
    color_temperature: "warm earth tones, ochres, deep umbers, candlelit 3000K",
  },
  "watercolor": {
    label: "Watercolor Art",
    aesthetic: "loose watercolor painting on cold-press paper, visible paper texture, soft bleeds and wet-on-wet edges, white space allowed to breathe, delicate ink linework accents",
    mood: "dreamy, gentle, airy, hand-crafted",
    medium: "traditional watercolor with light ink outlines",
    artistic_references: ["modern pet portrait illustrators on Etsy", "Marc Allante", "Endre Penovác animal watercolors"],
    lighting_type: "soft diffuse natural daylight, no harsh shadows",
    color_temperature: "soft pastel palette, cool whites with warm accent washes",
  },
  "humorous": {
    label: "Humorous Scenes",
    aesthetic: "playful illustrated comedy scene, anthropomorphized but clearly the same pet, exaggerated facial expression, witty visual gag, vibrant illustration",
    mood: "funny, charming, surprising, shareable",
    medium: "polished digital illustration, comic-book inspired with cinematic lighting",
    artistic_references: ["New Yorker pet cartoons", "Pixar shorts comedic framing", "modern children's-book illustration"],
    lighting_type: "bright even key with soft fill, slight rim light",
    color_temperature: "cheerful saturated palette, warm 5000K",
  },
  "cartoon": {
    label: "Cartoon",
    aesthetic: "modern flat cartoon illustration, bold clean line art, simplified shapes that still preserve the pet's exact markings/breed/colors, vibrant flat color fills with subtle cell-shading",
    mood: "fun, bright, friendly, sticker-ready",
    medium: "vector-style digital cartoon illustration",
    artistic_references: ["modern Adobe Illustrator pet portraits", "Cartoon Network character design", "modern sticker pack illustration"],
    lighting_type: "flat directional light with simple cell shadow",
    color_temperature: "bright saturated palette, neutral 5500K",
  },
};

function nowUtcLabel(): string {
  return new Date().toUTCString().replace("GMT", "UTC");
}

/**
 * Build the structured JSON brief that frames the image-LLM request.
 * The pet's IDENTITY (breed, fur color, markings, body shape, eyes) is always
 * pulled from the uploaded photo via the "edit.instruction" field.
 * The user's prompt drives the NARRATIVE (what the pet is doing / where).
 * The style drives the RENDERING (medium, lighting, references).
 */
function buildImageBrief(args: {
  userPrompt?: string;
  styleId: string;
}): Record<string, unknown> {
  const director = STYLE_DIRECTORS[args.styleId] || STYLE_DIRECTORS["watercolor"];
  const userPrompt = (args.userPrompt || "").trim();
  const hasNarrative = userPrompt.length > 0;

  const description = hasNarrative
    ? `A ${director.label} portrait of the exact pet shown in the uploaded reference photo, depicted in this scene: "${userPrompt}". Preserve the pet's identity (breed, fur color, markings, eye color, body shape) with photorealistic accuracy; only the rendering style and surrounding scene are interpreted.`
    : `A ${director.label} portrait of the exact pet shown in the uploaded reference photo, beautifully rendered as a hero portrait. Preserve the pet's identity (breed, fur color, markings, eye color, body shape) with photorealistic accuracy.`;

  return {
    description,
    subject: {
      main: "The exact pet from the uploaded reference photo - same breed, same fur color, same markings, same eye color, same body shape and proportions. Treat the uploaded image as the unambiguous identity reference.",
      secondary: hasNarrative
        ? `Supporting elements implied by the user prompt: "${userPrompt}". Stage props, costuming, and companion characters that bring the scene to life without overshadowing the pet.`
        : "Subtle background elements that complement the pet without distracting from it.",
      pose: hasNarrative
        ? `Pose appropriate to the scene "${userPrompt}", with the pet as the clear hero of the composition - rule of thirds, eyes catching light.`
        : "Hero portrait pose, three-quarter angle, eyes catching light, subject filling roughly two-thirds of the frame.",
      emotion: director.mood,
    },
    environment: {
      location: hasNarrative
        ? `Setting drawn from the user prompt: "${userPrompt}".`
        : "Tasteful complementary backdrop appropriate to the chosen style; not a literal photo background from the reference image.",
      props: hasNarrative ? ["scene-appropriate props inferred from the user prompt"] : ["minimal complementary props"],
      spatial_arrangement: "Balanced cinematic composition, pet as clear focal point, generous breathing room.",
    },
    visual_style: {
      aesthetic: director.aesthetic,
      mood: director.mood,
      lighting: {
        type: director.lighting_type,
        direction: "from upper left at roughly 45 degrees to sculpt facial structure",
        intensity: "controlled and intentional, never flat",
        color_temperature: director.color_temperature,
      },
      composition: "rule of thirds, hero subject framing, cinematic depth",
      artistic_references: director.artistic_references,
      medium: director.medium,
    },
    technical: {
      aspect_ratio: "1:1",
      image_size: "2K",
      quality: "ultra-high detail, sharp focus on eyes and fur texture, no artifacts, print-ready",
      safety_filter: "BLOCK_NONE",
      session_date_time: nowUtcLabel(),
    },
    edit: {
      instruction:
        "CRITICAL: The uploaded image is the IDENTITY REFERENCE for the pet only. Do NOT copy the photo's background, lighting, framing, or pose. EXTRACT from the reference: breed, fur color and pattern, ear shape, eye color, snout shape, body proportions, distinctive markings. Then RE-IMAGINE that exact pet inside the scene and rendering style described above. The output must be unmistakably the same animal but rendered as a fresh, original artwork - not a stylized filter over the original photo.",
    },
  };
}

/**
 * Convert the structured brief into the final natural-language prompt the
 * image model receives. Models work best with a strong narrative paragraph
 * followed by the JSON brief as supporting structure.
 */
function briefToPrompt(brief: Record<string, unknown>): string {
  return [
    (brief.description as string),
    "",
    "Render this as a brand-new piece of artwork. The uploaded image is provided ONLY as an identity reference for the pet (breed, markings, fur color, eye color, body shape). Do not apply the style as a filter on top of the photo - re-imagine the pet inside the new scene and medium described.",
    "",
    "Full creative brief (JSON):",
    JSON.stringify(brief, null, 2),
  ].join("\n");
}

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

    const { original_image_url, style, prompt: userPrompt } = await req.json();
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

    // Build the structured brief and final prompt
    const brief = buildImageBrief({ userPrompt, styleId: style });
    const finalPrompt = briefToPrompt(brief);

    console.log("generate-art brief:", JSON.stringify(brief));

    let generated_image_url = original_image_url; // safe fallback

    if (lovableApiKey) {
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
                { type: "text", text: finalPrompt },
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
          const base64Data = imageData.split(",")[1];
          const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
          const fileName = `${user.id}/${crypto.randomUUID()}.png`;

          const { error: uploadError } = await supabase.storage
            .from("generated_art")
            .upload(fileName, imageBytes, { contentType: "image/png" });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("generated_art").getPublicUrl(fileName);
            const { data: signedData } = await supabase.storage
              .from("generated_art")
              .createSignedUrl(fileName, 60 * 60 * 24 * 365);
            generated_image_url = signedData?.signedUrl || urlData.publicUrl;
          }
        }
      } else {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
      }
    }

    // Persist artwork
    const promptForRecord = userPrompt
      ? `${STYLE_DIRECTORS[style]?.label || style}: ${userPrompt}`
      : `${STYLE_DIRECTORS[style]?.label || style} portrait`;

    const { data: artwork, error: artworkError } = await supabase
      .from("artworks")
      .insert({
        user_id: user.id,
        original_image_url,
        generated_image_url,
        style,
        prompt: promptForRecord,
        credits_consumed: 1,
      })
      .select()
      .single();

    if (artworkError) throw artworkError;

    await supabase
      .from("profiles")
      .update({ credits_balance: profile.credits_balance - 1 })
      .eq("id", user.id);

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
