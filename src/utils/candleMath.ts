// src/utils/candleMath.ts
import { CandleData } from "./pattern";

export const bodySize = (c: CandleData) => Math.abs(c.close - c.open);
export const upperShadow = (c: CandleData) => c.high - Math.max(c.open, c.close);
export const lowerShadow = (c: CandleData) => Math.min(c.open, c.close) - c.low;
export const candleRange = (c: CandleData) => c.high - c.low;
export const isBullish = (c: CandleData) => c.close > c.open;
export const isBearish = (c: CandleData) => c.close < c.open;

export function detectTrend(candles: CandleData[], lookback = 5): -1 | 0 | 1 {
  const N = Math.min(lookback, candles.length);
  if (N < 2) return 0;
  let ups = 0;
  let downs = 0;
  // check last N candles
  for (let i = candles.length - N + 1; i < candles.length; i++) {
    if (i <= 0) continue;
    const prev = candles[i - 1];
    const cur = candles[i];
    if (cur.close > prev.close) ups++;
    if (cur.close < prev.close) downs++;
  }
  if (ups >= Math.ceil((N - 1) * 0.6)) return 1;
  if (downs >= Math.ceil((N - 1) * 0.6)) return -1;
  return 0;
}

export function avgVolume(candles: CandleData[], n = 20) {
  const arr = candles
    .slice(Math.max(0, candles.length - n))
    .map((c) => c.volume ?? 0)
    .filter((v) => v > 0);
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function clamp01(v: number) {
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
