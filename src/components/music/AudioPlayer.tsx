import { useRef, useEffect } from "react";
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
  Maximize
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
  isMuted
}: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

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

  if (!song) return null;

  useEffect(() => {
    if ("mediaSession" in navigator && audioRef.current) {
      const metadata = new MediaMetadata({
        title: song.name,
        artist: song.artists?.primary?.map((a) => a.name).join(", ") ||
                "Unknown Artist",
        artwork: [
          {
            src: song.image?.[0]?.url,
            sizes: "500x500",
            type: "image/jpeg"
          }
        ]
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

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        audioRef.current.currentTime = 0;
      });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        audioRef.current.currentTime = 0;
      });
    }
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-40"
      style={{ zIndex: 99 }}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Progress bar */}
      <div className="px-4 pt-2">
        <Slider
          value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Player controls */}
      <div className="flex items-center gap-3 p-4">
        {/* Song info - clickable on mobile */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer md:cursor-default"
          onClick={handleMobilePlayerClick}
        >
          <LazyImage
            src={song.image?.[0]?.url}
            alt={song.name}
            className="w-12 h-12 rounded object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{song.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {song.artists?.primary?.map((a) => a.name).join(", ") ||
                "Unknown Artist"}
            </p>
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <Button size="sm" variant="ghost" onClick={onPrevious}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onPlayPause}>
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={onNext}>
            <SkipForward className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggleFullscreen}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop controls */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleShuffle}
            className={isShuffle ? "text-primary" : ""}
          >
            <Shuffle className="h-4 w-4" />
          </Button>

          <Button size="sm" variant="ghost" onClick={onPrevious}>
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button size="sm" onClick={onPlayPause}>
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button size="sm" variant="ghost" onClick={onNext}>
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleRepeat}
            className={isRepeat ? "text-primary" : ""}
          >
            <Repeat className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume and fullscreen - Desktop only */}
        <div className="hidden md:flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onToggleMute}>
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="w-20"
          />
          <Button size="sm" variant="ghost" onClick={onToggleFullscreen}>
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
