import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Repeat,
  Shuffle,
  X,
  Download,
  List
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

interface FullscreenPlayerProps {
  song: Song;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  isRepeat: boolean;
  isShuffle: boolean;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  playlist: Song[];
  currentIndex: number;
  onPlaySong: any;
}

const FullscreenPlayer = ({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onClose,
  isRepeat,
  isShuffle,
  onToggleRepeat,
  onToggleShuffle,
  playlist,
  currentIndex,
  onPlaySong
}: FullscreenPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([70]);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"up" | "down" | null>(
    null
  );
  const [showList, setshowList] = useState(false);
  useEffect(() => {
    if (audioRef.current && song) {
      const audioUrl =
        song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
        song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
        song.downloadUrl?.[0]?.url;

      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.volume = volume[0] / 100;
        if (isPlaying) {
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
      audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  // Auto-scroll to current song
  useEffect(() => {
    if (playlistRef.current && playlist.length > 0) {
      const currentSongElement = playlistRef.current.querySelector(
        `[data-song-index="${currentIndex}"]`
      );
      if (currentSongElement) {
        currentSongElement.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }
  }, [currentIndex, playlist]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && song) {
      const newTime = (value[0] / 100) * song.duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // Check if it's a vertical swipe (more vertical than horizontal)
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
      setIsSwipeAnimating(true);
      if (deltaY < 0) {
        // Swipe up - next song
        setSwipeDirection("up");
        setTimeout(() => {
          onNext();
          setIsSwipeAnimating(false);
          setSwipeDirection(null);
        }, 200);
      } else {
        // Swipe down - previous song
        setSwipeDirection("down");
        setTimeout(() => {
          onPrevious();
          setIsSwipeAnimating(false);
          setSwipeDirection(null);
        }, 200);
      }
    }

    setTouchStart(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const downloadSong = () => {
    const downloadUrl =
      song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
      song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
      song.downloadUrl?.[0]?.url;

    if (downloadUrl) {
      fetch(downloadUrl)
        .then((response) => response.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${song.name}.mp3`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch(() => {
          // Fallback to direct link method
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = `${song.name}.mp3`;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    }
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

  const handleSongClick = (song) => {
    // This would need to be passed from parent component
    // For now, we'll just play/pause if it's the current song
    onPlaySong(song);
  };

  const getPlaylist = (playlist) => {
    return (
      playlist.length > 1 && (
        <div className="flex-1 max-w-md ml-8">
          <h3 className="text-xl font-bold mb-4 text-center">Playlist</h3>
          <div
            ref={playlistRef}
            className=" overflow-y-auto bg-black/20 rounded-lg p-4 space-y-2"
            style={{ height: '90vh'}}
          >
            {playlist.map((playlistSong, index) => (
              <div
                key={playlistSong.id}
                data-song-index={index}
                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                  index === currentIndex
                    ? "bg-white/20 border border-white/30"
                    : "hover:bg-white/10"
                }`}
                onClick={() => handleSongClick(playlistSong)}
              >
                <LazyImage
                  src={playlistSong.image[0]?.url}
                  alt={playlistSong.name}
                  className="w-10 h-10 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {playlistSong.name}
                  </p>
                  <p className="truncate text-xs text-white/60">
                    {playlistSong.artists?.primary
                      ?.map((a) => a.name)
                      .join(", ")}
                  </p>
                </div>
                {index === currentIndex && (
                  <div className="text-primary">
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    );
  };

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-50 flex flex-col items-center justify-center text-white transition-transform duration-200 ${
        isSwipeAnimating
          ? swipeDirection === "up"
            ? "animate-slide-up"
            : "animate-slide-down"
          : ""
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />

      <Button
        onClick={() => setshowList(!showList)}
        variant="ghost"
        size="sm"
        className="absolute top-4 right-12 text-white hover:bg-white/20"
      >
        <List className="h-6 w-6" />
      </Button>

      {/* Close button */}
      <Button
        onClick={onClose}
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Swipe instructions */}
      <div className="absolute top-4 left-4 text-sm text-white/60">
        Swipe up/down to change songs
      </div>

      {/* Main Content Container */}
      <div className="flex-1 flex items-center justify-center w-full max-w-6xl px-4">
        {/* Left Side - Album Art and Controls */}
        {showList ? (
          getPlaylist(playlist)
        ) : (
          <div className="flex-1 flex flex-col items-center">
            {/* Album Art */}
            <div className="mb-8" onClick={onPlayPause}>
              <LazyImage
                src={
                  song.image[2]?.url || song.image[1]?.url || song.image[0]?.url
                }
                alt={song.name}
                className="w-80 h-80 rounded-2xl shadow-2xl object-cover cursor-pointer hover:scale-105 transition-transform"
              />
            </div>

            {/* Song Info */}
            <div className="text-center mb-8 max-w-md">
              <h1 className="text-3xl font-bold mb-2">{song.name}</h1>
              <p className="text-xl text-white/80">
                {song.artists?.primary?.map((a) => a.name).join(", ") ||
                  "Unknown Artist"}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-2xl mb-8">
              <Slider
                value={[
                  song.duration > 0 ? (currentTime / song.duration) * 100 : 0
                ]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-white/60 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(song.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mb-8">
              <Button
                size="lg"
                variant="ghost"
                onClick={onToggleShuffle}
                className={`text-white hover:bg-white/20 ${
                  isShuffle ? "text-primary" : ""
                }`}
              >
                <Shuffle className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={onPrevious}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-8 w-8" />
              </Button>
              <Button
                size="lg"
                onClick={onPlayPause}
                className="bg-white text-black hover:bg-white/90 rounded-full p-4"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8" />
                )}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={onNext}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-8 w-8" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={onToggleRepeat}
                className={`text-white hover:bg-white/20 ${
                  isRepeat ? "text-primary" : ""
                }`}
              >
                <Repeat className="h-6 w-6" />
              </Button>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center gap-8 w-full max-w-2xl">
              {/* Volume */}
              <div className="flex items-center gap-3 flex-1">
                <Volume2 className="h-5 w-5 text-white/60" />
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="flex-1"
                />
              </div>

              {/* Download */}
              <Button
                onClick={downloadSong}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <Download className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullscreenPlayer;
