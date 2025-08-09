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
  Heart,
  Loader2,
  Maximize2
} from "lucide-react";
import LazyImage from "@/components/ui/lazy-image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusicContext } from "@/contexts/MusicContext";
import { useToast } from "@/hooks/use-toast";
import { Song } from "@/services/musicApi";
import { Progress } from "@/components/ui/progress";

interface FullscreenPlayerTabletProps {
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

const FullscreenPlayerTablet = ({
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
}: FullscreenPlayerTabletProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { downloadProgress, offlineSongs, setDownloadProgress, addToOffline } = useMusicContext();

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const downloadSong = async (song: Song) => {
    try {
      setDownloadProgress(song.id, 10);
      const audioUrl =
        song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
        song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
        song.downloadUrl?.[0]?.url;

      if (!audioUrl) {
        setDownloadProgress(song.id, -1);
        return;
      }

      const secureAudioUrl = audioUrl.replace(/^http:\/\//i, "https://");
      setDownloadProgress(song.id, 30);
      const audioResponse = await fetch(secureAudioUrl);
      const audioBlob = await audioResponse.blob();

      setDownloadProgress(song.id, 70);

      const imageUrl = song.image?.[0]?.url;
      let imageBlob = null;
      if (imageUrl) {
        const secureImageUrl = imageUrl.replace(/^http:\/\//i, "https://");
        const imageResponse = await fetch(secureImageUrl);
        imageBlob = await imageResponse.blob();
      }

      setDownloadProgress(song.id, 90);

      const request = indexedDB.open("OfflineMusicDB", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("songs")) {
          db.createObjectStore("songs", { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["songs"], "readwrite");
        const store = transaction.objectStore("songs");

        store.put({
          ...song,
          audioBlob: audioBlob,
          imageBlob: imageBlob
        });

        addToOffline(song);
        setDownloadProgress(song.id, 100);
        toast({
          title: "Success",
          description: song?.name + " is downloaded",
          variant: "success"
        });
        setTimeout(() => {
          setDownloadProgress(song.id, 0);
        }, 2000);
      };
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Failed",
        description: song?.name + " failed to download",
        variant: "destructive"
      });
      setDownloadProgress(song.id, -1);
      setTimeout(() => {
        setDownloadProgress(song.id, 0);
      }, 3000);
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

  const handleSongClick = (song: Song) => {
    onPlaySong(song);
  };

  const isOffline = (songId: string) => {
    return offlineSongs.some((song) => song.id === songId);
  };

  const renderSongList = (songs: Song[], title: string) => {
    return (
      <div className="space-y-2">
        {songs.map((listSong, index) => (
          <div
            key={listSong.id}
            data-song-index={activeTab === "playlist" ? index : undefined}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
              listSong.id === song.id ? "bg-primary/10 ring-2 ring-primary/20" : ""
            }`}
            onClick={() => handleSongClick(listSong)}
          >
            <div className="relative">
              <LazyImage
                src={listSong.image?.[0]?.url}
                alt={listSong.name}
                className="w-12 h-12 rounded-md object-cover"
              />
              {listSong.id === song.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                  {isPlaying ? (
                    <Pause className="h-4 w-4 text-white" />
                  ) : (
                    <Play className="h-4 w-4 text-white" />
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{listSong.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {listSong.artists?.primary?.map((a) => a.name).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(listSong.id);
                }}
                variant="ghost"
                size="sm"
                className={likedSongs.includes(listSong.id) ? "text-red-500" : ""}
              >
                <Heart
                  className={`h-4 w-4 ${
                    likedSongs.includes(listSong.id) ? "fill-current" : ""
                  }`}
                />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadSong(listSong);
                }}
                disabled={downloadProgress[listSong.id] > 0}
              >
                {downloadProgress[listSong.id] > 0 ? (
                  downloadProgress[listSong.id] === -1 ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : downloadProgress[listSong.id] === 100 ? (
                    <Download className="h-4 w-4 text-green-500" />
                  ) : (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )
                ) : isOffline(listSong.id) ? (
                  <Download className="h-4 w-4 text-green-500" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-50 flex text-white">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Left Panel - Album Art and Controls */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 min-w-0">
        {/* Header */}
        <div className="absolute top-6 right-6">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Album Art */}
        <div className="mb-8">
          <LazyImage
            src={song.image[2]?.url || song.image[1]?.url || song.image[0]?.url}
            alt={song.name}
            className="w-80 h-80 rounded-2xl shadow-2xl object-cover cursor-pointer hover:scale-105 transition-transform"
            onClick={onPlayPause}
          />
        </div>

        {/* Song Info */}
        <div className="text-center mb-8 max-w-md">
          <h1 className="text-3xl font-bold mb-2 truncate">{song.name}</h1>
          <p className="text-xl text-white/80 truncate">
            {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mb-8">
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

        {/* Main Controls */}
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
        <div className="flex flex-col gap-4 w-full max-w-md">
          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onToggleMute}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Volume2 className="h-5 w-5" />
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
              onClick={() => downloadSong(song)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Download className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Playlist */}
      <div className="w-96 bg-black/20 backdrop-blur-sm border-l border-white/10">
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger
                value="playlist"
                className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                Now Playing ({playlist.length})
              </TabsTrigger>
              <TabsTrigger
                value="suggestions"
                className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                Suggested ({suggestedSongs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="playlist" className="mt-4">
              <ScrollArea className="h-[calc(100vh-120px)]">
                {renderSongList(playlist, "Current Playlist")}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="suggestions" className="mt-4">
              <ScrollArea className="h-[calc(100vh-120px)]">
                {renderSongList(suggestedSongs, "Suggested Songs")}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default FullscreenPlayerTablet;