
import { InferenceClient } from "@huggingface/inference";

export const getsentiment = async (inputs) => {
    const client = new InferenceClient(process.env.HF_TOKEN);
  


  return await client.textClassification({
    model: "mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis",
    inputs,
    provider: "hf-inference"
  });
};

import { pipeline } from "@xenova/transformers";

const sentimentPipeline = await pipeline(
  "sentiment-analysis",
  "Xenova/finbert"
);

export async function getSentimentLocal(text) {
  const result = await sentimentPipeline(text);

  return {
    label: result[0].label.toLowerCase(), // positive / negative / neutral
    confidence: result[0].score,
  };
}