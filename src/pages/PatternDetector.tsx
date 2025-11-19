import { useState } from "react";
import { Upload, Loader2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PatternResult {
  pattern_name: string;
  confidence: string;
  description: string;
  signal: string;
}

const PatternDetector = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PatternResult | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
  });

  const analyzePattern = async () => {
    if (!image) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-pattern', {
        body: { image }
      });

      if (error) throw error;

      setResult(data);
      toast.success("Pattern analysis complete!");
    } catch (error: any) {
      console.error('Error analyzing pattern:', error);
      toast.error(error.message || "Failed to analyze pattern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Pattern Detector</h1>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Upload Intraday Chart</h2>
          <p className="text-muted-foreground mb-6">
            Upload a candlestick chart image (5min or 15min interval) to detect patterns
          </p>

          {!image ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground mb-2">
                {isDragActive ? 'Drop the image here' : 'Drag & drop chart image'}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to select file (PNG, JPG, JPEG, WEBP)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={image} alt="Uploaded chart" className="w-full" />
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
                    'Detect Pattern'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImage(null);
                    setResult(null);
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </Card>

        {result && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Detection Result</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-1">Pattern Name</h3>
                <p className="text-lg text-primary font-semibold">{result.pattern_name}</p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Confidence</h3>
                <p className="text-muted-foreground">{result.confidence}</p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Trading Signal</h3>
                <p className={`font-medium ${
                  result.signal.toLowerCase().includes('bullish') ? 'text-green-600' :
                  result.signal.toLowerCase().includes('bearish') ? 'text-red-600' :
                  'text-muted-foreground'
                }`}>
                  {result.signal}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">Description</h3>
                <p className="text-muted-foreground">{result.description}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PatternDetector;
