import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Music as MusicIcon, FileText, Download, Maximize } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import httpClient from "@/utils/httpClient";
import AudioPlayer from "@/components/music/AudioPlayer";
import SearchTabs from "@/components/music/SearchTabs";
import LyricsView from "@/components/music/LyricsView";
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
  const [showLyrics, setShowLyrics] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  
  // Pagination states - simplified to track just current pages
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
      if (!searchQuery.trim()) return null;
      
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

      // If it's the first page (0), replace all results, otherwise append
      if (currentPages.songs === 0 && currentPages.albums === 0 && currentPages.artists === 0 && currentPages.playlists === 0) {
        setAllResults({
          songs: newSongs,
          albums: newAlbums,
          artists: newArtists,
          playlists: newPlaylists
        });
      } else {
        setAllResults(prev => ({
          songs: currentPages.songs === 0 ? newSongs : [...prev.songs, ...newSongs],
          albums: currentPages.albums === 0 ? newAlbums : [...prev.albums, ...newAlbums],
          artists: currentPages.artists === 0 ? newArtists : [...prev.artists, ...newArtists],
          playlists: currentPages.playlists === 0 ? newPlaylists : [...prev.playlists, ...newPlaylists]
        }));
      }
      
      return {
        songs: { data: { results: allResults.songs.length > 0 ? allResults.songs : newSongs } },
        albums: { data: { results: allResults.albums.length > 0 ? allResults.albums : newAlbums } },
        artists: { data: { results: allResults.artists.length > 0 ? allResults.artists : newArtists } },
        playlists: { data: { results: allResults.playlists.length > 0 ? allResults.playlists : newPlaylists } }
      };
    },
    enabled: false
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
    refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const playSong = (song: Song, songList?: Song[]) => {
    setCurrentSong(song);
    setIsPlaying(true);
    
    if (songList) {
      setPlaylist(songList);
      setCurrentIndex(songList.findIndex(s => s.id === song.id));
    } else if (playlist.length === 0) {
      setPlaylist([song]);
      setCurrentIndex(0);
    }
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

  const showSongLyrics = () => {
    if (currentSong) {
      setShowLyrics(true);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-900/20 to-blue-900/20">
      <SwipeAnimations />
      
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-foreground">Music Player</h1>
          <div className="flex gap-2">
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="lyrics" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Lyrics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            {searchResults ? (
              <SearchTabs
                searchResults={{
                  songs: { data: { results: allResults.songs } },
                  albums: { data: { results: allResults.albums } },
                  artists: { data: { results: allResults.artists } },
                  playlists: { data: { results: allResults.playlists } }
                }}
                onPlaySong={(song) => playSong(song, allResults.songs)}
                onPlayAlbum={(albumId) => console.log('Play album:', albumId)}
                onPlayArtist={(artistId) => console.log('Play artist:', artistId)}
                onPlayPlaylist={(playlistId) => console.log('Play playlist:', playlistId)}
                isLoading={searchLoading}
                currentSong={currentSong}
                searchQuery={searchQuery}
                onLoadMore={handleLoadMore}
              />
            ) : (
              <div className="text-center py-12">
                <MusicIcon size={64} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Search for Music</h3>
                <p className="text-muted-foreground">Find your favorite songs, albums, artists, and playlists</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="lyrics">
            {currentSong ? (
              <Card>
                <CardHeader>
                  <CardTitle>Current Song Lyrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">{currentSong.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentSong.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
                      </p>
                    </div>
                    <Button onClick={showSongLyrics}>
                      View Full Lyrics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12">
                <FileText size={64} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Song Playing</h3>
                <p className="text-muted-foreground">Select a song to view lyrics</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Audio Player */}
      {currentSong && (
        <AudioPlayer
          song={currentSong}
          isPlaying={isPlaying}
          onPlayPause={togglePlayPause}
          onNext={playNext}
          onPrevious={playPrevious}
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
        />
      )}

      {/* Lyrics Modal */}
      {showLyrics && currentSong && (
        <LyricsView
          songName={currentSong.name}
          artistName={currentSong.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
          songId={currentSong.id}
          onClose={() => setShowLyrics(false)}
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
