
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Music as MusicIcon, Download, Maximize, MoreHorizontal, Heart } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import httpClient from "@/utils/httpClient";
import AudioPlayer from "@/components/music/AudioPlayer";
import SearchTabs from "@/components/music/SearchTabs";
import FullscreenPlayer from "@/components/music/FullscreenPlayer";
import DownloadManager from "@/components/music/DownloadManager";
import OfflineManager from "@/components/music/OfflineManager";
import SwipeAnimations from "@/components/music/SwipeAnimations";

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

const Music = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showOffline, setShowOffline] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [likedSongs, setLikedSongs] = useState<string[]>(() => {
    const saved = localStorage.getItem('likedSongs');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Search states
  const [searchResults, setSearchResults] = useState<{
    songs: Song[],
    albums: any[],
    artists: any[],
    playlists: any[]
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
  const [suggestedSongs, setSuggestedSongs] = useState<Song[]>([]);

  // Fetch suggestions when liked songs change
  useEffect(() => {
    if (likedSongs.length > 0) {
      fetchSuggestions();
    }
  }, [likedSongs]);

  const fetchSuggestions = async () => {
    const suggestions = [];
    for (const songId of likedSongs.slice(0, 3)) {
      try {
        const response = await httpClient.get(`https://saavn.dev/api/songs/${songId}/suggestions`, { skipAuth: true });
        if (response?.data) {
          suggestions.push(...response.data);
        }
      } catch (error) {
        console.log('Error fetching suggestions for', songId);
      }
    }
    
    const uniqueSuggestions = suggestions.filter((song, index, self) => 
      index === self.findIndex(s => s.id === song.id)
    ).slice(0, 20);
    
    setSuggestedSongs(uniqueSuggestions);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setCurrentPages({ songs: 0, albums: 0, artists: 0, playlists: 0 });
    setSearchResults({ songs: [], albums: [], artists: [], playlists: [] });
    
    try {
      const limit = 20;
      const [songsRes, albumsRes, artistsRes, playlistsRes] = await Promise.all([
        httpClient.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=0`, { skipAuth: true }),
        httpClient.get(`https://saavn.dev/api/search/albums?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=0`, { skipAuth: true }),
        httpClient.get(`https://saavn.dev/api/search/artists?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=0`, { skipAuth: true }),
        httpClient.get(`https://saavn.dev/api/search/playlists?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=0`, { skipAuth: true })
      ]);

      const newResults = {
        songs: songsRes?.data?.results || [],
        albums: albumsRes?.data?.results || [],
        artists: artistsRes?.data?.results || [],
        playlists: playlistsRes?.data?.results || []
      };

      setSearchResults(newResults);
      setPlaylist(newResults.songs);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async (type: 'songs' | 'albums' | 'artists' | 'playlists') => {
    if (isLoading || !searchQuery.trim()) return;
    
    setIsLoading(true);
    const nextPage = currentPages[type] + 1;
    
    try {
      const limit = 20;
      let response;
      
      switch (type) {
        case 'songs':
          response = await httpClient.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${nextPage}`, { skipAuth: true });
          break;
        case 'albums':
          response = await httpClient.get(`https://saavn.dev/api/search/albums?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${nextPage}`, { skipAuth: true });
          break;
        case 'artists':
          response = await httpClient.get(`https://saavn.dev/api/search/artists?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${nextPage}`, { skipAuth: true });
          break;
        case 'playlists':
          response = await httpClient.get(`https://saavn.dev/api/search/playlists?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${nextPage}`, { skipAuth: true });
          break;
      }
      
      const newResults = response?.data?.results || [];
      
      setSearchResults(prev => ({
        ...prev,
        [type]: [...prev[type], ...newResults]
      }));
      
      setCurrentPages(prev => ({
        ...prev,
        [type]: nextPage
      }));
      
      if (type === 'songs') {
        setPlaylist(prev => [...prev, ...newResults]);
      }
    } catch (error) {
      console.error(`Load more ${type} failed:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentIndex(playlist.findIndex(s => s.id === song.id));
    setCurrentTime(0);
    setDuration(song.duration);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (playlist.length > 0) {
      let nextIndex;
      if (isShuffle) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } else {
        nextIndex = (currentIndex + 1) % playlist.length;
      }
      setCurrentIndex(nextIndex);
      setCurrentSong(playlist[nextIndex]);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(playlist[nextIndex].duration);
    }
  };

  const playPrevious = () => {
    if (playlist.length > 0) {
      let prevIndex;
      if (isShuffle) {
        prevIndex = Math.floor(Math.random() * playlist.length);
      } else {
        prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
      }
      setCurrentIndex(prevIndex);
      setCurrentSong(playlist[prevIndex]);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(playlist[prevIndex].duration);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleLike = (songId: string) => {
    const newLikedSongs = likedSongs.includes(songId)
      ? likedSongs.filter(id => id !== songId)
      : [...likedSongs, songId];
    
    setLikedSongs(newLikedSongs);
    localStorage.setItem('likedSongs', JSON.stringify(newLikedSongs));
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleDurationUpdate = (dur: number) => {
    setDuration(dur);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-900/20 to-blue-900/20">
      <SwipeAnimations />
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-foreground">Music Player</h1>
          
          {/* Controls Row */}
          <div className="flex items-center gap-2">
            {/* Desktop Controls */}
            <div className="hidden md:flex gap-2">
              <Button onClick={() => setShowOffline(true)} variant="outline" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                Offline
              </Button>
              <Button onClick={() => setShowDownloads(true)} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Downloads
              </Button>
              {currentSong && (
                <Button onClick={toggleFullscreen} variant="outline" size="sm">
                  <Maximize className="h-4 w-4 mr-2" />
                  Fullscreen
                </Button>
              )}
            </div>

            {/* Mobile Controls */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="space-y-1 p-2 bg-background border z-50">
                  <Button onClick={() => setShowOffline(true)} variant="ghost" size="sm" className="w-full justify-start">
                    <Heart className="h-4 w-4 mr-2" />
                    Offline Songs
                  </Button>
                  <Button onClick={() => setShowDownloads(true)} variant="ghost" size="sm" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Downloads
                  </Button>
                  {currentSong && (
                    <Button onClick={toggleFullscreen} variant="ghost" size="sm" className="w-full justify-start">
                      <Maximize className="h-4 w-4 mr-2" />
                      Fullscreen
                    </Button>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Search for songs, artists, albums, playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            style={{ fontSize: '16px' }} // Prevents zoom on mobile
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-auto p-6 ${currentSong ? 'pb-24' : 'pb-6'}`}>
        {searchResults.songs.length > 0 || searchResults.albums.length > 0 || searchResults.artists.length > 0 || searchResults.playlists.length > 0 ? (
          <SearchTabs
            searchResults={searchResults}
            onPlaySong={(song) => playSong(song)}
            onPlayAlbum={(albumId) => console.log('Play album:', albumId)}
            onPlayArtist={(artistId) => console.log('Play artist:', artistId)}
            onPlayPlaylist={(playlistId) => console.log('Play playlist:', playlistId)}
            isLoading={isLoading}
            currentSong={currentSong}
            searchQuery={searchQuery}
            onLoadMore={handleLoadMore}
            onToggleLike={toggleLike}
            likedSongs={likedSongs}
          />
        ) : (
          <div className="text-center py-12">
            <MusicIcon size={64} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Search for Music</h3>
            <p className="text-muted-foreground">Find your favorite songs, albums, artists, and playlists</p>
          </div>
        )}
      </div>

      {/* Audio Player - Only show when not in fullscreen */}
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
          volume={volume}
          onVolumeChange={setVolume}
          isRepeat={isRepeat}
          isShuffle={isShuffle}
          onToggleRepeat={() => setIsRepeat(!isRepeat)}
          onToggleShuffle={() => setIsShuffle(!isShuffle)}
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
          onPlaySong={(song) => playSong(song)}
          currentTime={currentTime}
          duration={duration}
          onTimeUpdate={handleTimeUpdate}
          onDurationUpdate={handleDurationUpdate}
          volume={volume}
          onVolumeChange={setVolume}
          onToggleLike={toggleLike}
          likedSongs={likedSongs}
          suggestedSongs={suggestedSongs}
        />
      )}

      {/* Download Manager */}
      {showDownloads && (
        <DownloadManager
          onClose={() => setShowDownloads(false)}
          currentSong={currentSong}
          playlist={playlist}
        />
      )}

      {/* Offline Manager */}
      {showOffline && (
        <OfflineManager
          onClose={() => setShowOffline(false)}
          onPlaySong={playSong}
          likedSongs={likedSongs}
          onToggleLike={toggleLike}
        />
      )}
    </div>
  );
};

export default Music;
