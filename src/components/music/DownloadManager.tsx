
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download, DownloadCloud } from 'lucide-react';
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

interface DownloadManagerProps {
  onClose: () => void;
  currentSong: Song | null;
  playlist: Song[];
}

const DownloadManager = ({ onClose, currentSong, playlist }: DownloadManagerProps) => {
  const [downloading, setDownloading] = useState<string[]>([]);

  const downloadSong = async (song: Song) => {
    setDownloading(prev => [...prev, song.id]);
    
    try {
      const downloadUrl = song.downloadUrl?.find(url => url.quality === '320kbps')?.url || 
                         song.downloadUrl?.find(url => url.quality === '160kbps')?.url ||
                         song.downloadUrl?.[0]?.url;
      
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${song.name}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloading(prev => prev.filter(id => id !== song.id));
    }
  };

  const downloadAllPlaylist = async () => {
    for (const song of playlist) {
      await downloadSong(song);
      // Add a small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DownloadCloud className="h-5 w-5" />
            Download Manager
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Song Download */}
          {currentSong && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Current Song</h3>
              <div className="flex items-center gap-4">
                <LazyImage
                  src={currentSong.image[1]?.url || currentSong.image[0]?.url}
                  alt={currentSong.name}
                  className="w-16 h-16 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{currentSong.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {currentSong.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
                  </p>
                </div>
                <Button 
                  onClick={() => downloadSong(currentSong)}
                  disabled={downloading.includes(currentSong.id)}
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading.includes(currentSong.id) ? 'Downloading...' : 'Download'}
                </Button>
              </div>
            </div>
          )}

          {/* Playlist Download */}
          {playlist.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Current Playlist ({playlist.length} songs)</h3>
                <Button onClick={downloadAllPlaylist} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </Button>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {playlist.map((song, index) => (
                  <div key={song.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                    <LazyImage
                      src={song.image[0]?.url}
                      alt={song.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium truncate">{song.name}</h5>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
                      </p>
                    </div>
                    <Button 
                      onClick={() => downloadSong(song)}
                      disabled={downloading.includes(song.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!currentSong && playlist.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <DownloadCloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No songs available for download</p>
              <p className="text-sm">Play some music first!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DownloadManager;
