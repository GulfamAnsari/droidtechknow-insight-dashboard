
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Play, Heart, Music } from 'lucide-react';
import httpClient from '@/utils/httpClient';
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
}

interface LikedSongsManagerProps {
  onClose: () => void;
  onPlaySong: (song: Song) => void;
  likedSongs: string[];
  onToggleLike: (songId: string) => void;
  currentSong: Song | null;
  isPlaying: boolean;
  setPlaylist: (songs: Song[]) => void;
}

const LikedSongsManager = ({
  onClose,
  onPlaySong,
  likedSongs,
  onToggleLike,
  currentSong,
  isPlaying,
  setPlaylist
}: LikedSongsManagerProps) => {
  const [likedSongsData, setLikedSongsData] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    loadLikedSongs();
  }, []);

  const loadLikedSongs = async () => {
    try {
      setLoading(true);
      const songsData = [];
      
      for (const songId of likedSongs) {
        try {
          const response = await httpClient.get(`https://saavn.dev/api/songs/${songId}`, { skipAuth: true });
          if (response?.data) {
            songsData.push(response.data);
          }
        } catch (error) {
          console.log('Error fetching liked song:', songId);
        }
      }
      
      setLikedSongsData(songsData);
    } catch (error) {
      console.error('Error loading liked songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handlePlaySong = (song: Song) => {
    setPlaylist(likedSongsData);
    onPlaySong(song);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
            <Heart className="h-8 w-8 text-red-500" />
            <div>
              <h2 className="text-lg font-bold">Liked Songs</h2>
              <p className="text-sm text-muted-foreground">{likedSongs.length} songs</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : likedSongsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Heart className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg mb-2">No liked songs yet</p>
              <p className="text-sm">Heart some songs to see them here!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {likedSongsData.map((song, index) => (
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(song.id);
                      }}
                      className="text-red-500"
                    >
                      <Heart className="h-4 w-4 fill-current" />
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

export default LikedSongsManager;
