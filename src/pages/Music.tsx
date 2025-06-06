
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Music as MusicIcon, Download, Maximize, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import httpClient from "@/utils/httpClient";
import AudioPlayer from "@/components/music/AudioPlayer";
import SearchTabs from "@/components/music/SearchTabs";
import FullscreenPlayer from "@/components/music/FullscreenPlayer";
import DownloadManager from "@/components/music/DownloadManager";
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
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(70);
  const [likedSongs, setLikedSongs] = useState<string[]>(() => {
    const saved = localStorage.getItem('likedSongs');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Pagination states
  const [currentPages, setCurrentPages] = useState({
    songs: 0,
    albums: 0,
    artists: 0,
    playlists: 0
  });
  
  // Store all accumulated results
  const [allResults, setAllResults] = useState({
    songs: [] as Song[],
    albums: [] as any[],
    artists: [] as any[],
    playlists: [] as any[]
  });

  // Search for songs, albums, artists, and playlists
  const { data: searchResults, isLoading: searchLoading, refetch } = useQuery({
    queryKey: ['search', searchQuery, currentPages],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        return {
          songs: { data: { results: allResults.songs } },
          albums: { data: { results: allResults.albums } },
          artists: { data: { results: allResults.artists } },
          playlists: { data: { results: allResults.playlists } }
        };
      }
      
      const limit = 20;
      
      const [songsRes, albumsRes, artistsRes, playlistsRes] = await Promise.all([
        httpClient.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${currentPages.songs}`, { skipAuth: true }),
        httpClient.get(`https://saavn.dev/api/search/albums?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${currentPages.albums}`, { skipAuth: true }),
        httpClient.get(`https://saavn.dev/api/search/artists?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${currentPages.artists}`, { skipAuth: true }),
        httpClient.get(`https://saavn.dev/api/search/playlists?query=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${currentPages.playlists}`, { skipAuth: true })
      ]);

      const newSongs = songsRes?.data?.results || [];
      const newAlbums = albumsRes?.data?.results || [];
      const newArtists = artistsRes?.data?.results || [];
      const newPlaylists = playlistsRes?.data?.results || [];

      // Update accumulated results based on page
      const updatedResults = {
        songs: currentPages.songs === 0 ? newSongs : [...allResults.songs, ...newSongs],
        albums: currentPages.albums === 0 ? newAlbums : [...allResults.albums, ...newAlbums],
        artists: currentPages.artists === 0 ? newArtists : [...allResults.artists, ...newArtists],
        playlists: currentPages.playlists === 0 ? newPlaylists : [...allResults.playlists, ...newPlaylists]
      };

      // Update state only after successful API call
      setAllResults(updatedResults);
      
      if (currentPages.songs === 0 && currentPages.albums === 0 && currentPages.artists === 0 && currentPages.playlists === 0) {
        setPlaylist(updatedResults.songs);
      }
      
      return {
        songs: { data: { results: updatedResults.songs } },
        albums: { data: { results: updatedResults.albums } },
        artists: { data: { results: updatedResults.artists } },
        playlists: { data: { results: updatedResults.playlists } }
      };
    },
    enabled: false
  });

  // Get song suggestions based on liked songs
  const { data: suggestedSongs } = useQuery({
    queryKey: ['suggestions', likedSongs],
    queryFn: async () => {
      if (likedSongs.length === 0) return [];
      
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
      
      // Remove duplicates and limit to 20 songs
      const uniqueSuggestions = suggestions.filter((song, index, self) => 
        index === self.findIndex(s => s.id === song.id)
      ).slice(0, 20);
      
      return uniqueSuggestions;
    },
    enabled: likedSongs.length > 0
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Reset everything for new search
      setCurrentPages({ songs: 0, albums: 0, artists: 0, playlists: 0 });
      setAllResults({ songs: [], albums: [], artists: [], playlists: [] });
      refetch();
    }
  };

  const handleLoadMore = (type: 'songs' | 'albums' | 'artists' | 'playlists') => {
    setCurrentPages(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }));
    setTimeout(() => {
      refetch();
    }, 0);
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

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-900/20 to-blue-900/20">
      <SwipeAnimations />
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-foreground">Music Player</h1>
          
          {/* Desktop Controls */}
          <div className="hidden md:flex gap-2">
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
              <DropdownMenuContent align="end" className="space-y-1 p-2">
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
        
        {/* Search Bar */}
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Search for songs, artists, albums, playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={searchLoading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 overflow-auto p-6 ${currentSong ? 'pb-24' : 'pb-6'}`}>
        {searchResults ? (
          <SearchTabs
            searchResults={searchResults}
            onPlaySong={(song) => playSong(song)}
            onPlayAlbum={(albumId) => console.log('Play album:', albumId)}
            onPlayArtist={(artistId) => console.log('Play artist:', artistId)}
            onPlayPlaylist={(playlistId) => console.log('Play playlist:', playlistId)}
            isLoading={searchLoading}
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
          onTimeUpdate={setCurrentTime}
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
          onTimeUpdate={setCurrentTime}
          volume={volume}
          onVolumeChange={setVolume}
          onToggleLike={toggleLike}
          likedSongs={likedSongs}
          suggestedSongs={suggestedSongs || []}
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
    </div>
  );
};

export default Music;
