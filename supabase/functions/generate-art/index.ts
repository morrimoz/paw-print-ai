import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Lightweight style "directors" - used to give the brief-generator LLM strong
 * art direction so it doesn't treat the style as a flat filter. The pet's
 * IDENTITY always comes from the uploaded photo; the style only controls the
 * rendering medium / lighting / references.
 */
const STYLE_DIRECTORS: Record<string, { label: string; direction: string }> = {
  "dramatic-bw": {
    label: "Dramatic Black & White",
    direction:
      "high-contrast monochrome fine-art photography, deep blacks, luminous whites, cinematic Rembrandt lighting, references: Peter Lindbergh, Sebastião Salgado, Annie Leibovitz BW.",
  },
  pixar: {
    label: "Pixar Movie",
    direction:
      "Pixar/Disney 3D animated film still, soft subsurface scattering on fur, expressive eyes, slightly stylized proportions while preserving the real pet's breed/markings; references: Pixar Up, Coco, DreamWorks character design; warm cinematic three-point lighting.",
  },
  "renaissance-oil": {
    label: "Renaissance Oil Painting",
    direction:
      "classical oil-on-canvas portrait, visible brushwork, glazed underpainting, chiaroscuro depth, regal dark background; references: Rembrandt, Vermeer, Velázquez, Titian; candlelit warm 3000K lighting.",
  },
  watercolor: {
    label: "Watercolor Art",
    direction:
      "loose watercolor on cold-press paper, visible paper texture, soft wet-on-wet bleeds, delicate ink linework accents, breathable white space; references: Marc Allante, Endre Penovác animal watercolors; soft diffuse natural daylight.",
  },
  humorous: {
    label: "Humorous Scenes",
    direction:
      "playful illustrated comedy scene, exaggerated expression, witty visual gag, polished digital illustration with cinematic lighting; references: New Yorker pet cartoons, Pixar shorts comedic framing.",
  },
  cartoon: {
    label: "Cartoon",
    direction:
      "modern flat cartoon illustration, bold clean line art, simplified shapes that still preserve the pet's exact markings/breed/colors, vibrant flat fills with subtle cell-shading; references: modern sticker pack illustration, Cartoon Network character design.",
  },
  hyperrealistic: {
    label: "Hyperrealistic Photography",
    direction:
      "ultra-photorealistic professional pet portrait photography, razor-sharp focus on the eyes, every individual fur strand visible, natural skin and nose texture, shallow depth of field with creamy bokeh, shot on a Canon EOS R5 with an 85mm f/1.4 prime lens, soft cinematic key light with subtle rim light, color-graded for editorial polish; references: National Geographic animal portraiture, Tim Flach pet photography.",
  },
};

/**
 * Lightweight keyword-based style inference. If the user did NOT pick a style
 * in the UI, we look at their prompt for obvious style cues (e.g. "watercolor",
 * "oil painting", "cartoon"). If nothing matches, we fall back to
 * hyperrealistic so the user gets an impressive default result.
 */
function inferStyleFromPrompt(userPrompt: string): string {
  const p = (userPrompt || "").toLowerCase();
  const rules: Array<{ id: string; patterns: RegExp[] }> = [
    { id: "watercolor", patterns: [/water\s?colou?r/, /aquarelle/] },
    { id: "renaissance-oil", patterns: [/renaissance/, /oil\s?paint/, /baroque/, /classical portrait/] },
    { id: "pixar", patterns: [/pixar/, /disney/, /3d animat/, /dreamworks/] },
    { id: "cartoon", patterns: [/cartoon/, /comic/, /anime/, /manga/, /sticker/] },
    { id: "dramatic-bw", patterns: [/black\s?and\s?white/, /\bb&w\b/, /monochrome/, /noir/] },
    { id: "humorous", patterns: [/funny/, /humor/, /comedic/, /joke/, /silly/] },
    { id: "hyperrealistic", patterns: [/hyper\s?real/, /photoreal/, /photograph/, /realistic photo/] },
  ];
  for (const r of rules) {
    if (r.patterns.some((re) => re.test(p))) return r.id;
  }
  return "hyperrealistic";
}

function nowUtcLabel(): string {
  return new Date().toUTCString().replace("GMT", "UTC");
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON SCHEMA for the structured creative brief (used as a tool-call schema
// against the Lovable AI gateway so the LLM is forced to return valid JSON).
// ─────────────────────────────────────────────────────────────────────────────
const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    subject: {
      type: "object",
      properties: {
        main: { type: "string" },
        secondary: { type: "string" },
        pose: { type: "string" },
        emotion: { type: "string" },
      },
      required: ["main", "secondary", "pose", "emotion"],
      additionalProperties: false,
    },
    environment: {
      type: "object",
      properties: {
        location: { type: "string" },
        props: { type: "array", items: { type: "string" } },
        spatial_arrangement: { type: "string" },
      },
      required: ["location", "props", "spatial_arrangement"],
      additionalProperties: false,
    },
    visual_style: {
      type: "object",
      properties: {
        aesthetic: { type: "string" },
        mood: { type: "string" },
        lighting: {
          type: "object",
          properties: {
            type: { type: "string" },
            direction: { type: "string" },
            intensity: { type: "string" },
            color_temperature: { type: "string" },
          },
          required: ["type", "direction", "intensity", "color_temperature"],
          additionalProperties: false,
        },
        composition: { type: "string" },
        artistic_references: { type: "array", items: { type: "string" } },
        medium: { type: "string" },
      },
      required: ["aesthetic", "mood", "lighting", "composition", "artistic_references", "medium"],
      additionalProperties: false,
    },
    technical: {
      type: "object",
      properties: {
        aspect_ratio: { type: "string" },
        image_size: { type: "string" },
        quality: { type: "string" },
        safety_filter: { type: "string" },
        session_date_time: { type: "string" },
      },
      required: ["aspect_ratio", "image_size", "quality", "safety_filter", "session_date_time"],
      additionalProperties: false,
    },
    edit: {
      type: "object",
      properties: {
        instruction: { type: "string" },
      },
      required: ["instruction"],
      additionalProperties: false,
    },
  },
  required: ["description", "subject", "environment", "visual_style", "technical", "edit"],
  additionalProperties: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE A — LLM brief generator.
// Calls Lovable AI (Gemini) with the uploaded image + user_prompt + style and
// forces a structured JSON response matching BRIEF_SCHEMA via tool calling.
// ─────────────────────────────────────────────────────────────────────────────
async function generateBriefWithLLM(args: {
  apiKey: string;
  userPrompt: string;
  styleId: string;
  originalImageUrl: string;
}): Promise<Record<string, unknown>> {
  const director = STYLE_DIRECTORS[args.styleId] || STYLE_DIRECTORS["hyperrealistic"];

  const systemPrompt = `You are an expert art director that produces structured creative briefs for an image-generation model.

You will receive:
- An uploaded reference photo of a pet (the IDENTITY reference).
- A user_prompt describing the desired NARRATIVE / scene.
- A style_id and style_direction describing the desired RENDERING.

Your job:
1. Carefully look at the uploaded image and EXTRACT the pet's identity: species, breed, fur color and pattern, ear shape, eye color, snout, body proportions, distinctive markings.
2. Treat the user_prompt as the CORE NARRATIVE - the scene, action, costuming, props, setting. Do NOT ignore it. Do NOT water it down.
3. Treat the style as full ART DIRECTION (medium, lighting, references) - NOT as a filter on top of the photo. If a style is not specified, determine this from the user_prompt if possible and if not fallback to hyperrealistic.
4. Re-imagine the SAME pet from the photo inside the new scene and rendering style. Preserve identity strictly.
5. Fill ALL required fields of the brief with vivid, visually specific language. Avoid vague wording.
6. The "edit.instruction" field MUST clearly tell the image model: use the uploaded photo ONLY as identity reference for the pet (breed/markings/fur/eyes/proportions), do NOT copy its background/lighting/pose, re-imagine the pet inside the new scene.
7. Default "aspect_ratio" to "1:1", "image_size" to "2K", "safety_filter" to "BLOCK_NONE", and set "session_date_time" to the provided UTC time.

Return ONLY the structured brief via the provided tool call. No prose.`;

  const userMessage = `style_id: ${args.styleId}
style_label: ${director.label}
style_direction: ${director.direction}

user_prompt: ${args.userPrompt}

session_date_time: ${nowUtcLabel()}

The uploaded image is the IDENTITY REFERENCE for the pet. Build a brief that re-imagines this exact pet in the scene described by user_prompt, rendered in the style described above.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userMessage },
            { type: "image_url", image_url: { url: args.originalImageUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_creative_brief",
            description: "Submit the fully-populated structured creative brief.",
            parameters: BRIEF_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "submit_creative_brief" } },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brief LLM error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  const argsJson = toolCall?.function?.arguments;
  if (!argsJson) {
    throw new Error("Brief LLM did not return a tool call");
  }

  let brief: Record<string, unknown>;
  try {
    brief = typeof argsJson === "string" ? JSON.parse(argsJson) : argsJson;
  } catch (e) {
    throw new Error(`Failed to parse brief JSON: ${(e as Error).message}`);
  }

  // Inject defaults / enforce required technical fields.
  const technical = (brief.technical as Record<string, unknown>) || {};
  brief.technical = {
    aspect_ratio: technical.aspect_ratio || "1:1",
    image_size: technical.image_size || "2K",
    quality: technical.quality || "ultra-high detail, sharp focus, print-ready",
    safety_filter: "BLOCK_NONE",
    session_date_time: technical.session_date_time || nowUtcLabel(),
  };

  // Validate required top-level fields.
  for (const key of ["description", "subject", "environment", "visual_style", "edit"]) {
    if (!brief[key]) throw new Error(`Brief missing required field: ${key}`);
  }

  return brief;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE B — Prompt compiler.
// Converts the structured brief into a strong natural-language prompt for the
// image model. Always includes explicit identity-preservation instructions.
// ─────────────────────────────────────────────────────────────────────────────
function buildImagePromptFromBrief(brief: any): string {
  const subject = brief.subject || {};
  const env = brief.environment || {};
  const vs = brief.visual_style || {};
  const lighting = vs.lighting || {};
  const props = Array.isArray(env.props) ? env.props.join(", ") : "";
  const refs = Array.isArray(vs.artistic_references) ? vs.artistic_references.join(", ") : "";
  const editInstruction = brief.edit?.instruction || "";

  return [
    `SCENE: ${brief.description}`,
    "",
    `SUBJECT — main: ${subject.main}`,
    `SUBJECT — secondary: ${subject.secondary}`,
    `SUBJECT — pose: ${subject.pose}`,
    `SUBJECT — emotion: ${subject.emotion}`,
    "",
    `ENVIRONMENT — location: ${env.location}`,
    `ENVIRONMENT — props: ${props}`,
    `ENVIRONMENT — composition: ${env.spatial_arrangement}`,
    "",
    `VISUAL STYLE — aesthetic: ${vs.aesthetic}`,
    `VISUAL STYLE — mood: ${vs.mood}`,
    `VISUAL STYLE — medium: ${vs.medium}`,
    `VISUAL STYLE — composition: ${vs.composition}`,
    `VISUAL STYLE — artistic references: ${refs}`,
    `LIGHTING: ${lighting.type}; direction ${lighting.direction}; intensity ${lighting.intensity}; color temperature ${lighting.color_temperature}.`,
    "",
    "IDENTITY PRESERVATION (CRITICAL):",
    "- The uploaded image is provided ONLY as an identity reference for the pet.",
    "- Preserve the exact breed, fur color and pattern, facial markings, ear shape, eye color, snout, and body proportions of the pet shown in the reference.",
    "- DO NOT alter the core identity of the pet. The output must be unmistakably the same animal.",
    "- DO NOT copy the reference photo's background, framing, lighting, or pose.",
    "- Re-imagine the SAME pet inside the NEW scene and rendering medium described above. This is a brand-new artwork, not a stylized filter on top of the photo.",
    "",
    `EDIT INSTRUCTION: ${editInstruction}`,
    "",
    `TECHNICAL: aspect_ratio ${brief.technical?.aspect_ratio}, quality ${brief.technical?.quality}.`,
    "",
    "Render this with cinematic clarity, sharp focus on the eyes and fur texture, and zero artifacts.",
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
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { original_image_url, style, prompt: userPromptRaw } = await req.json();
    if (!original_image_url) throw new Error("Missing required field: original_image_url");
    const user_prompt = (userPromptRaw || "").toString().trim();
    if (!user_prompt) throw new Error("Missing required field: prompt (user_prompt)");

    // Resolve style:
    //  - If the user explicitly picked a known style in the UI, use it as-is.
    //  - Otherwise ("auto" / empty / unknown), inspect the user prompt for
    //    style cues. If none, fall back to "hyperrealistic" so the default
    //    output is impressive and photo-grade.
    const incomingStyle = (style || "").toString().trim().toLowerCase();
    const resolvedStyle =
      incomingStyle && incomingStyle !== "auto" && STYLE_DIRECTORS[incomingStyle]
        ? incomingStyle
        : inferStyleFromPrompt(user_prompt);
    console.log("Style resolution:", { incomingStyle, resolvedStyle });

    // Check credits
    const { data: profile } = await supabase.from("profiles").select("credits_balance").eq("id", user.id).single();

    if (!profile || profile.credits_balance < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // STAGE A — generate the structured brief via LLM
    const brief = await generateBriefWithLLM({
      apiKey: lovableApiKey,
      userPrompt: user_prompt,
      styleId: resolvedStyle,
      originalImageUrl: original_image_url,
    });
    console.log("Generated Brief:", JSON.stringify(brief));

    // STAGE B — compile the brief into a final prompt
    const finalPrompt = buildImagePromptFromBrief(brief);
    console.log("Final Prompt:", finalPrompt);

    // STAGE C — image generation
    let generated_image_url = original_image_url; // safe fallback

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
      console.error("Image AI gateway error:", aiResponse.status, errText);
    }

    // Persist artwork
    const promptForRecord = `${STYLE_DIRECTORS[resolvedStyle]?.label || resolvedStyle}: ${user_prompt}`;

    const { data: artwork, error: artworkError } = await supabase
      .from("artworks")
      .insert({
        user_id: user.id,
        original_image_url,
        generated_image_url,
        style: resolvedStyle,
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

    return new Response(JSON.stringify({ artwork, brief }), {
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
