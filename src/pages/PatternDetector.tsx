// src/components/PatternDetector.tsx
import React, { useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2, TrendingUp, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import {
  detectPatterns,
  extractCandlesFromImage,
  mapPixelCandlesToPrices
} from "@/utils/patternDetection";
import { PatternResult, CandleData } from "@/utils/pattern";

type DetectionMode = "ai" | "manual";

const PatternDetector: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatternResult | null>(null);
  const [highlightedImage, setHighlightedImage] = useState<string | null>(null);
  const [detectionMode, setDetectionMode] = useState<DetectionMode>("ai");

  const fileRef = useRef<HTMLInputElement | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setResult(null);
      setHighlightedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"]
    },
    maxFiles: 1
  });

  const analyzePattern = async () => {
    if (!image) return;
    setLoading(true);
    setHighlightedImage(null);

    try {
      if (detectionMode === "manual") {
        try {
          // STEP 1: Extract raw pixel candles
          const pixelCandles = await extractCandlesFromImage(image);
          if (!pixelCandles || pixelCandles.length === 0) {
            toast.error(
              "No candles detected. Try cropping the image to the price area."
            );
            setLoading(false);
            return;
          }

          // STEP 2: Load the image (hidden canvas) to get pixel height for mapping
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => reject(e);
            img.src = image!;
          });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const h = img.height;

          // STEP 3: Auto-generate default price ranges
          const highestPx = Math.max(...pixelCandles.map((c) => c.high));
          const lowestPx = Math.min(...pixelCandles.map((c) => c.low));

          const topPrice = highestPx * 1.5; // default cushion
          const bottomPrice = lowestPx * 0.5; // default cushion

          // STEP 4: Auto-use full chart height
          const chartTopPx = 0;
          const chartBottomPx = h;

          // STEP 5: Convert pixel candles → real price candles
          const priceCandles = mapPixelCandlesToPrices(
            pixelCandles,
            topPrice,
            bottomPrice,
            chartTopPx,
            chartBottomPx
          );

          // STEP 6: Detect pattern
          const detectedPattern = detectPatterns(priceCandles);
          setResult(detectedPattern);

          // STEP 7: Optional highlighted image
          await generateHighlightedImage(image, detectedPattern.pattern_name);

          toast.success("Pattern analysis complete!");
        } catch (err) {
          console.error("Manual mode error:", err);
          toast.error("Manual detection failed.");
        } finally {
          setLoading(false);
        }
      } else {
        // AI-based detection via supabase function
        const { data, error } = await supabase.functions.invoke(
          "detect-pattern",
          {
            body: { image }
          }
        );

        if (error) throw error;

        // Expected data: { pattern_name, confidence, description, signal, score, matchedIndices, highlighted_image? }
        setResult(data as PatternResult);

        // generate highlighted image
        await generateHighlightedImage(image, (data as any).pattern_name);

        toast.success("Pattern analysis complete!");
      }
    } catch (error: any) {
      console.error("Error analyzing pattern:", error);
      toast.error(error.message || "Failed to analyze pattern");
    } finally {
      setLoading(false);
    }
  };

  const generateHighlightedImage = async (
    originalImage: string,
    patternName: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "highlight-pattern",
        {
          body: {
            image: originalImage,
            pattern_name: patternName
          }
        }
      );

      if (error) throw error;
      // data.highlighted_image expected as base64 dataURI
      setHighlightedImage(data?.highlighted_image ?? null);
    } catch (error) {
      console.error("Error generating highlighted image:", error);
      // Don't show error to user for this secondary feature
    }
  };

  return (
    <ScrollArea className="h-screen">
      <div className="dashboard-container">
        <div className="max-w-4xl mx-auto space-y-6 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Pattern Detector
            </h1>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Upload Intraday Chart
                </h2>
                <p className="text-muted-foreground mt-1">
                  Upload a candlestick chart image (5min or 15min interval)
                </p>
              </div>
              <Select
                value={detectionMode}
                onValueChange={(value) =>
                  setDetectionMode(value as DetectionMode)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Detection Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Detection
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">Manual Detection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!image ? (
              <div
                {...getRootProps()}
                className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-colors
                ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }
              `}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground mb-2">
                  {isDragActive
                    ? "Drop the image here"
                    : "Drag & drop chart image"}
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to select file (PNG, JPG, JPEG, WEBP)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border border-border max-h-[400px] flex items-center justify-center bg-muted">
                  <img
                    src={image}
                    alt="Uploaded chart"
                    className="max-w-full max-h-[400px] object-contain"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={analyzePattern}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Detect Pattern"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImage(null);
                      setResult(null);
                      setHighlightedImage(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {result && (
            <>
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 text-foreground">
                  Detection Result
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      Pattern Name
                    </h3>
                    <p className="text-lg text-primary font-semibold">
                      {result.pattern_name}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      Confidence
                    </h3>
                    <p className="text-muted-foreground">{result.confidence}</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      Pattern Category
                    </h3>
                    <p className="text-muted-foreground">{result?.category}</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      Strength Score
                    </h3>
                    <p className="text-muted-foreground">
                      {(result.score * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      Matched Candle
                    </h3>
                    <p className="text-muted-foreground">
                      Index: {result.matchedIndices?.join(", ")}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      Trading Signal
                    </h3>
                    <p
                      className={`font-medium ${
                        result.signal?.toLowerCase().includes("bullish")
                          ? "text-green-600"
                          : result.signal?.toLowerCase().includes("bearish")
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {result.signal}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      Recommended Action
                    </h3>
                    <p className="text-muted-foreground">{result?.action}</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      Description
                    </h3>
                    <p className="text-muted-foreground">
                      {result.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      Reliability Notes
                    </h3>
                    <p className="text-muted-foreground">{result?.notes}</p>
                  </div>
                </div>
              </Card>

              {highlightedImage && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-foreground">
                    Highlighted Pattern
                  </h2>
                  <div className="relative rounded-lg overflow-hidden border border-border max-h-[400px] flex items-center justify-center bg-muted">
                    <img
                      src={highlightedImage}
                      alt="Highlighted pattern"
                      className="max-w-full max-h-[400px] object-contain"
                    />
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};

export default PatternDetector;
