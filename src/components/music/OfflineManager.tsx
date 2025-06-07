import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Play, Heart, Trash2, Music, Trash } from 'lucide-react';
import LazyImage from '@/components/ui/lazy-image';

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
  audioBlob?: Blob;
  cachedImageUrl?: string;
}

interface OfflineManagerProps {
  onClose: () => void;
  onPlaySong: (song: Song) => void;
  likedSongs: string[];
  onToggleLike: (songId: string) => void;
  playlist: Song[];
  setPlaylist: (songs: Song[]) => void;
}

const OfflineManager = ({ 
  onClose, 
  onPlaySong, 
  likedSongs, 
  onToggleLike, 
  playlist, 
  setPlaylist 
}: OfflineManagerProps) => {
  const [offlineSongs, setOfflineSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    loadOfflineSongs();
  }, []);

  const loadOfflineSongs = async () => {
    try {
      const request = indexedDB.open('OfflineMusicDB', 1);
      
      request.onupgradeneeded = function(event) {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = function(event) {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['songs'], 'readonly');
        const store = transaction.objectStore('songs');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = function() {
          setOfflineSongs(getAllRequest.result || []);
          setLoading(false);
        };
      };
      
      request.onerror = function() {
        setLoading(false);
      };
    } catch (error) {
      console.error('Error loading offline songs:', error);
      setLoading(false);
    }
  };

  const deleteOfflineSong = async (songId: string) => {
    try {
      const request = indexedDB.open('OfflineMusicDB', 1);
      
      request.onsuccess = function(event) {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        
        store.delete(songId);
        
        transaction.oncomplete = () => {
          setOfflineSongs(prev => prev.filter(song => song.id !== songId));
        };
      };
    } catch (error) {
      console.error('Error deleting offline song:', error);
    }
  };

  const deleteAllOfflineSongs = async () => {
    try {
      const request = indexedDB.open('OfflineMusicDB', 1);
      
      request.onsuccess = function(event) {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        
        store.clear();
        
        transaction.oncomplete = () => {
          setOfflineSongs([]);
        };
      };
    } catch (error) {
      console.error('Error deleting all offline songs:', error);
    }
  };

  const playOfflineSong = (song: Song) => {
    if (song.audioBlob) {
      const offlineSong = {
        ...song,
        downloadUrl: [{
          quality: '320kbps',
          url: URL.createObjectURL(song.audioBlob)
        }]
      };
      
      // Set the offline playlist
      setPlaylist(offlineSongs.map(s => ({
        ...s,
        downloadUrl: s.audioBlob ? [{
          quality: '320kbps',
          url: URL.createObjectURL(s.audioBlob)
        }] : s.downloadUrl
      })));
      
      onPlaySong(offlineSong);
    }
  };

  const playAllOfflineSongs = () => {
    if (offlineSongs.length > 0) {
      const offlinePlaylist = offlineSongs.map(song => ({
        ...song,
        downloadUrl: song.audioBlob ? [{
          quality: '320kbps',
          url: URL.createObjectURL(song.audioBlob)
        }] : song.downloadUrl
      }));
      
      setPlaylist(offlinePlaylist);
      playOfflineSong(offlineSongs[0]);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <>
        <div
          className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={handleClose}
        />
        <div
          className={`fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 transition-transform duration-300 ${
            isVisible ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ height: '80vh' }}
        >
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Music className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-lg font-bold">Offline Songs</h2>
              <p className="text-sm text-muted-foreground">{offlineSongs.length} songs</p>
            </div>
          </div>
          <div className="flex gap-2">
            {offlineSongs.length > 0 && (
              <>
                <Button onClick={deleteAllOfflineSongs} variant="outline" size="sm" className="text-red-500">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete All
                </Button>
                <Button onClick={playAllOfflineSongs} variant="outline" size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Play All
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {offlineSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Music className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg mb-2">No offline songs available</p>
              <p className="text-sm">Download songs from the player to listen offline!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {offlineSongs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => playOfflineSong(song)}
                >
                  <div className="relative">
                    <LazyImage
                      src={song.cachedImageUrl || song.image?.[0]?.url}
                      alt={song.name}
                      className="w-12 h-12 rounded object-cover"
                    />
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOfflineSong(song.id);
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OfflineManager;
