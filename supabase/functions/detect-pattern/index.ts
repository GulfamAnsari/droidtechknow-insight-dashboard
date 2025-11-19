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
    const { image } = await req.json();
    
    if (!image) {
      throw new Error("No image provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing candlestick pattern...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert technical analyst specializing in candlestick pattern recognition for intraday trading. 
            Analyze the provided chart image and identify any candlestick patterns present.
            
            Common patterns to look for:
            - Bullish: Hammer, Inverted Hammer, Bullish Engulfing, Piercing Line, Morning Star, Three White Soldiers
            - Bearish: Hanging Man, Shooting Star, Bearish Engulfing, Dark Cloud Cover, Evening Star, Three Black Crows
            - Continuation: Doji, Spinning Top, Rising Three Methods, Falling Three Methods
            - Reversal: Head and Shoulders, Double Top/Bottom, Triple Top/Bottom
            
            Respond in JSON format with these exact fields:
            {
              "pattern_name": "Name of the identified pattern",
              "confidence": "High/Medium/Low confidence level",
              "description": "Brief explanation of the pattern",
              "signal": "Bullish/Bearish/Neutral trading signal"
            }`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this intraday candlestick chart and identify any patterns. Focus on the most recent candles."
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
        tools: [
          {
            type: "function",
            function: {
              name: "report_pattern",
              description: "Report the detected candlestick pattern with details",
              parameters: {
                type: "object",
                properties: {
                  pattern_name: {
                    type: "string",
                    description: "Name of the identified pattern"
                  },
                  confidence: {
                    type: "string",
                    enum: ["High", "Medium", "Low"],
                    description: "Confidence level of the detection"
                  },
                  description: {
                    type: "string",
                    description: "Brief explanation of the pattern and what it indicates"
                  },
                  signal: {
                    type: "string",
                    enum: ["Bullish", "Bearish", "Neutral"],
                    description: "Trading signal based on the pattern"
                  }
                },
                required: ["pattern_name", "confidence", "description", "signal"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_pattern" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No pattern detection result from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in detect-pattern function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to analyze pattern" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
