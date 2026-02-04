import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Maximize,
  Heart,
  Minimize2,
  Maximize2,
  GripVertical
} from "lucide-react";
import LazyImage from "@/components/ui/lazy-image";

interface Song {
  id: string;
  name: string;
  artists: {
    primary: {
      name: string;
    }[];
  };
  image: {
    quality: string;
    url: string;
  }[];
  downloadUrl: {
    quality: string;
    url: string;
  }[];
  duration: number;
}

interface AudioPlayerProps {
  song: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
  onDurationUpdate: (duration: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isRepeat: boolean;
  isShuffle: boolean;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  audioRef: any;
  isLiked?: boolean;
  onToggleLike?: () => void;
}

const AudioPlayer = ({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  currentTime,
  duration,
  onTimeUpdate,
  onDurationUpdate,
  volume,
  onVolumeChange,
  isRepeat,
  isShuffle,
  onToggleRepeat,
  onToggleShuffle,
  onToggleFullscreen,
  onToggleMute,
  isMuted,
  audioRef,
  isLiked = false,
  onToggleLike
}: AudioPlayerProps) => {
  const [isFloating, setIsFloating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isFloating || !playerRef.current) return;
    setIsDragging(true);
    const rect = playerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, [isFloating]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!playerRef.current) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - playerRef.current.offsetWidth;
      const maxY = window.innerHeight - playerRef.current.offsetHeight;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Reset position when toggling floating mode
  useEffect(() => {
    if (!isFloating) {
      setPosition({ x: 0, y: 0 });
    } else {
      // Set initial position to bottom-right
      setPosition({
        x: window.innerWidth - 336, // w-80 = 320px + 16px margin
        y: window.innerHeight - 120
      });
    }
  }, [isFloating]);

  useEffect(() => {
    if (audioRef.current && song) {
      let audioUrl = "";

      // Check if it's an offline song with blob URL
      if (song.downloadUrl?.[0]?.url?.startsWith("blob:")) {
        audioUrl = song.downloadUrl[0].url;
      } else {
        audioUrl =
          song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
          song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
          song.downloadUrl?.[0]?.url ||
          "";
      }

      if (audioUrl && audioRef.current.src !== audioUrl) {
        const wasPlaying = !audioRef.current.paused;
        const currentTimeBackup = audioRef.current.currentTime;

        audioRef.current.src = audioUrl;
        audioRef.current.volume = volume / 100;
        audioRef.current.currentTime = currentTime;

        if (wasPlaying || isPlaying) {
          audioRef.current.play();
        }
      }
    }
  }, [song]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Sync current time from context but avoid setting if close to current
  useEffect(() => {
    if (
      audioRef.current &&
      Math.abs(audioRef.current.currentTime - currentTime) > 2
    ) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      onDurationUpdate(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && duration > 0) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    onVolumeChange(value[0]);
  };

  const handleAudioEnded = () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      onNext();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMobilePlayerClick = () => {
    // Auto open fullscreen on mobile when clicking the player
    if (window.innerWidth < 768) {
      onToggleFullscreen();
    }
  };

  useEffect(() => {
    if ("mediaSession" in navigator && audioRef.current && song) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name,
        artist:
          song.artists?.primary?.map((a) => a.name).join(", ") ||
          "Unknown Artist",
        artwork: [
          {
            src: song.image?.[0]?.url,
            sizes: "500x500",
            type: "image/jpeg"
          }
        ]
      });

      navigator.mediaSession.setActionHandler("play", () => {
        if (!isPlaying) onPlayPause();
        audioRef.current.play();
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        if (isPlaying) onPlayPause();
        audioRef.current.pause();
      });

      navigator.mediaSession.setActionHandler("seekbackward", () => {
        audioRef.current.currentTime = Math.max(
          audioRef.current.currentTime - 10,
          0
        );
      });

      navigator.mediaSession.setActionHandler("seekforward", () => {
        audioRef.current.currentTime = Math.min(
          audioRef.current.currentTime + 10,
          audioRef.current.duration
        );
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in audioRef.current) {
          audioRef.current.fastSeek(details.seekTime);
        } else {
          audioRef.current.currentTime = details.seekTime;
        }
      });

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        if (onPrevious) onPrevious();
      });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        if (onNext) onNext();
      });

      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [song, isPlaying, onPlayPause, onNext, onPrevious]);

  if (!song) return null;

  return (
    <div
      ref={playerRef}
      className={`fixed z-40 bg-background/95 backdrop-blur-md border shadow-lg transition-all ${
        isFloating 
          ? "w-80 rounded-2xl" 
          : "bottom-0 left-0 right-0 rounded-t-xl"
      } ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{ 
        zIndex: 99,
        ...(isFloating ? {
          left: position.x,
          top: position.y,
          transition: isDragging ? 'none' : 'all 0.3s'
        } : {})
      }}
    >
      {/* Progress bar - thin line at top */}
      <div className={`${isFloating ? 'px-3 pt-3' : 'px-4 pt-2'}`}>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="w-8 text-right">{formatTime(currentTime)}</span>
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="flex-1"
          />
          <span className="w-8">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Drag handle for floating mode */}
      {isFloating && (
        <div 
          className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Player controls - compact */}
      <div className={`flex items-center gap-2 ${isFloating ? 'p-3 pt-2' : 'p-3'}`}>
        {/* Song info */}
        <div
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
          onClick={handleMobilePlayerClick}
        >
          <LazyImage
            src={song.image?.[0]?.url}
            alt={song.name}
            className={`${isFloating ? 'w-10 h-10' : 'w-11 h-11'} rounded-lg object-cover shadow-md`}
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{song.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown"}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          {/* Like button */}
          {onToggleLike && (
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={onToggleLike}
              className={`h-8 w-8 ${isLiked ? 'text-red-500' : ''}`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>
          )}

          <Button size="icon" variant="ghost" onClick={onPrevious} className="h-8 w-8">
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button 
            size="icon" 
            onClick={onPlayPause} 
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
          
          <Button size="icon" variant="ghost" onClick={onNext} className="h-8 w-8">
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Desktop-only controls */}
          <div className="hidden md:flex items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleShuffle}
              className={`h-8 w-8 ${isShuffle ? "text-primary" : ""}`}
            >
              <Shuffle className="h-3.5 w-3.5" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleRepeat}
              className={`h-8 w-8 ${isRepeat ? "text-primary" : ""}`}
            >
              <Repeat className="h-3.5 w-3.5" />
            </Button>

            <Button size="icon" variant="ghost" onClick={onToggleMute} className="h-8 w-8">
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
            
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="w-16"
            />
          </div>

          {/* Floating toggle */}
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => setIsFloating(!isFloating)}
            className="h-8 w-8 hidden md:flex"
          >
            {isFloating ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          </Button>

          {/* Fullscreen */}
          <Button size="icon" variant="ghost" onClick={onToggleFullscreen} className="h-8 w-8">
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
