// src/types/pattern.ts
export type CandleData = {
  time?: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type PatternResult = {
  pattern_name: string;
  confidence: "Very High" | "High" | "Medium" | "Low";
  description: string;
  signal: "Bullish" | "Bearish" | "Neutral";
  score?: number; // 0..1
  matchedIndices?: number[]; // indexes in supplied candles
};