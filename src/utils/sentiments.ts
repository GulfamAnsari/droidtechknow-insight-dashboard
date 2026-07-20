let sentimentPipeline: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * Load FinBERT only once (dynamic import so heavy ML lib doesn't block initial bundle).
 */
async function loadPipeline() {
  if (sentimentPipeline) return sentimentPipeline;

  if (!loadingPromise) {
    loadingPromise = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("sentiment-analysis", "Xenova/finbert").then((pipe: any) => {
        sentimentPipeline = pipe;
        return pipe;
      })
    );
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
  const result = await pipe(text.slice(0, 512));

  return {
    label: result[0]?.label?.toLowerCase() ?? "neutral",
    confidence: Number(result[0]?.score ?? 0),
  };
}
