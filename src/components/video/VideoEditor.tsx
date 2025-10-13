import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Scissors, Crop, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoEditorProps {
  open: boolean;
  onClose: () => void;
  videoBlob: Blob;
  onSave: (editedBlob: Blob, duration: number) => void;
}

export const VideoEditor = ({ open, onClose, videoBlob, onSave }: VideoEditorProps) => {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
      setIsMetadataLoaded(false);
      setDuration(0);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoBlob]);

  useEffect(() => {
    if (videoRef.current && isMetadataLoaded && duration > 0 && isFinite(duration)) {
      const startTime = (trimStart / 100) * duration;
      if (isFinite(startTime)) {
        videoRef.current.currentTime = startTime;
      }
    }
  }, [trimStart, duration, isMetadataLoaded]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      if (isFinite(videoDuration) && videoDuration > 0) {
        setDuration(videoDuration);
        setTrimEnd(100);
        setIsMetadataLoaded(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processVideo = async () => {
    if (!videoRef.current || !canvasRef.current || !isMetadataLoaded) {
      toast({
        title: "Video not ready",
        description: "Please wait for the video to load",
        variant: "destructive"
      });
      return;
    }

    if (!isFinite(duration) || duration <= 0) {
      toast({
        title: "Invalid video",
        description: "Video duration is invalid",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    toast({
      title: "Processing video",
      description: "This may take a moment...",
    });

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Calculate crop dimensions
      const cropX = (cropArea.x / 100) * video.videoWidth;
      const cropY = (cropArea.y / 100) * video.videoHeight;
      const cropW = (cropArea.width / 100) * video.videoWidth;
      const cropH = (cropArea.height / 100) * video.videoHeight;

      // Set canvas size to cropped dimensions
      canvas.width = cropW;
      canvas.height = cropH;

      // Calculate time range with validation
      const startTime = (trimStart / 100) * duration;
      const endTime = (trimEnd / 100) * duration;
      const trimmedDuration = endTime - startTime;

      if (!isFinite(startTime) || !isFinite(endTime) || !isFinite(trimmedDuration)) {
        throw new Error('Invalid time values');
      }

      // Create MediaRecorder for processing
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        const processedBlob = new Blob(chunks, { type: 'video/webm' });
        onSave(processedBlob, trimmedDuration);
        setIsProcessing(false);
        onClose();
        
        toast({
          title: "Video edited successfully",
          description: "Your edited video is ready",
          variant: "success"
        });
      };

      // Start recording and play through the trimmed section
      if (isFinite(startTime)) {
        video.currentTime = startTime;
      }
      mediaRecorder.start();

      const captureFrame = () => {
        if (video.currentTime >= endTime) {
          mediaRecorder.stop();
          return;
        }

        ctx.drawImage(
          video,
          cropX, cropY, cropW, cropH,
          0, 0, cropW, cropH
        );

        requestAnimationFrame(captureFrame);
      };

      video.onplay = () => {
        captureFrame();
      };

      video.play();

    } catch (error) {
      console.error('Error processing video:', error);
      setIsProcessing(false);
      toast({
        title: "Processing failed",
        description: "Could not process the video",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Edit Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Preview */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full"
              controls
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Trim Controls */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Trim Timeline
            </Label>
            {isMetadataLoaded && duration > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Start: {formatTime((trimStart / 100) * duration)}</span>
                  <span>End: {formatTime((trimEnd / 100) * duration)}</span>
                </div>
                <Slider
                  value={[trimStart, trimEnd]}
                  onValueChange={([start, end]) => {
                    setTrimStart(start);
                    setTrimEnd(end);
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Duration: {formatTime(((trimEnd - trimStart) / 100) * duration)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading video...</p>
            )}
          </div>

          {/* Crop Controls */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Crop className="h-4 w-4" />
              Crop Area (Percentage)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">X Position</Label>
                <Slider
                  value={[cropArea.x]}
                  onValueChange={([x]) => setCropArea({ ...cropArea, x })}
                  min={0}
                  max={100 - cropArea.width}
                  step={1}
                />
                <p className="text-xs text-muted-foreground mt-1">{cropArea.x}%</p>
              </div>
              <div>
                <Label className="text-xs">Y Position</Label>
                <Slider
                  value={[cropArea.y]}
                  onValueChange={([y]) => setCropArea({ ...cropArea, y })}
                  min={0}
                  max={100 - cropArea.height}
                  step={1}
                />
                <p className="text-xs text-muted-foreground mt-1">{cropArea.y}%</p>
              </div>
              <div>
                <Label className="text-xs">Width</Label>
                <Slider
                  value={[cropArea.width]}
                  onValueChange={([width]) => setCropArea({ ...cropArea, width })}
                  min={10}
                  max={100 - cropArea.x}
                  step={1}
                />
                <p className="text-xs text-muted-foreground mt-1">{cropArea.width}%</p>
              </div>
              <div>
                <Label className="text-xs">Height</Label>
                <Slider
                  value={[cropArea.height]}
                  onValueChange={([height]) => setCropArea({ ...cropArea, height })}
                  min={10}
                  max={100 - cropArea.y}
                  step={1}
                />
                <p className="text-xs text-muted-foreground mt-1">{cropArea.height}%</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCropArea({ x: 0, y: 0, width: 100, height: 100 })}
            >
              Reset Crop
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={processVideo} disabled={isProcessing}>
            <Save className="h-4 w-4 mr-2" />
            {isProcessing ? "Processing..." : "Save Edited Video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
