
import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  Square, 
  Download, 
  Trash2, 
  Play, 
  Pause,
  Monitor,
  Mic,
  MicOff,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VideoEditor } from "@/components/video/VideoEditor";

interface Recording {
  id: string;
  name: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
  size: string;
}

const ScreenRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
  const [editingRecording, setEditingRecording] = useState<Recording | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const startRecording = async () => {
    try {
      const displayMediaOptions = {
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: includeAudio
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      
      // Add microphone audio if requested
      if (includeAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioTrack = audioStream.getAudioTracks()[0];
          stream.addTrack(audioTrack);
        } catch (audioError) {
          console.warn('Could not add microphone audio:', audioError);
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const recording: Recording = {
          id: Date.now().toString(),
          name: `Screen Recording ${new Date().toLocaleString()}`,
          blob,
          duration: recordingTime,
          timestamp: new Date(),
          size: formatFileSize(blob.size)
        };

        setRecordings(prev => [recording, ...prev]);
        setCurrentRecording(recording);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        toast({
          title: "Recording saved",
          description: `Recording saved with duration ${formatTime(recordingTime)}`,
          variant: "success"
        });
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording started",
        description: "Screen recording has begun",
        variant: "success"
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not start screen recording. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        // Resume timer
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        // Pause timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const downloadRecording = (recording: Recording) => {
    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Recording download has begun",
      variant: "success"
    });
  };

  const deleteRecording = (recordingId: string) => {
    setRecordings(prev => prev.filter(r => r.id !== recordingId));
    if (currentRecording?.id === recordingId) {
      setCurrentRecording(null);
    }
    toast({
      title: "Recording deleted",
      description: "Recording has been removed",
      variant: "success"
    });
  };

  const handleSaveEditedVideo = (editedBlob: Blob, newDuration: number) => {
    if (!editingRecording) return;

    const editedRecording: Recording = {
      ...editingRecording,
      id: Date.now().toString(),
      name: `${editingRecording.name} (Edited)`,
      blob: editedBlob,
      duration: newDuration,
      timestamp: new Date(),
      size: formatFileSize(editedBlob.size)
    };

    setRecordings(prev => [editedRecording, ...prev]);
    setCurrentRecording(editedRecording);
    setEditingRecording(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Video className="h-8 w-8" />
          Screen Recorder
        </h1>
        <p className="text-muted-foreground">Record your screen with audio support</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recording Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Recording Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Audio Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Include Audio</span>
              <Button
                variant={includeAudio ? "default" : "outline"}
                size="sm"
                onClick={() => setIncludeAudio(!includeAudio)}
                disabled={isRecording}
                className="gap-2"
              >
                {includeAudio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {includeAudio ? "On" : "Off"}
              </Button>
            </div>

            {/* Recording Status */}
            {isRecording && (
              <div className="text-center space-y-2">
                <Badge variant={isPaused ? "secondary" : "destructive"} className="text-lg px-4 py-2">
                  {isPaused ? "PAUSED" : "RECORDING"} {formatTime(recordingTime)}
                </Badge>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2 justify-center">
              {!isRecording ? (
                <Button onClick={startRecording} className="gap-2">
                  <Video className="h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={pauseRecording}
                    variant="outline"
                    className="gap-2"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {isPaused ? "Resume" : "Pause"}
                  </Button>
                  <Button 
                    onClick={stopRecording}
                    variant="destructive"
                    className="gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                </>
              )}
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Click "Start Recording" to begin</p>
              <p>• Select the screen/window to record</p>
              <p>• Use pause/resume for breaks</p>
              <p>• Recordings are saved locally</p>
            </div>
          </CardContent>
        </Card>

        {/* Current Recording Preview */}
        {currentRecording && (
          <Card>
            <CardHeader>
              <CardTitle>Latest Recording</CardTitle>
            </CardHeader>
            <CardContent>
              <video
                controls
                className="w-full rounded-lg"
                src={URL.createObjectURL(currentRecording.blob)}
              >
                Your browser does not support video playback.
              </video>
              <div className="mt-4 space-y-2">
                <p className="font-medium">{currentRecording.name}</p>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Duration: {formatTime(currentRecording.duration)}</span>
                  <span>Size: {currentRecording.size}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditingRecording(currentRecording)}
                    size="sm"
                    variant="outline"
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => downloadRecording(currentRecording)}
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    onClick={() => deleteRecording(currentRecording.id)}
                    size="sm"
                    variant="outline"
                    className="gap-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Saved Recordings ({recordings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recordings.map((recording) => (
                <div key={recording.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{recording.name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Duration: {formatTime(recording.duration)}</span>
                      <span>Size: {recording.size}</span>
                      <span>Date: {recording.timestamp.toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditingRecording(recording)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => downloadRecording(recording)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      onClick={() => deleteRecording(recording.id)}
                      size="sm"
                      variant="outline"
                      className="gap-2 text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Editor Dialog */}
      {editingRecording && (
        <VideoEditor
          open={!!editingRecording}
          onClose={() => setEditingRecording(null)}
          videoBlob={editingRecording.blob}
          onSave={handleSaveEditedVideo}
        />
      )}
    </div>
  );
};

export default ScreenRecorder;
