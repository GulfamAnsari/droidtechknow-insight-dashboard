
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
      const results = await musicApi.search(searchQuery, 0, 20);
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
      const newResults = await musicApi.searchByType(type, searchQuery, nextPage, 20);

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

  const handleNavigateToSongs = (type: 'liked' | 'offline') => {
    const name = type === 'liked' ? 'Liked Songs' : 'Offline Songs';
    setSongsModalData({ 
      type, 
      name,
      image: undefined
    });
    setShowSongsModal(true);
  };

  const handleNavigateToContent = (type: 'album' | 'artist' | 'playlist', item: any) => {
    setSongsModalData({ 
      type, 
      id: item.id, 
      name: item.name || item.title,
      image: item.image?.[1]?.url || item.image?.[0]?.url
    });
    setShowSongsModal(true);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-900/20 to-blue-900/20">
      <SwipeAnimations />
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-4 mb-4">
          {/* Search Bar and Action buttons in one row */}
          <div className="flex items-center gap-2 flex-1">
            {isSearchMode && (
              <Button
                onClick={() => setIsSearchMode(false)}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <div className="flex gap-2 flex-1 max-w-md">
              <Input
                placeholder="Search for songs, artists, albums, playlists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                style={{ fontSize: "16px" }}
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="p-2 space-y-2">
                    <Button
                      onClick={() => handleNavigateToSongs('liked')}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Liked Songs ({likedSongs.length})
                    </Button>
                    <Button
                      onClick={() => handleNavigateToSongs('offline')}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Offline Songs ({offlineSongs.length})
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 overflow-auto p-6 ${currentSong ? "pb-24" : "pb-6"}`}
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
            onToggleLike={toggleLike}
            likedSongs={likedSongs.map(song => song.id)}
            isPlaying={isPlaying}
          />
        ) : (
          <MusicHomepage
            onPlaySong={playSong}
            onNavigateToContent={handleNavigateToContent}
            currentSong={currentSong}
            onToggleLike={toggleLike}
            likedSongs={likedSongs.map(song => song.id)}
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
            const song = playlist.find(s => s.id === songId);
            if (song) toggleLike(song);
          }}
          likedSongs={likedSongs.map(song => song.id)}
          onToggleMute={toggleMute}
          isMuted={isMuted}
          suggestedSongs={[]}
        />
      )}
    </div>
  );
};

export default Music;
