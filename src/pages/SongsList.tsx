
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Heart, Download, Music, MoreVertical } from 'lucide-react';
import { musicApi, Song } from '@/services/musicApi';
import { useMusicContext } from '@/contexts/MusicContext';
import LazyImage from '@/components/ui/lazy-image';

interface LocationState {
  type: 'album' | 'artist' | 'playlist' | 'liked' | 'offline' | 'search';
  id?: string;
  name: string;
  image?: string;
  query?: string;
  searchType?: 'songs' | 'albums' | 'artists' | 'playlists';
  fromMusicPage?: boolean;
  searchQuery?: string;
  searchResults?: any;
  currentPages?: any;
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadInitialSongs();
  }, []);

  const loadInitialSongs = async () => {
    if (!state) return;
    
    setLoading(true);
    setPage(1);
    let newSongs: Song[] = [];

    try {
      switch (state.type) {
        case 'album':
          if (state.id) {
            newSongs = await musicApi.getAlbumSongs(state.id);
            setHasMore(false);
          }
          break;
        
        case 'artist':
          if (state.id) {
            newSongs = await musicApi.getArtistSongs(state.id, 1);
            setHasMore(newSongs.length >= 50);
          }
          break;
        
        case 'playlist':
          if (state.id) {
            newSongs = await musicApi.getPlaylistSongs(state.id);
            setHasMore(false);
          }
          break;
        
        case 'liked':
          newSongs = likedSongs;
          setHasMore(false);
          break;
        
        case 'offline':
          // Load from IndexedDB
          const request = indexedDB.open('OfflineMusicDB', 1);
          request.onsuccess = function(event) {
            const db = (event.target as IDBOpenDBRequest).result;
            
            if (!db.objectStoreNames.contains('songs')) {
              setSongs([]);
              setLoading(false);
              return;
            }
            
            const transaction = db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = function() {
              setSongs(getAllRequest.result || []);
              setLoading(false);
            };
            
            getAllRequest.onerror = function() {
              setSongs([]);
              setLoading(false);
            };
          };
          
          request.onerror = function() {
            setSongs([]);
            setLoading(false);
          };
          return;
        
        case 'search':
          if (state.query && state.searchType) {
            newSongs = await musicApi.searchByType(state.searchType, state.query, 1);
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

      const secureAudioUrl = audioUrl.replace(/^http:\/\//i, 'https://');
      const audioResponse = await fetch(secureAudioUrl);
      const audioBlob = await audioResponse.blob();
      
      const imageUrl = song.image?.[0]?.url;
      let imageBlob = null;
      if (imageUrl) {
        const secureImageUrl = imageUrl.replace(/^http:\/\//i, 'https://');
        const imageResponse = await fetch(secureImageUrl);
        imageBlob = await imageResponse.blob();
      }

      const request = indexedDB.open('OfflineMusicDB', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        
        store.put({
          ...song,
          audioBlob: audioBlob,
          imageBlob: imageBlob
        });
        
        addToOffline(song);
        console.log('Song downloaded successfully');
      };
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const downloadAllSongs = async () => {
    for (const song of songs) {
      await downloadSong(song);
    }
  };

  const handleBack = () => {
    if (state?.fromMusicPage) {
      navigate('/music', {
        state: {
          fromSongsPage: true,
          searchQuery: state.searchQuery,
          searchResults: state.searchResults,
          currentPages: state.currentPages
        }
      });
    } else {
      navigate(-1);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLiked = (songId: string) => {
    return likedSongs.some(song => song.id === songId);
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
            onClick={handleBack}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {songs.length > 0 && state.type !== 'offline' && (
            <Button
              onClick={downloadAllSongs}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          )}
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
                    src={song.image?.[0]?.url}
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
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(song);
                    }}
                    className={isLiked(song.id) ? "text-red-500" : ""}
                  >
                    <Heart className={`h-4 w-4 ${isLiked(song.id) ? "fill-current" : ""}`} />
                  </Button>
                  
                  {state.type !== 'offline' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSong(song);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
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
