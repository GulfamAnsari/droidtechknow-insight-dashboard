import { useState, useEffect, useRef, act } from "react";
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
  MoreHorizontal
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
import FullscreenPlayerDesktop from "@/components/music/FullscreenPlayerDesktop";
import SwipeAnimations from "@/components/music/SwipeAnimations";
import MusicHomepage from "@/components/music/MusicHomepage";
import SongsModal from "@/components/music/SongsModal";
import { useIsMobile } from "@/hooks/use-mobile";

const Music = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);
  const [activeTab, setActiveTab] = useState("playlist");

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
  const [isLoading, setIsLoading] = useState(false);
  const [currentPages, setCurrentPages] = useState({
    songs: 0,
    albums: 0,
    artists: 0,
    playlists: 0
  });

  const playlistRef = useRef(null);
  const [suggestedSongs, setSuggestedSongs] = useState<Song[]>([])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearchMode(true);
    setIsLoading(true);
    setCurrentPages({ songs: 0, albums: 0, artists: 0, playlists: 0 });
    setSearchResults({ songs: [], albums: [], artists: [], playlists: [] });

    try {
      const results = await musicApi.search(searchQuery, 1, 20);
      setSearchResults(results);
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
    const song = playlist.find((s) => s.id === songId) || 
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
    if (currentSong && activeTab == 'suggestions') {
      musicApi.getSuggestedSongs(currentSong, suggestedSongs).then((songs) => {
        const updatedPlaylist = [...playlist, ...suggestedSongs];

        // Remove duplicates by song.id
        const uniquePlaylist = updatedPlaylist.filter(
          (song, index, self) =>
            index === self.findIndex(s => s.id === song.id)
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

          {/* Search Bar */}
          <div className="flex items-center gap-2 flex-1">
            <Input
              placeholder="Search for songs, artists, albums, playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full text-sm"
            />
            <Button
              onClick={handleSearch}
              size="icon"
              variant="default"
              disabled={isLoading}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>

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
              {playlist.length > 0 && (
                <DropdownMenuItem
                  onClick={handleDownloadAll}
                  className="gap-2"
                >
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
          className={`bg-background flex-1 overflow-auto p-6 ${currentSong ? "pb-24" : "pb-6"}`}
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
          <div className="w-80 border-l bg-muted/30 flex flex-col mb-6">
            <div className="p-4 border-b">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <div className="p-2" ref={activeTab === "playlist" || activeTab === "suggestions" ? playlistRef : undefined}>
                  {playlist.map((playlistSong, index) => (
                    <div
                      key={playlistSong.id}
                      data-song-index={activeTab === "playlist" ? index : undefined}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        playlistSong?.id === currentSong?.id
                          ? "bg-primary/20 border border-primary/30"
                          : "hover:bg-background/50"
                      }`}
                      onClick={() => playSong(playlistSong)}
                    >
                      <div className="w-10 h-10 bg-muted rounded flex-shrink-0">
                        <img
                          src={playlistSong.image?.[0]?.url}
                          alt={playlistSong.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
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
                <div className="p-2" ref={activeTab === "playlist" || activeTab === "suggestions" ? playlistRef : undefined}>
                  {suggestedSongs.map((suggestedSong, index) => (
                    <div
                      key={suggestedSong.id}
                      data-song-index={activeTab === "suggestions" ? index : undefined}
                      onClick={() => playSong(suggestedSong)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        suggestedSong?.id === currentSong?.id
                          ? "bg-primary/20 border border-primary/30"
                          : "hover:bg-background/50"
                      }`}
                    >
                      <div className="w-10 h-10 bg-muted rounded flex-shrink-0">
                        <img
                          src={suggestedSong.image?.[0]?.url}
                          alt={suggestedSong.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {suggestedSong.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {suggestedSong.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(suggestedSong.duration / 60)}:{(suggestedSong.duration % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Songs Modal */}
      <SongsModal />

      {/* Audio Player */}
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
        />
      )}

      {/* Fullscreen Player */}
      {isFullscreen && currentSong && (
        <>
          {isMobile ? (
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
            />
          ) : (
            <FullscreenPlayerDesktop
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
            />
          )}
        </>
      )}
    </div>
  );
};

export default Music;
