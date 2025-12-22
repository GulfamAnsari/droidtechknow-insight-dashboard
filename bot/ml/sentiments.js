
import { InferenceClient } from "@huggingface/inference";

export const getsentiment = async (inputs) => {
    const client = new InferenceClient(process.env.HF_TOKEN);
  


  return await client.textClassification({
    model: "mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis",
    inputs,
    provider: "hf-inference"
  });
};
