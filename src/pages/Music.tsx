import { useState, useEffect } from "react";
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
  Settings
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

const Music = () => {
  const [searchQuery, setSearchQuery] = useState("");

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
    deleteAllOfflineSongs
  } = useMusicContext();

  // Search states
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearchMode(true);
    setIsLoading(true);
    setCurrentPages({ songs: 0, albums: 0, artists: 0, playlists: 0 });
    setSearchResults({ songs: [], albums: [], artists: [], playlists: [] });

    try {
      const results = await musicApi.search(searchQuery, 1, 20);
      setSearchResults(results);
      setPlaylist(results.songs);
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
          suggestedSongs={[]}
        />
      )}
    </div>
  );
};

export default Music;
