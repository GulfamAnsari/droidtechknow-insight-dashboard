import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Music as MusicIcon, Download, Maximize, MoreHorizontal, Heart, ArrowLeft } from "lucide-react";
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
  
  // New states for album/artist/playlist view
  const [viewingContent, setViewingContent] = useState<{
    type: 'album' | 'artist' | 'playlist' | null;
    id: string;
    name: string;
    songs: Song[];
  } | null>(null);

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
    const songIndex = playlist.findIndex(s => s.id === song.id);
    setCurrentIndex(songIndex !== -1 ? songIndex : 0);
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

  // New functions for album/artist/playlist handling
  const handlePlayAlbum = async (albumId: string) => {
    setIsLoading(true);
    try {
      const response = await httpClient.get(`https://saavn.dev/api/albums?id=${albumId}`, { skipAuth: true });
      if (response?.data?.songs) {
        const albumSongs = response.data.songs;
        setViewingContent({
          type: 'album',
          id: albumId,
          name: response.data.name || 'Album',
          songs: albumSongs
        });
        setPlaylist(albumSongs);
      }
    } catch (error) {
      console.error('Error fetching album:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayArtist = async (artistId: string) => {
    setIsLoading(true);
    try {
      const response = await httpClient.get(`https://saavn.dev/api/artists/${artistId}/songs`, { skipAuth: true });
      if (response?.data?.songs) {
        const artistSongs = response.data.songs;
        setViewingContent({
          type: 'artist',
          id: artistId,
          name: response.data.name || 'Artist',
          songs: artistSongs
        });
        setPlaylist(artistSongs);
      }
    } catch (error) {
      console.error('Error fetching artist songs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    setIsLoading(true);
    try {
      const response = await httpClient.get(`https://saavn.dev/api/playlists?id=${playlistId}`, { skipAuth: true });
      if (response?.data?.songs) {
        const playlistSongs = response.data.songs;
        setViewingContent({
          type: 'playlist',
          id: playlistId,
          name: response.data.name || 'Playlist',
          songs: playlistSongs
        });
        setPlaylist(playlistSongs);
      }
    } catch (error) {
      console.error('Error fetching playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToSearch = () => {
    setViewingContent(null);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-900/20 to-blue-900/20">
      <SwipeAnimations />
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {viewingContent && (
              <Button onClick={goBackToSearch} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <h1 className="text-3xl font-bold text-foreground">
              {viewingContent ? `${viewingContent.name} - ${viewingContent.type}` : 'Music Player'}
            </h1>
          </div>
          
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
        
        {/* Search Bar - Only show when not viewing content */}
        {!viewingContent && (
          <div className="flex gap-2 max-w-md">
            <Input
              placeholder="Search for songs, artists, albums, playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              style={{ fontSize: '16px' }}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-auto p-6 ${currentSong ? 'pb-24' : 'pb-6'}`}>
        {viewingContent ? (
          <SongList 
            songs={viewingContent.songs}
            onPlaySong={playSong}
            currentSong={currentSong}
            onToggleLike={toggleLike}
            likedSongs={likedSongs}
            isPlaying={isPlaying}
          />
        ) : searchResults.songs.length > 0 || searchResults.albums.length > 0 || searchResults.artists.length > 0 || searchResults.playlists.length > 0 ? (
          <SearchTabs
            searchResults={searchResults}
            onPlaySong={playSong}
            onPlayAlbum={handlePlayAlbum}
            onPlayArtist={handlePlayArtist}
            onPlayPlaylist={handlePlayPlaylist}
            isLoading={isLoading}
            currentSong={currentSong}
            searchQuery={searchQuery}
            onLoadMore={handleLoadMore}
            onToggleLike={toggleLike}
            likedSongs={likedSongs}
            isPlaying={isPlaying}
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
          onPlaySong={playSong}
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
          playlist={playlist}
          setPlaylist={setPlaylist}
        />
      )}
    </div>
  );
};

// New SongList component
const SongList = ({ songs, onPlaySong, currentSong, onToggleLike, likedSongs, isPlaying }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {songs.map((song, index) => (
        <div
          key={song.id}
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            currentSong?.id === song.id
              ? "bg-primary/20 border border-primary/30"
              : "hover:bg-muted/50"
          }`}
          onClick={() => onPlaySong(song)}
        >
          <div className="relative">
            <img
              src={song.image[0]?.url}
              alt={song.name}
              className="w-12 h-12 rounded object-cover"
            />
            {currentSong?.id === song.id && (
              <div className="absolute inset-0 bg-black/30 rounded flex items-center justify-center">
                {isPlaying ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground w-8">{index + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{song.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDuration(song.duration)}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(song.id);
              }}
              className={likedSongs.includes(song.id) ? "text-red-500" : ""}
            >
              <Heart className={`h-4 w-4 ${likedSongs.includes(song.id) ? "fill-current" : ""}`} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Music;
