
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Play, Heart, Trash2, Music } from 'lucide-react';
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

  useEffect(() => {
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Offline Songs ({offlineSongs.length})
          </CardTitle>
          <div className="flex gap-2">
            {offlineSongs.length > 0 && (
              <Button onClick={playAllOfflineSongs} variant="outline" size="sm">
                <Play className="h-4 w-4 mr-2" />
                Play All
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {offlineSongs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Music className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No offline songs available</p>
              <p className="text-sm">Download songs from the player to listen offline!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {offlineSongs.map((song, index) => (
                <div
                  key={song.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm text-muted-foreground w-8">{index + 1}</span>
                  <LazyImage
                    src={song.image[1]?.url || song.image[0]?.url}
                    alt={song.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{song.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(song.duration)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onToggleLike(song.id)}
                      className={likedSongs.includes(song.id) ? "text-red-500" : ""}
                    >
                      <Heart className={`h-4 w-4 ${likedSongs.includes(song.id) ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => playOfflineSong(song)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteOfflineSong(song.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineManager;
