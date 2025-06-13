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
import { ScrollArea } from "@radix-ui/react-scroll-area";

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
  duration: number;
  onTimeUpdate: (time: number) => void;
  onDurationUpdate: (duration: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  suggestedSongs: Song[];
  onToggleMute: () => void;
  isMuted: boolean;
  setActiveTab: (tab: string) => void;
  activeTab: string;
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
  duration,
  onTimeUpdate,
  onDurationUpdate,
  volume,
  onVolumeChange,
  onToggleLike,
  likedSongs,
  suggestedSongs,
  onToggleMute,
  isMuted,
  setActiveTab,
  activeTab
}: FullscreenPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"up" | "down" | null>(
    null
  );
  const [showList, setShowList] = useState(false);

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

  const handleTouchStart = (e: React.TouchEvent, onImage: boolean = false) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent, onImage: boolean = false) => {
    if (!touchStart || !onImage) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // Check if it's a vertical swipe on the image (more vertical than horizontal)
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

  const saveToIndexedDB = async (song: Song) => {
    try {
      const request = indexedDB.open("OfflineMusicDB", 1);

      request.onupgradeneeded = function (event) {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("songs")) {
          db.createObjectStore("songs", { keyPath: "id" });
        }
      };

      request.onsuccess = async function (event) {
        const db = (event.target as IDBOpenDBRequest).result;

        const downloadUrl =
          song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
          song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
          song.downloadUrl?.[0]?.url;
        const secureDownloadUrl = downloadUrl.replace(
          /^http:\/\//i,
          "https://"
        );
        if (downloadUrl) {
          const response = await fetch(secureDownloadUrl);
          const audioBlob = await response.blob();

          const songData = {
            ...song,
            audioBlob: audioBlob
          };

          const transaction = db.transaction(["songs"], "readwrite");
          const store = transaction.objectStore("songs");
          store.put(songData);

          transaction.oncomplete = () => {
            console.log("Song saved to IndexedDB");
          };
        }
      };
    } catch (error) {
      console.error("Error saving to IndexedDB:", error);
    }
  };

  const downloadSong = () => {
    saveToIndexedDB(song);
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
      <div className="w-full max-w-md">
        <h3 className="text-xl font-bold mb-4 text-center">{title}</h3>
        <div
          ref={activeTab === "playlist" ? playlistRef : undefined}
          className="overflow-y-auto bg-black/20 rounded-lg p-4 space-y-2"
          style={{ height: "60vh" }}
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
                src={listSong.image?.[0]?.url}
                alt={listSong.name}
                className="w-10 h-10 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{listSong.name}</p>
                <p className="truncate text-xs text-white/60">
                  {listSong.artists?.primary?.map((a) => a.name).join(", ")}
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

  return (
    <div
      className={`fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-50 flex flex-col text-white transition-transform duration-200 overflow-hidden ${
        isSwipeAnimating
          ? swipeDirection === "up"
            ? "animate-slide-up"
            : "animate-slide-down"
          : ""
      }`}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Header Controls */}
      <div className="flex items-center justify-between p-4">
        <div className="text-sm text-white/60">
          Swipe up/down on image to change songs
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowList(!showList)}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <List className="h-5 w-5" />
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content Container */}
      <div  className="flex min-h-screen w-full">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center w-full max-w-md pointer-events-auto">
          {/* Album Art */}
          <div
            className="mb-6 md:mb-8"
            onTouchStart={(e) => handleTouchStart(e, true)}
            onTouchEnd={(e) => handleTouchEnd(e, true)}
          >
            <LazyImage
              src={
                song.image[2]?.url || song.image[1]?.url || song.image[0]?.url
              }
              alt={song.name}
              className="w-64 h-64 md:w-80 md:h-80 rounded-2xl shadow-2xl object-cover cursor-pointer hover:scale-105 transition-transform"
              onClick={onPlayPause}
            />
          </div>

          {/* Song Info */}
          <div className="text-center mb-6 md:mb-8 max-w-full px-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 truncate">
              {song.name}
            </h1>
            <p className="text-lg md:text-xl text-white/80 truncate">
              {song.artists?.primary?.map((a) => a.name).join(", ") ||
                "Unknown Artist"}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md mb-6 md:mb-8 px-4">
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-white/60 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8">
            <Button
              size="lg"
              variant="ghost"
              onClick={onToggleShuffle}
              className={`text-white hover:bg-white/20 ${
                isShuffle ? "text-primary" : ""
              }`}
            >
              <Shuffle className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={onPrevious}
              className="text-white hover:bg-white/20"
            >
              <SkipBack className="h-6 w-6 md:h-8 md:w-8" />
            </Button>
            <Button
              size="lg"
              onClick={onPlayPause}
              className="bg-white text-black hover:bg-white/90 rounded-full p-3 md:p-4"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 md:h-8 md:w-8" />
              ) : (
                <Play className="h-6 w-6 md:h-8 md:w-8" />
              )}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={onNext}
              className="text-white hover:bg-white/20"
            >
              <SkipForward className="h-6 w-6 md:h-8 md:w-8" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={onToggleRepeat}
              className={`text-white hover:bg-white/20 ${
                isRepeat ? "text-primary" : ""
              }`}
            >
              <Repeat className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="flex flex-col gap-4 w-full max-w-md px-4">
            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <Button
                onClick={onToggleMute}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                <Volume2 className="h-4 w-4 md:h-5 md:w-5 text-white/60" />
              </Button>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => onToggleLike(song.id)}
                variant="ghost"
                size="sm"
                className={`text-white hover:bg-white/20 ${
                  likedSongs.includes(song.id) ? "text-red-500" : ""
                }`}
              >
                <Heart
                  className={`h-5 w-5 ${
                    likedSongs.includes(song.id) ? "fill-current" : ""
                  }`}
                />
              </Button>

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
        </div>
        </div>
        {showList && (
          <div style={{ height: "fit-content"}} className="w-96 border-l bg-background/80 backdrop-blur-sm ml-auto">
            <div className="p-4 border-b bg-background/50">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="playlist">
                    Now Playing ({playlist.length})
                  </TabsTrigger>
                  <TabsTrigger value="suggestions">
                    Suggested ({suggestedSongs.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="playlist" className="mt-4">
                  <ScrollArea>
                    {renderSongList(playlist, "Current Playlist")}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="suggestions" className="mt-4">
                  <ScrollArea >
                    {renderSongList(suggestedSongs, "Suggested Songs")}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default FullscreenPlayer;
