import { pipeline } from "@xenova/transformers";

let sentimentPipeline: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Load FinBERT only once
 */
async function loadPipeline() {
  if (sentimentPipeline) return sentimentPipeline;

  if (!loadingPromise) {
    loadingPromise = pipeline(
      "sentiment-analysis",
      "Xenova/finbert"
    ).then((pipe) => {
      sentimentPipeline = pipe;
      return pipe;
    });
  }

  return loadingPromise;
}

/**
 * Local sentiment analysis
 */
export async function getSentimentLocal(text: string) {
  if (!text || text.length < 3) {
    return {
      label: "neutral",
      confidence: 0,
    };
  }

  const pipe = await loadPipeline();
  const result = await pipe(text.slice(0, 512)); // FinBERT max length

  return {
    label: result[0]?.label?.toLowerCase() ?? "neutral",
    confidence: Number(result[0]?.score ?? 0),
  };
}
