
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  List,
  Heart
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
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  suggestedSongs: Song[];
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
  onPlaySong,
  currentTime,
  onTimeUpdate,
  volume,
  onVolumeChange,
  onToggleLike,
  likedSongs,
  suggestedSongs
}: FullscreenPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [showList, setShowList] = useState(false);
  const [activeTab, setActiveTab] = useState("playlist");

  useEffect(() => {
    if (audioRef.current && song) {
      const audioUrl =
        song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
        song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
        song.downloadUrl?.[0]?.url;

      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.volume = volume / 100;
        audioRef.current.currentTime = currentTime;
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
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

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
  }, [currentIndex, playlist, showList]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && song) {
      const newTime = (value[0] / 100) * song.duration;
      audioRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    onVolumeChange(value[0]);
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

    // Check if it's a horizontal swipe (more horizontal than vertical)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      setIsSwipeAnimating(true);
      if (deltaX < 0) {
        // Swipe left - next song
        setSwipeDirection("left");
        setTimeout(() => {
          onNext();
          setIsSwipeAnimating(false);
          setSwipeDirection(null);
        }, 200);
      } else {
        // Swipe right - previous song
        setSwipeDirection("right");
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
    onPlaySong(song);
  };

  const renderSongList = (songs: Song[], title: string) => {
    return (
      <div className="flex-1 max-w-md ml-8">
        <h3 className="text-xl font-bold mb-4 text-center">{title}</h3>
        <div
          ref={activeTab === "playlist" ? playlistRef : undefined}
          className="overflow-y-auto bg-black/20 rounded-lg p-4 space-y-2"
          style={{ height: '80vh' }}
        >
          {songs.map((listSong, index) => (
            <div
              key={listSong.id}
              data-song-index={activeTab === "playlist" ? index : undefined}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                listSong.id === song.id
                  ? "bg-white/20 border border-white/30"
                  : "hover:bg-white/10"
              }`}
              onClick={() => handleSongClick(listSong)}
            >
              <LazyImage
                src={listSong.image[0]?.url}
                alt={listSong.name}
                className="w-10 h-10 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {listSong.name}
                </p>
                <p className="truncate text-xs text-white/60">
                  {listSong.artists?.primary
                    ?.map((a) => a.name)
                    .join(", ")}
                </p>
              </div>
              {listSong.id === song.id && (
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
    );
  };

  // Calculate positions for prev/next song previews
  const prevSong = playlist[currentIndex - 1] || playlist[playlist.length - 1];
  const nextSong = playlist[currentIndex + 1] || playlist[0];

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-50 flex flex-col items-center justify-center text-white transition-transform duration-200 overflow-hidden ${
        isSwipeAnimating
          ? swipeDirection === "left"
            ? "animate-slide-left"
            : "animate-slide-right"
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
        onClick={() => setShowList(!showList)}
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
        Swipe left/right to change songs
      </div>

      {/* Previous Song Preview (Left) */}
      {prevSong && !showList && (
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-30 scale-75">
          <LazyImage
            src={prevSong.image[1]?.url || prevSong.image[0]?.url}
            alt={prevSong.name}
            className="w-32 h-32 rounded-lg object-cover"
          />
        </div>
      )}

      {/* Next Song Preview (Right) */}
      {nextSong && !showList && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-30 scale-75">
          <LazyImage
            src={nextSong.image[1]?.url || nextSong.image[0]?.url}
            alt={nextSong.name}
            className="w-32 h-32 rounded-lg object-cover"
          />
        </div>
      )}

      {/* Main Content Container */}
      <div className="flex-1 flex items-center justify-center w-full max-w-6xl px-4">
        {/* Left Side - Album Art and Controls */}
        {showList ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 max-w-md ml-8">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="playlist">Playlist</TabsTrigger>
              <TabsTrigger value="suggestions">Suggested</TabsTrigger>
            </TabsList>
            
            <TabsContent value="playlist">
              {renderSongList(playlist, "Current Playlist")}
            </TabsContent>
            
            <TabsContent value="suggestions">
              {renderSongList(suggestedSongs, "Suggested Songs")}
            </TabsContent>
          </Tabs>
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
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1"
                />
              </div>

              {/* Like Button */}
              <Button
                onClick={() => onToggleLike(song.id)}
                variant="ghost"
                size="sm"
                className={`text-white hover:bg-white/20 ${
                  likedSongs.includes(song.id) ? "text-red-500" : ""
                }`}
              >
                <Heart className={`h-5 w-5 ${likedSongs.includes(song.id) ? "fill-current" : ""}`} />
              </Button>

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
