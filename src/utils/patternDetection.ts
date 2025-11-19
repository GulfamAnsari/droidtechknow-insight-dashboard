// Manual candlestick pattern detection without AI
export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PatternResult {
  pattern_name: string;
  confidence: string;
  description: string;
  signal: string;
}

// Helper functions
const isBullish = (candle: CandleData) => candle.close > candle.open;
const isBearish = (candle: CandleData) => candle.close < candle.open;
const getBody = (candle: CandleData) => Math.abs(candle.close - candle.open);
const getUpperShadow = (candle: CandleData) => candle.high - Math.max(candle.open, candle.close);
const getLowerShadow = (candle: CandleData) => Math.min(candle.open, candle.close) - candle.low;
const getRange = (candle: CandleData) => candle.high - candle.low;

export const detectPatterns = (candles: CandleData[]): PatternResult => {
  if (candles.length < 2) {
    return {
      pattern_name: "Insufficient Data",
      confidence: "Low",
      description: "Not enough candles to detect a pattern",
      signal: "Neutral"
    };
  }

  // Check for single candle patterns (using last candle)
  const lastCandle = candles[candles.length - 1];
  const body = getBody(lastCandle);
  const upperShadow = getUpperShadow(lastCandle);
  const lowerShadow = getLowerShadow(lastCandle);
  const range = getRange(lastCandle);

  // Doji Pattern
  if (body < range * 0.1) {
    return {
      pattern_name: "Doji",
      confidence: "High",
      description: "Indecision in the market. The opening and closing prices are nearly equal, suggesting a potential reversal.",
      signal: "Neutral"
    };
  }

  // Hammer Pattern
  if (isBullish(lastCandle) && lowerShadow > body * 2 && upperShadow < body * 0.3) {
    return {
      pattern_name: "Hammer",
      confidence: "High",
      description: "A bullish reversal pattern with a small body and long lower shadow, indicating buyers pushed prices up after sellers drove them down.",
      signal: "Bullish"
    };
  }

  // Inverted Hammer
  if (isBullish(lastCandle) && upperShadow > body * 2 && lowerShadow < body * 0.3) {
    return {
      pattern_name: "Inverted Hammer",
      confidence: "Medium",
      description: "A potential bullish reversal with a small body and long upper shadow, showing buying pressure.",
      signal: "Bullish"
    };
  }

  // Hanging Man
  if (isBearish(lastCandle) && lowerShadow > body * 2 && upperShadow < body * 0.3) {
    return {
      pattern_name: "Hanging Man",
      confidence: "High",
      description: "A bearish reversal pattern appearing after an uptrend with a small body and long lower shadow.",
      signal: "Bearish"
    };
  }

  // Shooting Star
  if (isBearish(lastCandle) && upperShadow > body * 2 && lowerShadow < body * 0.3) {
    return {
      pattern_name: "Shooting Star",
      confidence: "High",
      description: "A bearish reversal pattern with a small body and long upper shadow, indicating rejection of higher prices.",
      signal: "Bearish"
    };
  }

  // Check for two-candle patterns
  if (candles.length >= 2) {
    const prevCandle = candles[candles.length - 2];
    const prevBody = getBody(prevCandle);
    
    // Bullish Engulfing
    if (isBearish(prevCandle) && isBullish(lastCandle) && 
        body > prevBody && lastCandle.close > prevCandle.open && 
        lastCandle.open < prevCandle.close) {
      return {
        pattern_name: "Bullish Engulfing",
        confidence: "High",
        description: "A bullish reversal pattern where a large bullish candle completely engulfs the previous bearish candle.",
        signal: "Bullish"
      };
    }

    // Bearish Engulfing
    if (isBullish(prevCandle) && isBearish(lastCandle) && 
        body > prevBody && lastCandle.close < prevCandle.open && 
        lastCandle.open > prevCandle.close) {
      return {
        pattern_name: "Bearish Engulfing",
        confidence: "High",
        description: "A bearish reversal pattern where a large bearish candle completely engulfs the previous bullish candle.",
        signal: "Bearish"
      };
    }

    // Piercing Line
    if (isBearish(prevCandle) && isBullish(lastCandle) && 
        lastCandle.open < prevCandle.low && 
        lastCandle.close > prevCandle.open + prevBody * 0.5 && 
        lastCandle.close < prevCandle.open) {
      return {
        pattern_name: "Piercing Line",
        confidence: "Medium",
        description: "A bullish reversal pattern where the second candle closes more than halfway up the previous bearish candle.",
        signal: "Bullish"
      };
    }

    // Dark Cloud Cover
    if (isBullish(prevCandle) && isBearish(lastCandle) && 
        lastCandle.open > prevCandle.high && 
        lastCandle.close < prevCandle.open + prevBody * 0.5 && 
        lastCandle.close > prevCandle.open) {
      return {
        pattern_name: "Dark Cloud Cover",
        confidence: "Medium",
        description: "A bearish reversal pattern where the second candle closes more than halfway down the previous bullish candle.",
        signal: "Bearish"
      };
    }
  }

  // Check for three-candle patterns
  if (candles.length >= 3) {
    const thirdLast = candles[candles.length - 3];
    const secondLast = candles[candles.length - 2];
    
    // Morning Star
    if (isBearish(thirdLast) && getBody(secondLast) < getBody(thirdLast) * 0.3 && 
        isBullish(lastCandle) && lastCandle.close > thirdLast.open + getBody(thirdLast) * 0.5) {
      return {
        pattern_name: "Morning Star",
        confidence: "High",
        description: "A three-candle bullish reversal pattern: large bearish, small indecision, then large bullish candle.",
        signal: "Bullish"
      };
    }

    // Evening Star
    if (isBullish(thirdLast) && getBody(secondLast) < getBody(thirdLast) * 0.3 && 
        isBearish(lastCandle) && lastCandle.close < thirdLast.open - getBody(thirdLast) * 0.5) {
      return {
        pattern_name: "Evening Star",
        confidence: "High",
        description: "A three-candle bearish reversal pattern: large bullish, small indecision, then large bearish candle.",
        signal: "Bearish"
      };
    }

    // Three White Soldiers
    if (isBullish(thirdLast) && isBullish(secondLast) && isBullish(lastCandle) &&
        secondLast.close > thirdLast.close && lastCandle.close > secondLast.close) {
      return {
        pattern_name: "Three White Soldiers",
        confidence: "High",
        description: "Three consecutive bullish candles with higher closes, indicating strong upward momentum.",
        signal: "Bullish"
      };
    }

    // Three Black Crows
    if (isBearish(thirdLast) && isBearish(secondLast) && isBearish(lastCandle) &&
        secondLast.close < thirdLast.close && lastCandle.close < secondLast.close) {
      return {
        pattern_name: "Three Black Crows",
        confidence: "High",
        description: "Three consecutive bearish candles with lower closes, indicating strong downward momentum.",
        signal: "Bearish"
      };
    }
  }

  // Default if no pattern detected
  return {
    pattern_name: "No Clear Pattern",
    confidence: "Low",
    description: "No recognizable candlestick pattern detected in the recent candles.",
    signal: "Neutral"
  };
};

// Mock function for demo - in real scenario, this would use OCR or manual input
export const extractCandlesFromImage = (imageData: string): CandleData[] => {
  // This is a mock implementation
  // In a real scenario, you'd need OCR or user to input candle data manually
  // For demo purposes, returning sample data
  return [
    { open: 100, high: 105, low: 98, close: 102 },
    { open: 102, high: 108, low: 101, close: 107 },
    { open: 107, high: 110, low: 105, close: 106 },
  ];
};
