
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  List,
  Music
} from "lucide-react";
import { Song } from "@/services/musicApi";
import LazyImage from "@/components/ui/lazy-image";

interface FullscreenPlayerDesktopProps {
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
  onPlaySong: (song: Song) => void;
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  onToggleMute: () => void;
  isMuted: boolean;
  suggestedSongs: Song[];
}

const FullscreenPlayerDesktop = ({
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
  volume,
  onVolumeChange,
  onToggleLike,
  likedSongs,
  onToggleMute,
  isMuted,
  suggestedSongs
}: FullscreenPlayerDesktopProps) => {
  const [showPlaylist, setShowPlaylist] = useState(true);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (value: number[]) => {
    if (duration > 0) {
      const newTime = (value[0] / 100) * duration;
      onTimeUpdate(newTime);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex">
      {/* Main Player Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Album Art */}
        <div className="mb-8">
          <LazyImage
            src={song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url}
            alt={song.name}
            className="w-80 h-80 rounded-lg shadow-2xl object-cover"
          />
        </div>

        {/* Song Info */}
        <div className="text-center mb-8 max-w-lg">
          <h1 className="text-3xl font-bold mb-2 truncate">{song.name}</h1>
          <p className="text-xl text-muted-foreground truncate">
            {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-lg mb-4">
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mb-8">
          <Button
            onClick={onToggleShuffle}
            variant="ghost"
            size="icon"
            className={isShuffle ? "text-primary" : ""}
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          <Button onClick={onPrevious} variant="ghost" size="icon">
            <SkipBack className="h-6 w-6" />
          </Button>

          <Button onClick={onPlayPause} size="lg" className="w-16 h-16">
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8" />
            )}
          </Button>

          <Button onClick={onNext} variant="ghost" size="icon">
            <SkipForward className="h-6 w-6" />
          </Button>

          <Button
            onClick={onToggleRepeat}
            variant="ghost"
            size="icon"
            className={isRepeat ? "text-primary" : ""}
          >
            <Repeat className="h-5 w-5" />
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => onToggleLike(song.id)}
            variant="ghost"
            size="icon"
            className={likedSongs.includes(song.id) ? "text-red-500" : ""}
          >
            <Heart className={`h-5 w-5 ${likedSongs.includes(song.id) ? "fill-current" : ""}`} />
          </Button>

          <div className="flex items-center gap-2">
            <Button onClick={onToggleMute} variant="ghost" size="icon">
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={(value) => onVolumeChange(value[0])}
              max={100}
              step={1}
              className="w-24"
            />
          </div>

          <Button
            onClick={() => setShowPlaylist(!showPlaylist)}
            variant="ghost"
            size="icon"
            className={showPlaylist ? "text-primary" : ""}
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Playlist Sidebar */}
      {showPlaylist && (
        <div className="w-96 border-l bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Music className="h-5 w-5" />
              Now Playing ({playlist.length})
            </h2>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2">
              {playlist.map((playlistSong, index) => (
                <div
                  key={playlistSong.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    currentIndex === index
                      ? "bg-primary/20 border border-primary/30"
                      : "hover:bg-background/50"
                  }`}
                  onClick={() => onPlaySong(playlistSong)}
                >
                  <LazyImage
                    src={playlistSong.image?.[0]?.url}
                    alt={playlistSong.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {playlistSong.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {playlistSong.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.floor(playlistSong.duration / 60)}:{(playlistSong.duration % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default FullscreenPlayerDesktop;
