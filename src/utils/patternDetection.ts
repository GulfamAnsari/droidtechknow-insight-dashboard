// src/utils/patternDetection.ts
/**
 * patternDetection.ts
 * - detectPatterns(candles) : professional-ish probabilistic pattern detector
 * - extractCandlesFromImage(imageDataURI) : heuristic pixel-based extractor that returns pixel-space candles
 * - mapPixelCandlesToPrices(pixelCandles, topPrice, bottomPrice, chartTopPx, chartBottomPx)
 *
 * NOTE: extractCandlesFromImage returns candles with numeric values (pixel-y). Use the mapping function
 * to convert pixels -> real price using top/bottom price mapping. The UI component below prompts the user
 * for top/bottom price to do that mapping automatically.
 */

import { CandleData, PatternResult } from "../utils/pattern";
import {
  bodySize,
  upperShadow,
  lowerShadow,
  candleRange,
  isBullish,
  isBearish,
  detectTrend,
  avgVolume,
  clamp01
} from "./candleMath";

/* ---------------- detectPatterns (improved engine) ---------------- */

export function detectPatterns(
  candles: CandleData[],
  config?: {
    lookbackForTrend?: number;
    minVolumeMultiplier?: number;
  }
): PatternResult {
  const lookbackForTrend = config?.lookbackForTrend ?? 5;
  const minVolMul = config?.minVolumeMultiplier ?? 1.2;
  console.log(candles, "lkfghhghjbj");

  if (!candles || candles.length < 1) {
    return {
      pattern_name: "No Data",
      confidence: "Low",
      description: "No candles provided",
      signal: "Neutral",
      score: 0
    };
  }
  if (candles.length < 2) {
    return {
      pattern_name: "Insufficient Data",
      confidence: "Low",
      description: "Need at least 2 candles",
      signal: "Neutral",
      score: 0
    };
  }

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const trend = detectTrend(candles, lookbackForTrend);
  const avgVol = avgVolume(candles, 20);
  const volOK = last.volume ? last.volume >= avgVol * minVolMul : false;

  const b = bodySize(last);
  const r = candleRange(last);
  const up = upperShadow(last);
  const down = lowerShadow(last);

  // Scores
  const hammerScore = clamp01(
    (down / Math.max(1, b)) * 0.25 + clamp01(r ? b / r : 0) * 0.25
  );
  const shootingStarScore = clamp01(
    (up / Math.max(1, b)) * 0.25 + clamp01(r ? b / r : 0) * 0.25
  );
  const dojiScore = clamp01(1 - Math.min(1, b / Math.max(1, r) / 0.12));

  const results: PatternResult[] = [];

  // Single candle
  if (dojiScore > 0.6) {
    results.push({
      pattern_name: "Doji",
      confidence:
        dojiScore > 0.85 ? "Very High" : dojiScore > 0.7 ? "High" : "Medium",
      description: "Small body, indecision. Look for confirmation next candle.",
      signal: "Neutral",
      score: dojiScore,
      matchedIndices: [candles.length - 1]
    });
  }

  if (hammerScore > 0.45 && isBullish(last)) {
    let score = hammerScore;
    if (trend === -1) score = Math.min(1, score + 0.2);
    if (volOK) score = Math.min(1, score + 0.15);
    results.push({
      pattern_name: "Hammer",
      confidence: score > 0.8 ? "Very High" : score > 0.6 ? "High" : "Medium",
      description:
        "Bullish hammer: small body, long lower shadow. Better after a downtrend and with volume confirmation.",
      signal: "Bullish",
      score,
      matchedIndices: [candles.length - 1]
    });
  }

  if (shootingStarScore > 0.45 && isBearish(last)) {
    let score = shootingStarScore;
    if (trend === 1) score = Math.min(1, score + 0.2);
    if (volOK) score = Math.min(1, score + 0.15);
    results.push({
      pattern_name: "Shooting Star",
      confidence: score > 0.8 ? "Very High" : score > 0.6 ? "High" : "Medium",
      description:
        "Shooting star: long upper wick and small body, indicating rejection of higher prices.",
      signal: "Bearish",
      score,
      matchedIndices: [candles.length - 1]
    });
  }

  // Hanging man (last bearish with long lower shadow after uptrend)
  if (hammerScore > 0.45 && isBearish(last)) {
    let score = hammerScore * 0.9;
    if (trend === 1) score = Math.min(1, score + 0.2);
    if (volOK) score = Math.min(1, score + 0.12);
    results.push({
      pattern_name: "Hanging Man",
      confidence: score > 0.8 ? "Very High" : score > 0.6 ? "High" : "Medium",
      description: "Hanging Man: bearish reversal when seen after an uptrend.",
      signal: "Bearish",
      score,
      matchedIndices: [candles.length - 1]
    });
  }

  // Two-candle patterns
  if (candles.length >= 2) {
    const idxPrev = candles.length - 2;
    const p = candles[idxPrev];
    const c = last;
    const prevBody = bodySize(p);
    const curBody = bodySize(c);

    // Bullish Engulfing
    if (isBearish(p) && isBullish(c)) {
      const bodyRatio = curBody / Math.max(1, prevBody);
      const engulfPct =
        (Math.max(p.open, p.close) - Math.min(c.open, c.close)) /
        Math.max(1, candleRange(p));
      let score = clamp01((bodyRatio - 1) * 0.5 + clamp01(engulfPct) * 0.5);
      if (score > 0.35) {
        if (trend === -1) score = Math.min(1, score + 0.2);
        if (c.volume && c.volume > avgVol * minVolMul)
          score = Math.min(1, score + 0.15);
        results.push({
          pattern_name: "Bullish Engulfing",
          confidence:
            score > 0.8 ? "Very High" : score > 0.6 ? "High" : "Medium",
          description:
            "Bullish engulfing: a bullish candle that engulfs the previous bearish candle.",
          signal: "Bullish",
          score,
          matchedIndices: [idxPrev, idxPrev + 1]
        });
      }
    }

    // Bearish Engulfing
    if (isBullish(p) && isBearish(c)) {
      const bodyRatio = curBody / Math.max(1, prevBody);
      const engulfPct =
        (Math.max(c.open, c.close) - Math.min(p.open, p.close)) /
        Math.max(1, candleRange(p));
      let score = clamp01((bodyRatio - 1) * 0.5 + clamp01(engulfPct) * 0.5);
      if (score > 0.35) {
        if (trend === 1) score = Math.min(1, score + 0.2);
        if (c.volume && c.volume > avgVol * minVolMul)
          score = Math.min(1, score + 0.15);
        results.push({
          pattern_name: "Bearish Engulfing",
          confidence:
            score > 0.8 ? "Very High" : score > 0.6 ? "High" : "Medium",
          description:
            "Bearish engulfing: a bearish candle that engulfs the previous bullish candle.",
          signal: "Bearish",
          score,
          matchedIndices: [idxPrev, idxPrev + 1]
        });
      }
    }

    // Piercing / Dark Cloud simplified
    if (isBearish(p) && isBullish(c)) {
      const closePct = (c.close - p.low) / Math.max(1, candleRange(p));
      const score = clamp01(closePct);
      if (score > 0.45) {
        results.push({
          pattern_name: "Piercing Line",
          confidence: score > 0.7 ? "High" : "Medium",
          description:
            "Piercing line: bullish reversal where second candle closes into the prior candle's body.",
          signal: "Bullish",
          score,
          matchedIndices: [idxPrev, idxPrev + 1]
        });
      }
    }
    if (isBullish(p) && isBearish(c)) {
      const closePct = (p.high - c.close) / Math.max(1, candleRange(p));
      const score = clamp01(closePct);
      if (score > 0.45) {
        results.push({
          pattern_name: "Dark Cloud Cover",
          confidence: score > 0.7 ? "High" : "Medium",
          description:
            "Dark cloud cover: bearish reversal where second candle penetrates prior candle's body.",
          signal: "Bearish",
          score,
          matchedIndices: [idxPrev, idxPrev + 1]
        });
      }
    }
  }

  // Three-candle patterns
  if (candles.length >= 3) {
    const a = candles[candles.length - 3];
    const b = candles[candles.length - 2];
    const c = candles[candles.length - 1];

    // Morning Star
    if (
      isBearish(a) &&
      Math.abs(bodySize(b)) < Math.abs(bodySize(a)) * 0.3 &&
      isBullish(c)
    ) {
      const score = clamp01(
        0.5 + (c.close - a.open) / Math.max(1, Math.abs(a.open - a.close))
      );
      results.push({
        pattern_name: "Morning Star",
        confidence: score > 0.7 ? "High" : "Medium",
        description:
          "Morning Star: bearish candle, small indecision candle, then bullish candle closing into the prior body.",
        signal: "Bullish",
        score,
        matchedIndices: [
          candles.length - 3,
          candles.length - 2,
          candles.length - 1
        ]
      });
    }

    // Evening Star
    if (
      isBullish(a) &&
      Math.abs(bodySize(b)) < Math.abs(bodySize(a)) * 0.3 &&
      isBearish(c)
    ) {
      const score = clamp01(
        0.5 + (a.open - c.close) / Math.max(1, Math.abs(a.open - a.close))
      );
      results.push({
        pattern_name: "Evening Star",
        confidence: score > 0.7 ? "High" : "Medium",
        description:
          "Evening Star: bullish, small indecision, then bearish follow-through.",
        signal: "Bearish",
        score,
        matchedIndices: [
          candles.length - 3,
          candles.length - 2,
          candles.length - 1
        ]
      });
    }

    // Three Soldiers / Crows
    if (
      isBullish(a) &&
      isBullish(b) &&
      isBullish(c) &&
      b.close > a.close &&
      c.close > b.close
    ) {
      results.push({
        pattern_name: "Three White Soldiers",
        confidence: "High",
        description:
          "Three consecutive bullish candles showing strong momentum.",
        signal: "Bullish",
        score: 0.8,
        matchedIndices: [
          candles.length - 3,
          candles.length - 2,
          candles.length - 1
        ]
      });
    }
    if (
      isBearish(a) &&
      isBearish(b) &&
      isBearish(c) &&
      b.close < a.close &&
      c.close < b.close
    ) {
      results.push({
        pattern_name: "Three Black Crows",
        confidence: "High",
        description:
          "Three consecutive bearish candles showing strong downward momentum.",
        signal: "Bearish",
        score: 0.8,
        matchedIndices: [
          candles.length - 3,
          candles.length - 2,
          candles.length - 1
        ]
      });
    }
  }

  if (results.length === 0) {
    return {
      pattern_name: "No Clear Pattern",
      confidence: "Low",
      description:
        "No recognizable candlestick pattern detected in the recent candles.",
      signal: "Neutral",
      score: 0
    };
  }

  results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const best = results[0];
  return {
    ...best,
    confidence:
      best.score && best.score > 0.9
        ? "Very High"
        : best.score && best.score > 0.7
        ? "High"
        : best.score && best.score > 0.5
        ? "Medium"
        : "Low"
  } as PatternResult;
}

/* -------------------- Image -> Pixel candles extractor & mapper -------------------- */

/**
 * extractCandlesFromImage(imageDataURI)
 * - heuristic detection of colored candle columns (red/green) on the chart area.
 * - returns an array of CandleData where open/high/low/close are pixel Y coordinates (0 at top).
 * - The caller/UI should map pixels -> price using mapPixelCandlesToPrices.
 */
export async function extractCandlesFromImage(
  imageDataURI: string
): Promise<CandleData[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const maxW = 1400;
      const scale = Math.min(1, maxW / img.width);

      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h).data;

      const sampleSkip = 2;

      type ColPixel = {
        x: number;
        ys: number[];
        colorGuess: "green" | "red" | null;
      };

      const columns: ColPixel[] = [];

      // --- FIXED COLOR DETECTION (soft check) ---
      function detectCandleColor(r: number, g: number, b: number): "green" | "red" | null {
        if (g > r + 8 && g > b + 8) return "green";
        if (r > g + 8 && r > b + 8) return "red";
        return null;
      }

      // --- SCAN ALL COLUMNS ---
      for (let x = 0; x < w; x += sampleSkip) {
        const ys: number[] = [];
        let dominant: { green: number; red: number } = { green: 0, red: 0 };

        for (let y = 0; y < h; y++) {
          const idx = (y * w + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const a = imgData[idx + 3];

          if (a < 40) continue; // transparent pixels ignored

          const c = detectCandleColor(r, g, b);
          if (c) {
            ys.push(y);
            if (c === "green") dominant.green++;
            if (c === "red") dominant.red++;
          }
        }

        if (ys.length > 3) {
          columns.push({
            x,
            ys,
            colorGuess: dominant.green > dominant.red ? "green" : "red"
          });
        }
      }

      if (columns.length === 0) {
        resolve([]);
        return;
      }

      // --- CLUSTER COLUMNS INTO CANDLE GROUPS ---
      const clusters: ColPixel[][] = [];
      let currentCluster: ColPixel[] = [columns[0]];

      for (let i = 1; i < columns.length; i++) {
        const A = columns[i - 1];
        const B = columns[i];

        if (Math.abs(B.x - A.x) <= sampleSkip * 3) {
          currentCluster.push(B);
        } else {
          clusters.push(currentCluster);
          currentCluster = [B];
        }
      }
      clusters.push(currentCluster);

      // --- EXTRACT OHLC FROM CLUSTERS ---
      const candles: CandleData[] = clusters
        .map((cluster) => {
          const ysAll = cluster.flatMap((c) => c.ys);

          const highPixel = Math.min(...ysAll);
          const lowPixel = Math.max(...ysAll);

          // detect median body thickness
          const avgW = cluster.length;

          // approx open/close: use left and right half comparisons
          const left = cluster[0].ys;
          const right = cluster[cluster.length - 1].ys;

          const bodyTop = Math.min(left[0], right[0]);
          const bodyBottom = Math.max(left[left.length - 1], right[right.length - 1]);

          return {
            open: bodyTop,
            close: bodyBottom,
            high: highPixel,
            low: lowPixel,
            volume: 0,
            color: cluster[0].colorGuess
          };
        })
        .filter((c) => c.high !== c.low);

      resolve(candles);
    };

    img.onerror = () => reject("Failed to load image");
    img.src = imageDataURI;
  });
}


/**
 * mapPixelCandlesToPrices
 * - pixelCandles: array where open/high/low/close are pixel Y (0 top)
 * - topPrice: numeric price at chartTopPx
 * - bottomPrice: numeric price at chartBottomPx
 * - chartTopPx & chartBottomPx are pixel Y coords in same canvas (if not known, we use 0 and canvas.height)
 *
 * The mapping used: price = topPrice - ( (pixel - topPx) / (bottomPx - topPx) ) * (topPrice - bottomPrice)
 */
export function mapPixelCandlesToPrices(
  pixelCandles: CandleData[],
  topPrice: number,
  bottomPrice: number,
  chartTopPx: number,
  chartBottomPx: number
): CandleData[] {
  const priceRange = topPrice - bottomPrice;
  const pxRange = chartBottomPx - chartTopPx || 1;
  return pixelCandles.map((pc) => {
    const mapY = (py: number) => {
      // clamp
      const p = Math.max(chartTopPx, Math.min(chartBottomPx, py));
      const frac = (p - chartTopPx) / pxRange; // 0..1 downward
      const price = topPrice - frac * priceRange;
      return Number(price.toFixed(4));
    };
    return {
      open: mapY(pc.open),
      high: mapY(pc.high),
      low: mapY(pc.low),
      close: mapY(pc.close),
      volume: pc.volume ?? 0
    };
  });
}
