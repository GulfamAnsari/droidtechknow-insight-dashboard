import { useRef, useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  GripVertical
} from "lucide-react";
import LazyImage from "@/components/ui/lazy-image";
import { useMusicContext } from "@/contexts/MusicContext";

const GlobalFloatingPlayer = () => {
  const location = useLocation();
  const {
    currentSong,
    isPlaying,
    playlist,
    currentIndex,
    currentTime,
    duration,
    volume,
    isMuted,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsMuted,
    playNext,
    playPrevious,
    setCurrentSong
  } = useMusicContext();

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 392, height: 140 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDir, setResizeDir] = useState<'left' | 'top' | 'right' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Show floating player when on non-music pages and there's a song playing
  const isMusicPage = location.pathname === "/music" || location.pathname.startsWith("/music/");
  const shouldShow = currentSong && !isMusicPage;

  useEffect(() => {
    if (shouldShow && !isVisible) {
      setIsVisible(true);
      setPosition({
        x: window.innerWidth - 412,
        y: window.innerHeight - 160
      });
    } else if (!shouldShow) {
      setIsVisible(false);
    }
  }, [shouldShow, isVisible]);

  // Audio playback
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;
    
    const audioUrl =
      currentSong.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
      currentSong.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
      currentSong.downloadUrl?.[0]?.url;

    if (audioUrl) {
      const secureUrl = audioUrl.replace(/^http:\/\//i, "https://");
      if (audioRef.current.src !== secureUrl) {
        audioRef.current.src = secureUrl;
      }
    }
  }, [currentSong]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(console.error);
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!playerRef.current) return;
    setIsDragging(true);
    const rect = playerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent, dir: 'left' | 'top' | 'right') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDir(dir);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && playerRef.current) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
      
      if (isResizing && resizeDir) {
        if (resizeDir === 'left') {
          const newWidth = (position.x + size.width) - e.clientX;
          const clampedWidth = Math.max(320, Math.min(500, newWidth));
          const widthDiff = clampedWidth - size.width;
          setSize(s => ({ ...s, width: clampedWidth }));
          setPosition(p => ({ ...p, x: p.x - widthDiff }));
        }
        if (resizeDir === 'right') {
          const newWidth = e.clientX - position.x;
          const clampedWidth = Math.max(320, Math.min(500, newWidth));
          setSize(s => ({ ...s, width: clampedWidth }));
        }
        if (resizeDir === 'top') {
          const newHeight = (position.y + size.height) - e.clientY;
          const clampedHeight = Math.max(100, Math.min(200, newHeight));
          const heightDiff = clampedHeight - size.height;
          setSize(s => ({ ...s, height: clampedHeight }));
          setPosition(p => ({ ...p, y: p.y - heightDiff }));
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDir(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, position, size, resizeDir]);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && duration) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  if (!isVisible || !currentSong) return null;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={playNext}
      />
      
      <div
        ref={playerRef}
        className="fixed z-50 bg-background/95 backdrop-blur-lg border rounded-2xl shadow-2xl cursor-move select-none"
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height
        }}
      >
        {/* Resize handles */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/20 rounded-l-2xl"
          onMouseDown={(e) => handleResizeStart(e, 'left')}
        />
        <div 
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/20 rounded-r-2xl"
          onMouseDown={(e) => handleResizeStart(e, 'right')}
        />
        <div 
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/20 rounded-t-2xl"
          onMouseDown={(e) => handleResizeStart(e, 'top')}
        />

        {/* Drag handle */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing z-10"
          onMouseDown={handleMouseDown}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 z-10"
          onClick={() => {
            setIsPlaying(false);
            setCurrentSong(null);
          }}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="p-4 pt-8 h-full flex flex-col">
          {/* Song info row */}
          <div className="flex items-center gap-3 mb-2">
            <LazyImage
              src={currentSong.image?.[1]?.url || currentSong.image?.[0]?.url}
              alt={currentSong.name}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{currentSong.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {currentSong.artists?.primary?.map(a => a.name).join(", ")}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[duration ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playPrevious}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="default" size="icon" className="h-10 w-10 rounded-full" onClick={() => setIsPlaying(!isPlaying)}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={playNext}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMuted(!isMuted)}>
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={(v) => setVolume(v[0])}
                max={100}
                className="w-16"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlobalFloatingPlayer;
