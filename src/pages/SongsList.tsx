
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Heart, Download, Music, MoreVertical } from 'lucide-react';
import { musicApi, Song } from '@/services/musicApi';
import { useMusicContext } from '@/contexts/MusicContext';
import LazyImage from '@/components/ui/lazy-image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';

interface LocationState {
  type: 'album' | 'artist' | 'playlist' | 'liked' | 'offline' | 'search';
  id?: string;
  name: string;
  image?: string;
  query?: string;
  searchType?: 'songs' | 'albums' | 'artists' | 'playlists';
}

const SongsList = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  
  const {
    currentSong,
    isPlaying,
    likedSongs,
    offlineSongs,
    playSong,
    setPlaylist,
    toggleLike,
    addToOffline
  } = useMusicContext();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadInitialSongs();
  }, []);

  const loadInitialSongs = async () => {
    if (!state) return;
    
    setLoading(true);
    setPage(0);
    let newSongs: Song[] = [];

    try {
      switch (state.type) {
        case 'album':
          if (state.id) {
            newSongs = await musicApi.getAlbumSongs(state.id);
            setHasMore(false); // Albums don't have pagination
          }
          break;
        
        case 'artist':
          if (state.id) {
            newSongs = await musicApi.getArtistSongs(state.id, 0);
            setHasMore(newSongs.length >= 50);
          }
          break;
        
        case 'playlist':
          if (state.id) {
            newSongs = await musicApi.getPlaylistSongs(state.id);
            setHasMore(false); // Playlists don't have pagination
          }
          break;
        
        case 'liked':
          for (const songId of likedSongs) {
            const song = await musicApi.getSong(songId);
            if (song) newSongs.push(song);
          }
          setHasMore(false);
          break;
        
        case 'offline':
          newSongs = offlineSongs;
          setHasMore(false);
          break;
        
        case 'search':
          if (state.query && state.searchType) {
            newSongs = await musicApi.searchByType(state.searchType, state.query, 0);
            setHasMore(newSongs.length >= 20);
          }
          break;
      }

      setSongs(newSongs);
      if (newSongs.length > 0) {
        setPlaylist(newSongs);
      }
    } catch (error) {
      console.error('Error loading songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || !state) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    let newSongs: Song[] = [];

    try {
      switch (state.type) {
        case 'artist':
          if (state.id) {
            newSongs = await musicApi.getArtistSongs(state.id, nextPage);
          }
          break;
        
        case 'search':
          if (state.query && state.searchType) {
            newSongs = await musicApi.searchByType(state.searchType, state.query, nextPage);
          }
          break;
      }

      if (newSongs.length > 0) {
        setSongs(prev => [...prev, ...newSongs]);
        setPage(nextPage);
        setPlaylist([...songs, ...newSongs]);
      }
      
      if (newSongs.length < 20) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more songs:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePlaySong = (song: Song) => {
    playSong(song);
  };

  const downloadSong = async (song: Song) => {
    try {
      const audioUrl = song.downloadUrl?.find(url => url.quality === '320kbps')?.url || 
                      song.downloadUrl?.find(url => url.quality === '160kbps')?.url ||
                      song.downloadUrl?.[0]?.url;
      
      if (!audioUrl) return;

      // Download audio
      const audioResponse = await fetch(audioUrl);
      const audioBlob = await audioResponse.blob();
      
      // Download image
      const imageUrl = song.image[0]?.url;
      let imageBlob = null;
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl);
        imageBlob = await imageResponse.blob();
      }

      // Store in IndexedDB
      const request = indexedDB.open('MusicApp', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['songs', 'images'], 'readwrite');
        
        // Store song
        const songStore = transaction.objectStore('songs');
        songStore.put({
          ...song,
          audioBlob: audioBlob
        });
        
        // Store image
        if (imageBlob) {
          const imageStore = transaction.objectStore('images');
          imageStore.put({
            id: song.id,
            imageBlob: imageBlob
          });
        }
        
        addToOffline(song);
      };
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!state) {
    return (
      <div className="h-full flex items-center justify-center">
        <p>Invalid page state</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-900/20 to-blue-900/20">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-4 mb-4">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          {state.image && (
            <LazyImage
              src={state.image}
              alt={state.name}
              className="w-24 h-24 rounded-lg object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{state.name}</h1>
            <p className="text-muted-foreground">{songs.length} songs</p>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Music className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg mb-2">No songs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((song, index) => (
              <div
                key={song.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  currentSong?.id === song.id
                    ? "bg-primary/20 border border-primary/30"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => handlePlaySong(song)}
              >
                <div className="relative">
                  <LazyImage
                    src={song.image[0]?.url}
                    alt={song.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  {currentSong?.id === song.id && (
                    <div className="absolute inset-0 bg-black/30 rounded flex items-center justify-center">
                      {isPlaying ? (
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      ) : (
                        <Play className="w-3 h-3 text-white" />
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
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(song.id);
                        }}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${likedSongs.includes(song.id) ? "fill-current text-red-500" : ""}`} />
                        {likedSongs.includes(song.id) ? "Unlike" : "Like"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSong(song);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-6">
            <Button 
              onClick={loadMore} 
              disabled={loadingMore}
              variant="outline"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongsList;
