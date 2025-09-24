import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Download,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  List,
  Rewind,
  FastForward,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react";
import LazyImage from "@/components/ui/lazy-image";
import { useSwipeable } from "react-swipeable";
import { useMusicContext } from "@/contexts/MusicContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Song } from "@/services/musicApi";

interface FullscreenPlayerProps {
  song: Song | null;
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
  onPlaySong: (song: Song, index?: number) => void;
  currentTime: number;
  duration: number;
  onTimeUpdate: (time: number) => void;
  onDurationUpdate: (duration: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  onToggleMute: () => void;
  isMuted: boolean;
  suggestedSongs: Song[];
  setActiveTab: (tab: string) => void;
  activeTab: string;
}

const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({
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
  onToggleMute,
  isMuted,
  suggestedSongs,
  setActiveTab,
  activeTab,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const [showList, setShowList] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const { 
    offlineSongs, 
    downloadProgress, 
    likedSongs: contextLikedSongs,
    setDownloadProgress,
    addToOffline 
  } = useMusicContext();
  const isMobile = useIsMobile();

  // Audio effects
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && song) {
      const audioUrl =
        song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
        song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
        song.downloadUrl?.[0]?.url;

      if (audioUrl) {
        audio.src = audioUrl;
        audio.load();
      }
    }
  }, [song]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.play().catch(console.error);
      } else {
        audio.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume / 100;
    }
  }, [volume]);

  // Auto-scroll to current song in playlist
  useEffect(() => {
    if (playlistRef.current && currentIndex >= 0) {
      const songElement = playlistRef.current.children[currentIndex] as HTMLElement;
      if (songElement) {
        songElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex, showList]);

  // Audio event handlers
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      onTimeUpdate(audio.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) {
      onDurationUpdate(audio.duration);
    }
  };

  const handleAudioEnded = () => {
    if (isRepeat) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
    } else {
      onNext();
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (audio && duration) {
      const seekTime = (value[0] / 100) * duration;
      audio.currentTime = seekTime;
      onTimeUpdate(seekTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    onVolumeChange(value[0]);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const fastForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(audio.currentTime + 10, duration);
    }
  };

  const rewind = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(audio.currentTime - 10, 0);
    }
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent, onImage: boolean = false) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent, onImage: boolean = false) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // Check for horizontal swipe left to open suggested songs
    if (!onImage && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0) {
        // Swipe left - show suggested songs
        setActiveTab("suggestions");
        setShowList(true);
      }
    }

    // Check if it's a vertical swipe on the image (more vertical than horizontal)
    if (onImage && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
      if (deltaY < 0) {
        // Swipe up - next song
        onNext();
      } else {
        // Swipe down - previous song
        onPrevious();
      }
    }

    setTouchStart(null);
  };

  // Double tap handler for seeking
  const handleDoubleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      const rect = e.currentTarget.getBoundingClientRect();
      const tapX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const isRightSide = tapX > rect.left + rect.width / 2;
      
      if (isRightSide) {
        fastForward();
      } else {
        rewind();
      }
    }
    setLastTap(now);
  }, [lastTap]);

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: onNext,
    onSwipedRight: onPrevious,
    onSwipedUp: () => setShowList(true),
    onSwipedDown: () => setShowList(false),
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            rewind();
          } else {
            onPrevious();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            fastForward();
          } else {
            onNext();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          onVolumeChange(Math.min(volume + 10, 100));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onVolumeChange(Math.max(volume - 10, 0));
          break;
        case 'KeyM':
          e.preventDefault();
          onToggleMute();
          break;
        case 'KeyL':
          e.preventDefault();
          setShowList(!showList);
          break;
        case 'MediaTrackNext':
          e.preventDefault();
          onNext();
          break;
        case 'MediaTrackPrevious':
          e.preventDefault();
          onPrevious();
          break;
        case 'MediaPlayPause':
          e.preventDefault();
          onPlayPause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [volume, showList, onPlayPause, onNext, onPrevious, onVolumeChange, onToggleMute]);

  // Download song function
  const downloadSong = useCallback(async (song: Song) => {
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

      // Download audio with progress tracking
      setDownloadProgress(song.id, 30);
      const audioResponse = await fetch(secureAudioUrl);
      const audioBlob = await audioResponse.blob();

      setDownloadProgress(song.id, 70);

      // Download image
      const imageUrl = song.image?.[0]?.url;
      let imageBlob = null;
      if (imageUrl) {
        const secureImageUrl = imageUrl.replace(/^http:\/\//i, "https://");
        const imageResponse = await fetch(secureImageUrl);
        imageBlob = await imageResponse.blob();
      }

      setDownloadProgress(song.id, 90);

      // Store in IndexedDB
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
        toast.success(`${song.name} downloaded successfully`);
        setTimeout(() => {
          setDownloadProgress(song.id, 0);
        }, 2000);
      };
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Failed to download ${song.name}`);
      setDownloadProgress(song.id, -1);
      setTimeout(() => {
        setDownloadProgress(song.id, 0);
      }, 3000);
    }
  }, [setDownloadProgress, addToOffline]);

  const isOffline = (songId: string) => {
    return offlineSongs.some((song) => song.id === songId);
  };

  const handleSongClick = (selectedSong: Song) => {
    const index = playlist.findIndex(s => s.id === selectedSong.id);
    onPlaySong(selectedSong, index >= 0 ? index : 0);
  };

  const renderSongList = (songs: Song[], title: string) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-white mb-4 drop-shadow-md">{title}</h3>
      {songs.map((listSong, index) => {
        const isCurrentSong = listSong.id === song?.id;
        const isLiked = likedSongs.includes(listSong.id);
        const isOfflineSong = isOffline(listSong.id);
        const progress = downloadProgress[listSong.id];
        
        return (
          <div
            key={listSong.id}
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 hover-scale ${
              isCurrentSong 
                ? "bg-white/20 border border-white/30 shadow-lg backdrop-blur-sm" 
                : "bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10"
            }`}
            onClick={() => handleSongClick(listSong)}
          >
            <div className="relative">
              <LazyImage
                src={listSong.image?.[2]?.url || listSong.image?.[1]?.url || listSong.image?.[0]?.url}
                alt={listSong.name}
                className="w-12 h-12 rounded-md object-cover"
              />
              {isCurrentSong && isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate drop-shadow-sm">{listSong.name}</p>
              <p className="text-sm text-white/70 truncate drop-shadow-sm">
                {listSong.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike(listSong.id);
                }}
                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/20 hover-scale"
              >
                <Heart
                  className={`h-4 w-4 ${
                    isLiked ? "fill-red-400 text-red-400" : ""
                  }`}
                />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadSong(listSong);
                }}
                disabled={isOfflineSong || !!progress}
                className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/20 hover-scale disabled:opacity-50"
              >
                {isOfflineSong ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : progress ? (
                  progress === -1 ? (
                    <X className="h-4 w-4 text-red-400" />
                  ) : progress === 100 ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs text-white">{Math.round(progress)}%</span>
                    </div>
                  )
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!song) return null;

  const isLiked = likedSongs.includes(song.id);
  const isOfflineSong = isOffline(song.id);
  const progress = downloadProgress[song.id];

  // Mobile Layout
  if (isMobile) {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col overflow-hidden"
        {...swipeHandlers}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-blue-900/80 to-indigo-900/90 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-secondary/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(120,119,198,0.1),transparent_70%)]" />
        
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary/40 rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '3s' }} />
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-secondary/60 rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '4s' }} />
          <div className="absolute top-1/2 left-3/4 w-3 h-3 bg-accent/30 rounded-full animate-ping" style={{ animationDelay: '2s', animationDuration: '5s' }} />
        </div>
        
        {/* Content overlay */}
        <div className="relative z-10 flex flex-col h-full">
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/90 hover:text-white hover:bg-white/10">
            <ChevronDown className="h-6 w-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowList(!showList)}
            className="text-white/90 hover:text-white hover:bg-white/10"
          >
            <List className="h-6 w-6" />
          </Button>
        </div>

        {!showList ? (
          /* Main Player View */
          <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-8">
            {/* Album Art */}
            <div 
              className="relative w-80 h-80 max-w-[90vw] max-h-[40vh] rounded-2xl overflow-hidden shadow-2xl"
              onTouchStart={(e) => { handleTouchStart(e, true); handleDoubleTap(e); }}
              onTouchEnd={(e) => handleTouchEnd(e, true)}
              onClick={handleDoubleTap}
            >
              <LazyImage
                src={song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url}
                alt={song.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Song Info */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">{song.name}</h1>
              <p className="text-lg text-white/80 drop-shadow-md">
                {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full space-y-2">
              <Slider
                value={[duration ? (currentTime / duration) * 100 : 0]}
                onValueChange={handleSeek}
                className="w-full"
                step={0.1}
              />
              <div className="flex justify-between text-sm text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center space-x-6">
              <Button variant="ghost" size="icon" onClick={rewind} className="text-white/90 hover:text-white hover:bg-white/10 hover-scale">
                <Rewind className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onPrevious} className="text-white/90 hover:text-white hover:bg-white/10 hover-scale">
                <SkipBack className="h-6 w-6" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="h-16 w-16 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 hover-scale shadow-2xl"
                onClick={onPlayPause}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8" fill="currentColor" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={onNext} className="text-white/90 hover:text-white hover:bg-white/10 hover-scale">
                <SkipForward className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={fastForward} className="text-white/90 hover:text-white hover:bg-white/10 hover-scale">
                <FastForward className="h-6 w-6" />
              </Button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleShuffle}
                className={`text-white/90 hover:text-white hover:bg-white/10 hover-scale ${isShuffle ? "text-white bg-white/20" : ""}`}
              >
                <Shuffle className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleLike(song.id)}
                  className="text-white/90 hover:text-white hover:bg-white/10 hover-scale"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isLiked ? "fill-red-400 text-red-400" : ""
                    }`}
                  />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => downloadSong(song)}
                  disabled={isOfflineSong || !!progress}
                  className="text-white/90 hover:text-white hover:bg-white/10 hover-scale disabled:opacity-50"
                >
                  {isOfflineSong ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : progress ? (
                    <div className="text-xs text-white">{Math.round(progress)}%</div>
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleRepeat}
                className={`text-white/90 hover:text-white hover:bg-white/10 hover-scale ${isRepeat ? "text-white bg-white/20" : ""}`}
              >
                <Repeat className="h-5 w-5" />
              </Button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center space-x-3 w-full">
              <Button variant="ghost" size="icon" onClick={onToggleMute} className="text-white/90 hover:text-white hover:bg-white/10">
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        ) : (
          /* Playlist View */
          <div className="flex-1 p-4 bg-black/20 backdrop-blur-sm m-4 rounded-2xl border border-white/10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm">
                <TabsTrigger value="playlist" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Queue</TabsTrigger>
                <TabsTrigger value="suggestions" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Suggested</TabsTrigger>
                <TabsTrigger value="liked" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Liked</TabsTrigger>
                <TabsTrigger value="offline" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Offline</TabsTrigger>
              </TabsList>
              
              <div className="mt-4 max-h-[60vh] overflow-y-auto">
                <TabsContent value="playlist" className="space-y-4">
                  {renderSongList(playlist, "Current Queue")}
                </TabsContent>
                
                <TabsContent value="suggestions" className="space-y-4">
                  {renderSongList(suggestedSongs, "Suggested Songs")}
                </TabsContent>
                
                <TabsContent value="liked" className="space-y-4">
                  {renderSongList(contextLikedSongs, "Liked Songs")}
                </TabsContent>
                
                <TabsContent value="offline" className="space-y-4">
                  {renderSongList(offlineSongs, "Offline Songs")}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
        </div>
      </div>
    );
  }

  // Desktop/Tablet Layout
  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 via-purple-900/90 to-blue-900/95" />
      <div className="absolute inset-0 bg-gradient-to-tl from-primary/20 via-transparent to-secondary/15" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_50%)]" />
      
      {/* Animated elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-4 h-4 bg-primary/30 rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '4s' }} />
        <div className="absolute bottom-32 left-32 w-2 h-2 bg-secondary/40 rounded-full animate-ping" style={{ animationDelay: '2s', animationDuration: '6s' }} />
        <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-accent/20 rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '5s' }} />
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10 flex w-full">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Left Panel - Player Controls */}
      <div className="flex-1 flex flex-col p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/90 hover:text-white hover:bg-white/10">
            <ChevronDown className="h-6 w-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowList(!showList)}
            className="text-white/90 hover:text-white hover:bg-white/10"
          >
            <List className="h-6 w-6" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
          {/* Album Art */}
          <div 
            className="relative w-80 h-80 rounded-2xl overflow-hidden shadow-2xl hover-scale ring-2 ring-white/20"
            onDoubleClick={handleDoubleTap}
          >
            <LazyImage
              src={song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url}
              alt={song.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Song Info */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">{song.name}</h1>
            <p className="text-xl text-white/80 drop-shadow-md">
              {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md space-y-4">
            <Slider
              value={[duration ? (currentTime / duration) * 100 : 0]}
              onValueChange={handleSeek}
              className="w-full"
              step={0.1}
            />
            <div className="flex justify-between text-sm text-white/70">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center space-x-6">
            <Button variant="ghost" size="icon" onClick={rewind} className="text-white/90 hover:text-white hover:bg-white/10 hover-scale">
              <Rewind className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onPrevious} className="text-white/90 hover:text-white hover:bg-white/10 hover-scale">
              <SkipBack className="h-6 w-6" />
            </Button>
            <Button
              variant="default"
              size="icon"
              className="h-16 w-16 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30 hover-scale shadow-2xl"
              onClick={onPlayPause}
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" fill="currentColor" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onNext} className="text-white/90 hover:text-white hover:bg-white/10 hover-scale">
              <SkipForward className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={fastForward} className="text-white/90 hover:text-white hover:bg-white/10 hover-scale">
              <FastForward className="h-6 w-6" />
            </Button>
          </div>

          {/* Secondary Controls */}
          <div className="flex items-center justify-between w-full max-w-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleShuffle}
              className={`text-white/90 hover:text-white hover:bg-white/10 hover-scale ${isShuffle ? "text-white bg-white/20" : ""}`}
            >
              <Shuffle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleRepeat}
              className={`text-white/90 hover:text-white hover:bg-white/10 hover-scale ${isRepeat ? "text-white bg-white/20" : ""}`}
            >
              <Repeat className="h-5 w-5" />
            </Button>
          </div>

          {/* Volume and Actions */}
          <div className="flex items-center justify-between w-full max-w-md space-x-4">
            <div className="flex items-center space-x-3 flex-1">
              <Button variant="ghost" size="icon" onClick={onToggleMute} className="text-white/90 hover:text-white hover:bg-white/10">
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleLike(song.id)}
                className="text-white/90 hover:text-white hover:bg-white/10 hover-scale"
              >
                <Heart
                  className={`h-5 w-5 ${
                    isLiked ? "fill-red-400 text-red-400" : ""
                  }`}
                />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => downloadSong(song)}
                disabled={isOfflineSong || !!progress}
                className="text-white/90 hover:text-white hover:bg-white/10 hover-scale disabled:opacity-50"
              >
                {isOfflineSong ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : progress ? (
                  <div className="text-xs text-white">{Math.round(progress)}%</div>
                ) : (
                  <Download className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Playlist */}
      {showList && (
        <div className="w-1/3 bg-black/30 backdrop-blur-md border-l border-white/10 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm">
              <TabsTrigger value="playlist" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Queue</TabsTrigger>
              <TabsTrigger value="suggestions" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Suggested</TabsTrigger>
              <TabsTrigger value="liked" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Liked</TabsTrigger>
              <TabsTrigger value="offline" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Offline</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 h-[calc(100vh-140px)] overflow-y-auto" ref={playlistRef}>
              <TabsContent value="playlist" className="space-y-4">
                {renderSongList(playlist, "Current Queue")}
              </TabsContent>
              
              <TabsContent value="suggestions" className="space-y-4">
                {renderSongList(suggestedSongs, "Suggested Songs")}
              </TabsContent>
              
              <TabsContent value="liked" className="space-y-4">
                {renderSongList(contextLikedSongs, "Liked Songs")}
              </TabsContent>
              
              <TabsContent value="offline" className="space-y-4">
                {renderSongList(offlineSongs, "Offline Songs")}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
      </div>
    </div>
  );
};

export default FullscreenPlayer;