import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  Upload, 
  Download, 
  Trash2, 
  Edit,
  Film
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VideoEditor } from "@/components/video/VideoEditor";
import { useDropzone } from "react-dropzone";

interface VideoFile {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  size: string;
  uploadedAt: Date;
}

const VideoEditorPage = () => {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [editingVideo, setEditingVideo] = useState<VideoFile | null>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid file",
          description: "Please upload a video file",
          variant: "destructive"
        });
        return;
      }

      // Create video element to get duration
      const videoUrl = URL.createObjectURL(file);
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';

      videoEl.onloadedmetadata = () => {
        const newVideo: VideoFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          blob: file,
          duration: videoEl.duration,
          size: formatFileSize(file.size),
          uploadedAt: new Date()
        };

        setVideos(prev => [newVideo, ...prev]);
        URL.revokeObjectURL(videoUrl);

        toast({
          title: "Video uploaded",
          description: `${file.name} has been added`,
          variant: "success"
        });
      };

      videoEl.src = videoUrl;
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv']
    },
    multiple: true
  });

  const downloadVideo = (video: VideoFile) => {
    const url = URL.createObjectURL(video.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = video.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Video download has begun",
      variant: "success"
    });
  };

  const deleteVideo = (videoId: string) => {
    setVideos(prev => prev.filter(v => v.id !== videoId));
    toast({
      title: "Video deleted",
      description: "Video has been removed",
      variant: "success"
    });
  };

  const handleSaveEditedVideo = (editedBlob: Blob, newDuration: number) => {
    if (!editingVideo) return;

    const editedVideo: VideoFile = {
      ...editingVideo,
      id: Date.now().toString(),
      name: `${editingVideo.name.replace(/\.[^/.]+$/, '')}_edited.webm`,
      blob: editedBlob,
      duration: newDuration,
      size: formatFileSize(editedBlob.size),
      uploadedAt: new Date()
    };

    setVideos(prev => [editedVideo, ...prev]);
    setEditingVideo(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Film className="h-8 w-8" />
          Video Editor
        </h1>
        <p className="text-muted-foreground">Upload and edit your videos with trim and crop tools</p>
      </div>

      {/* Upload Area */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            <input {...getInputProps()} />
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the videos here...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">Drag & drop videos here</p>
                <p className="text-sm text-muted-foreground">or click to select files</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports: MP4, WebM, MOV, AVI, MKV
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Videos List */}
      {videos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Videos ({videos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video) => (
                <div key={video.id} className="border rounded-lg overflow-hidden">
                  <video
                    src={URL.createObjectURL(video.blob)}
                    className="w-full aspect-video bg-black"
                    controls
                  />
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="font-medium truncate">{video.name}</p>
                      <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                        <span>Duration: {formatTime(video.duration)}</span>
                        <span>Size: {video.size}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setEditingVideo(video)}
                        size="sm"
                        variant="default"
                        className="gap-2 flex-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => downloadVideo(video)}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => deleteVideo(video.id)}
                        size="sm"
                        variant="outline"
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Film className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No videos uploaded yet</p>
            <p className="text-sm">Upload videos to start editing</p>
          </CardContent>
        </Card>
      )}

      {/* Video Editor Dialog */}
      {editingVideo && (
        <VideoEditor
          open={!!editingVideo}
          onClose={() => setEditingVideo(null)}
          videoBlob={editingVideo.blob}
          onSave={handleSaveEditedVideo}
        />
      )}
    </div>
  );
};

export default VideoEditorPage;
