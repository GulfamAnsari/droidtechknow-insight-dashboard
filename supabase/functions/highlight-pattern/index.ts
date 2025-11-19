import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, pattern_name } = await req.json();
    
    if (!image || !pattern_name) {
      throw new Error("Missing image or pattern name");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating highlighted image for pattern:", pattern_name);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Highlight the ${pattern_name} candlestick pattern in this chart. Draw clear visual indicators (circles, arrows, or boxes) around the specific candles that form this pattern. Make the highlights visible with bright colors like red or yellow. Keep the rest of the chart unchanged.`
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate highlighted image");
    }

    const data = await response.json();
    const highlightedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!highlightedImageUrl) {
      throw new Error("No highlighted image returned from AI");
    }

    return new Response(
      JSON.stringify({ highlighted_image: highlightedImageUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in highlight-pattern function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to highlight pattern" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
