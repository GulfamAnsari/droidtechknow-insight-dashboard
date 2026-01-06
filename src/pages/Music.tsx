import { useState, useEffect, useRef, act } from "react";
import { useSwipeable } from "react-swipeable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Music as MusicIcon,
  Download,
  Heart,
  ArrowLeft,
  Settings,
  List,
  Lightbulb,
  MoreHorizontal,
  Loader2,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { musicApi, Song } from "@/services/musicApi";
import { useMusicContext } from "@/contexts/MusicContext";
import AudioPlayer from "@/components/music/AudioPlayer";
import SearchTabs from "@/components/music/SearchTabs";
import FullscreenPlayer from "@/components/music/FullscreenPlayer";
import SwipeAnimations from "@/components/music/SwipeAnimations";
import MusicHomepage from "@/components/music/MusicHomepage";
import SongsModal from "@/components/music/SongsModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@radix-ui/react-progress";
import SearchSuggestions from "@/components/music/SearchSuggestions";
import FavoriteArtistsModal from "@/components/music/FavoriteArtistsModal";
import RecommendationSettingsModal from "@/components/music/RecommendationSettingsModal";

// Swipeable sidebar component for Now Playing
const SidebarSwipeable = ({ 
  activeTab, 
  setActiveTab, 
  playlist, 
  suggestedSongs,
  children 
}: { 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  playlist: Song[];
  suggestedSongs: Song[];
  children: React.ReactNode;
}) => {
  const handlers = useSwipeable({
    onSwipedLeft: () => setActiveTab("suggestions"),
    onSwipedRight: () => setActiveTab("playlist"),
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  return (
    <div {...handlers} className="w-80 border-l bg-muted/30 flex flex-col mb-6">
      {children}
    </div>
  );
};

const Music = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);
  const [activeTab, setActiveTab] = useState("playlist");
  const [showFavoriteArtists, setShowFavoriteArtists] = useState(false);
  const [showRecommendationSettings, setShowRecommendationSettings] =
    useState(false);

  const {
    currentSong,
    isPlaying,
    playlist,
    currentIndex,
    isFullscreen,
    isSearchMode,
    isRepeat,
    isShuffle,
    currentTime,
    duration,
    volume,
    isMuted,
    likedSongs,
    offlineSongs,
    setIsPlaying,
    setPlaylist,
    setIsRepeat,
    setIsShuffle,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsMuted,
    setIsFullscreen,
    setIsSearchMode,
    setShowSongsModal,
    setSongsModalData,
    playSong,
    playNext,
    playPrevious,
    toggleLike,
    downloadAllSongs,
    deleteAllOfflineSongs,
    setDownloadProgress,
    addToOffline,
    downloadProgress
  } = useMusicContext();

  const [searchResults, setSearchResults] = useState<{
    songs: Song[];
    albums: any[];
    artists: any[];
    playlists: any[];
  }>({
    songs: [],
    albums: [],
    artists: [],
    playlists: []
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPages, setCurrentPages] = useState({
    songs: 0,
    albums: 0,
    artists: 0,
    playlists: 0
  });

  const playlistRef = useRef(null);
  const [suggestedSongs, setSuggestedSongs] = useState<Song[]>([]);

  // Store search results in localStorage for recommendations
  const storeSearchResults = (songs: Song[]) => {
    try {
      const existing = localStorage.getItem("musicSearchResults");
      const existingSongs = existing ? JSON.parse(existing) : [];

      // Combine and remove duplicates
      const combined = [...existingSongs, ...songs];
      const unique = combined.filter(
        (song, index, self) => index === self.findIndex((s) => s.id === song.id)
      );

      // Keep only the latest 50 songs to prevent localStorage from getting too large
      const latest = unique.slice(-50);

      localStorage.setItem("musicSearchResults", JSON.stringify(latest));
    } catch (error) {
      console.error("Error storing search results:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearchMode(true);
    setIsLoading(true);
    setCurrentPages({ songs: 0, albums: 0, artists: 0, playlists: 0 });
    setSearchResults({ songs: [], albums: [], artists: [], playlists: [] });

    try {
      const results = await musicApi.search(searchQuery, 1, 20);
      setSearchResults(results);

      // Store search results for recommendations
      if (results.songs.length > 0) {
        storeSearchResults([results.songs[0]]);
      }

      // Append new search results to existing playlist instead of replacing
      const updatedPlaylist = [...playlist, ...results.songs];
      setPlaylist(updatedPlaylist);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async (
    type: "songs" | "albums" | "artists" | "playlists"
  ) => {
    if (isLoading || !searchQuery.trim()) return;

    setIsLoading(true);
    const nextPage = currentPages[type] + 1;

    try {
      const newResults = await musicApi.searchByType(
        type,
        searchQuery,
        nextPage,
        20
      );

      setSearchResults((prev) => ({
        ...prev,
        [type]: [...prev[type], ...newResults]
      }));

      setCurrentPages((prev) => ({
        ...prev,
        [type]: nextPage
      }));

      if (type === "songs") {
        // Store new search results for recommendations
        storeSearchResults(newResults);

        const updatedSongs = [...playlist, ...newResults];
        setPlaylist(updatedSongs);
      }
    } catch (error) {
      console.error(`Load more ${type} failed:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMoreSongs = async () => {
    if (searchQuery.trim()) {
      const nextPage = currentPages.songs + 1;
      try {
        const newResults = await musicApi.searchByType(
          "songs",
          searchQuery,
          nextPage,
          20
        );

        setSearchResults((prev) => ({
          ...prev,
          songs: [...prev.songs, ...newResults]
        }));

        setCurrentPages((prev) => ({
          ...prev,
          songs: nextPage
        }));

        // Store new search results for recommendations
        storeSearchResults(newResults);

        const updatedSongs = [...playlist, ...newResults];
        setPlaylist(updatedSongs);
      } catch (error) {
        console.error("Load more songs failed:", error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleDurationUpdate = (dur: number) => {
    setDuration(dur);
  };

  const handleNavigateToSongs = (type: "liked" | "offline") => {
    const name = type === "liked" ? "Liked Songs" : "Offline Songs";
    setSongsModalData({
      type,
      name,
      image: undefined
    });
    setShowSongsModal(true);
  };

  const handleNavigateToContent = (
    type: "album" | "artist" | "playlist",
    item: any
  ) => {
    setSongsModalData({
      type,
      id: item.id,
      name: item.name || item.title,
      image: item.image?.[1]?.url || item.image?.[0]?.url
    });
    setShowSongsModal(true);
  };

  const handleToggleLike = (songId: string) => {
    const song =
      playlist.find((s) => s.id === songId) ||
      likedSongs.find((s) => s.id === songId) ||
      offlineSongs.find((s) => s.id === songId);
    if (song) {
      toggleLike(song);
    }
  };

  const handleDownloadAll = async () => {
    if (playlist.length > 0) {
      await downloadAllSongs(playlist);
    }
  };

  const handleSelectSongFromSuggestion = (song: Song) => {
    // Add to playlist
    const updatedPlaylist = [...playlist, song];
    setPlaylist(updatedPlaylist);

    // Play the selected song
    playSong(song);
  };

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setShowSongsModal(false);
        }
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isFullscreen, setIsFullscreen, setShowSongsModal]);

  useEffect(() => {
    if (currentSong && activeTab == "suggestions") {
      musicApi.getSuggestedSongs(currentSong, suggestedSongs).then((songs) => {
        const updatedPlaylist = [...playlist, ...suggestedSongs];

        // Remove duplicates by song.id
        const uniquePlaylist = updatedPlaylist.filter(
          (song, index, self) =>
            index === self.findIndex((s) => s.id === song.id)
        );

        // Set the playlist
        setPlaylist(uniquePlaylist);
        setSuggestedSongs(songs || []);
      });
    }
  }, [currentSong, activeTab]);

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
  const { toast } = useToast();

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

  const isOffline = (songId: string) => {
    return offlineSongs.some((song) => song.id === songId);
  };

  const isLiked = (songId: string) => {
    return likedSongs.some((song) => song.id === songId);
  };

  const actionButton = (playlistSong) => {
    return (
      <div className="flex justify-center gap-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(playlistSong);
          }}
          className={isLiked(playlistSong.id) ? "text-red-500" : ""}
        >
          <Heart
            className={`h-4 w-4 ${
              isLiked(playlistSong.id) ? "fill-current" : ""
            }`}
          />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            downloadSong(playlistSong);
          }}
          disabled={downloadProgress[playlistSong.id] > 0}
        >
          {downloadProgress[playlistSong.id] > 0 ? (
            downloadProgress[playlistSong.id] === -1 ? (
              <X className="h-4 w-4 text-red-500" />
            ) : downloadProgress[playlistSong.id] === 100 ? (
              <Download className="h-4 w-4 text-green-500" />
            ) : (
              <div className="flex flex-col items-center gap-1 min-w-[40px]">
                <Loader2 className="h-3 w-3 animate-spin" />
                <Progress
                  value={downloadProgress[playlistSong.id]}
                  className="w-8 h-1"
                />
              </div>
            )
          ) : isOffline(playlistSong.id) ? (
            <Download className="h-4 w-4 text-green-500" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  };

  // Keyboard shortcuts for mini player (only when not in fullscreen)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts if not typing in an input and not in fullscreen mode
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        isFullscreen
      ) {
        return;
      }

      switch (event.code) {
        case "Space":
          event.preventDefault();
          if (currentSong) {
            setIsPlaying(!isPlaying);
          }
          break;
        case "ArrowRight":
          event.preventDefault();
          if (event.shiftKey && audioRef.current) {
            // Seek forward 10 seconds
            audioRef.current.currentTime = Math.min(
              audioRef.current.currentTime + 10,
              duration
            );
          } else if (currentSong) {
            playNext();
          }
          break;
        case "ArrowLeft":
          event.preventDefault();
          if (event.shiftKey && audioRef.current) {
            // Seek backward 10 seconds
            audioRef.current.currentTime = Math.max(
              audioRef.current.currentTime - 10,
              0
            );
          } else if (currentSong) {
            playPrevious();
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          setVolume(Math.min(volume + 10, 100));
          break;
        case "ArrowDown":
          event.preventDefault();
          setVolume(Math.max(volume - 10, 0));
          break;
        case "KeyM":
          event.preventDefault();
          setIsMuted(!isMuted);
          break;
        case "KeyF":
          event.preventDefault();
          if (currentSong) {
            setIsFullscreen(true);
          }
          break;
        case "Escape":
          event.preventDefault();
          if (isSearchMode) {
            setIsSearchMode(false);
          }
          break;
        case "MediaTrackNext":
          event.preventDefault();
          if (currentSong) {
            playNext();
          }
          break;
        case "MediaTrackPrevious":
          event.preventDefault();
          if (currentSong) {
            playPrevious();
          }
          break;
        case "MediaPlayPause":
          event.preventDefault();
          if (currentSong) {
            setIsPlaying(!isPlaying);
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [
    currentSong, 
    isPlaying, 
    isFullscreen, 
    isSearchMode,
    volume,
    isMuted,
    duration,
    setIsPlaying, 
    playNext, 
    playPrevious,
    setVolume,
    setIsMuted,
    setIsFullscreen,
    setIsSearchMode
  ]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-900/20 to-blue-900/20">
      <SwipeAnimations />
      {/* Header */}
      <div className="pt-4 pr-6 pl-6 border-b bg-background">
        <div className="flex items-center gap-4 mb-4">
          {/* Back Button (optional) */}
          {isSearchMode && (
            <Button
              onClick={() => setIsSearchMode(false)}
              variant="ghost"
              size="icon"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Search Bar with Suggestions */}
          <SearchSuggestions
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSelectSong={handleSelectSongFromSuggestion}
            onSearch={handleSearch}
          />

          {/* Now Playing Toggle for Desktop */}
          {!isMobile && currentSong && !isFullscreen && (
            <Button
              onClick={() => {
                setShowPlaylist(!showPlaylist);
                if (showSuggested) setShowSuggested(false);
              }}
              variant={showPlaylist || isPlaying ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Now Playing
            </Button>
          )}

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => handleNavigateToSongs("liked")}
                className="gap-2"
              >
                <Heart className="h-4 w-4" />
                Liked Songs ({likedSongs.length})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleNavigateToSongs("offline")}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Offline Songs ({offlineSongs.length})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowFavoriteArtists(true)}
                className="gap-2"
              >
                <MusicIcon className="h-4 w-4" />
                Favorite Artists
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowRecommendationSettings(true)}
                className="gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                Recommendation Settings
              </DropdownMenuItem>
              {playlist.length > 0 && (
                <DropdownMenuItem onClick={handleDownloadAll} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download All ({playlist.length})
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`bg-background flex-1 overflow-auto p-6 ${
            currentSong ? "pb-24" : "pb-6"
          }`}
        >
          {isSearchMode ? (
            <SearchTabs
              searchResults={searchResults}
              onPlaySong={playSong}
              onNavigateToContent={handleNavigateToContent}
              isLoading={isLoading}
              currentSong={currentSong}
              searchQuery={searchQuery}
              onLoadMore={handleLoadMore}
              onToggleLike={handleToggleLike}
              likedSongs={likedSongs.map((song) => song.id)}
              isPlaying={isPlaying}
              currentIndex={currentIndex}
            />
          ) : (
            <MusicHomepage
              onPlaySong={playSong}
              onNavigateToContent={handleNavigateToContent}
              currentSong={currentSong}
              onToggleLike={handleToggleLike}
              likedSongs={likedSongs.map((song) => song.id)}
              isPlaying={isPlaying}
              setPlaylist={setPlaylist}
            />
          )}
        </div>

        {/* Desktop Now Playing Sidebar */}
        {!isMobile && !isFullscreen && currentSong && showPlaylist && (
          <SidebarSwipeable activeTab={activeTab} setActiveTab={setActiveTab} playlist={playlist} suggestedSongs={suggestedSongs}>
            <div className="p-4 border-b">
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
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto mb-16">
              {activeTab === "playlist" ? (
                <div
                  className="p-2"
                  ref={
                    activeTab === "playlist" || activeTab === "suggestions"
                      ? playlistRef
                      : undefined
                  }
                >
                  {playlist.map((playlistSong: Song, index) => (
                    <div
                      key={playlistSong.id}
                      data-song-index={
                        activeTab === "playlist" ? index : undefined
                      }
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        playlistSong?.id === currentSong?.id
                          ? "bg-primary/20 border border-primary/30"
                          : "hover:bg-background/50"
                      }`}
                    >
                      <div
                        className="w-10 h-10 bg-muted rounded flex-shrink-0"
                        onClick={() => playSong(playlistSong)}
                      >
                        <img
                          src={playlistSong.image?.[0]?.url}
                          alt={playlistSong.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => playSong(playlistSong)}
                      >
                        <p className="truncate text-sm font-medium">
                          {playlistSong.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {playlistSong.artists?.primary
                            ?.map((a) => a.name)
                            .join(", ") || "Unknown Artist"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(playlistSong.duration / 60)}:
                        {(playlistSong.duration % 60)
                          .toString()
                          .padStart(2, "0")}
                      </span>
                      {/* Action Buttons */}
                      {actionButton(playlistSong)}
                    </div>
                  ))}
                  <div className="p-3">
                    <Button
                      onClick={handleLoadMoreSongs}
                      variant="outline"
                      className="w-full"
                      size="sm"
                      disabled={!searchQuery.trim()}
                    >
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Load More Songs
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="p-2"
                  ref={
                    activeTab === "playlist" || activeTab === "suggestions"
                      ? playlistRef
                      : undefined
                  }
                >
                  {suggestedSongs.map((suggestedSong, index) => (
                    <div
                      key={suggestedSong.id}
                      data-song-index={
                        activeTab === "suggestions" ? index : undefined
                      }
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        suggestedSong?.id === currentSong?.id
                          ? "bg-primary/20 border border-primary/30"
                          : "hover:bg-background/50"
                      }`}
                    >
                      <div
                        className="w-10 h-10 bg-muted rounded flex-shrink-0"
                        onClick={() => playSong(suggestedSong)}
                      >
                        <img
                          src={suggestedSong.image?.[0]?.url}
                          alt={suggestedSong.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      </div>
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => playSong(suggestedSong)}
                      >
                        <p className="truncate text-sm font-medium">
                          {suggestedSong.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {suggestedSong.artists?.primary
                            ?.map((a) => a.name)
                            .join(", ") || "Unknown Artist"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(suggestedSong.duration / 60)}:
                        {(suggestedSong.duration % 60)
                          .toString()
                          .padStart(2, "0")}
                      </span>
                      {actionButton(suggestedSong)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SidebarSwipeable>
        )}
      </div>

      {/* Modals */}
      <FavoriteArtistsModal
        open={showFavoriteArtists}
        onOpenChange={setShowFavoriteArtists}
      />

      <RecommendationSettingsModal
        open={showRecommendationSettings}
        onOpenChange={setShowRecommendationSettings}
      />

      {/* Songs Modal */}
      <SongsModal />

      {/* Always mounted audio element */}
      <audio
        ref={audioRef}
        src={currentSong?.downloadUrl?.[0]?.url} // or leave src empty, AudioPlayer sets it in effect
        onTimeUpdate={() =>
          handleTimeUpdate(audioRef.current?.currentTime || 0)
        }
        onLoadedMetadata={() =>
          handleDurationUpdate(audioRef.current?.duration || 0)
        }
        onEnded={
          isRepeat
            ? () => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play();
                }
              }
            : playNext
        }
      />

      {/* Mini Player */}
      {currentSong && !isFullscreen && (
        <AudioPlayer
          song={currentSong}
          isPlaying={isPlaying}
          onPlayPause={togglePlayPause}
          onNext={playNext}
          onPrevious={playPrevious}
          currentTime={currentTime}
          duration={duration}
          onTimeUpdate={handleTimeUpdate}
          onDurationUpdate={handleDurationUpdate}
          volume={isMuted ? 0 : volume}
          onVolumeChange={setVolume}
          isRepeat={isRepeat}
          isShuffle={isShuffle}
          onToggleRepeat={() => setIsRepeat(!isRepeat)}
          onToggleShuffle={() => setIsShuffle(!isShuffle)}
          onToggleFullscreen={toggleFullscreen}
          onToggleMute={toggleMute}
          isMuted={isMuted}
          audioRef={audioRef}
        />
      )}
      {/* Fullscreen Player */}
      {isFullscreen && currentSong && (
        <FullscreenPlayer
          song={currentSong}
          isPlaying={isPlaying}
          onPlayPause={togglePlayPause}
          onNext={playNext}
          onPrevious={playPrevious}
          onClose={() => setIsFullscreen(false)}
          isRepeat={isRepeat}
          isShuffle={isShuffle}
          onToggleRepeat={() => setIsRepeat(!isRepeat)}
          onToggleShuffle={() => setIsShuffle(!isShuffle)}
          playlist={playlist}
          currentIndex={currentIndex}
          onPlaySong={playSong}
          currentTime={currentTime}
          duration={duration}
          onTimeUpdate={handleTimeUpdate}
          onDurationUpdate={handleDurationUpdate}
          volume={isMuted ? 0 : volume}
          onVolumeChange={setVolume}
          onToggleLike={(songId: string) => {
            const song = playlist.find((s) => s.id === songId);
            if (song) toggleLike(song);
          }}
          likedSongs={likedSongs.map((song) => song.id)}
          onToggleMute={toggleMute}
          isMuted={isMuted}
          suggestedSongs={suggestedSongs}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          audioRef={audioRef}
        />
      )}
    </div>
  );
};

export default Music;
