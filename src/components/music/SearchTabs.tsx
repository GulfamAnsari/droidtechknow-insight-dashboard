import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Play, Heart, Download, Pause } from 'lucide-react';
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

interface Album {
  id: string;
  name: string;
  primaryArtists: string;
  image: {
    quality: string;
    url: string;
  }[];
}

interface Artist {
  id: string;
  name: string;
  image: {
    quality: string;
    url: string;
  }[];
}

interface Playlist {
  id: string;
  name: string;
  image: {
    quality: string;
    url: string;
  }[];
}

interface SearchTabsProps {
  searchResults: {
    songs: Song[];
    albums: Album[];
    artists: Artist[];
    playlists: Playlist[];
  };
  onPlaySong: (song: Song) => void;
  onPlayAlbum: (albumId: string) => void;
  onPlayArtist: (artistId: string) => void;
  onPlayPlaylist: (playlistId: string) => void;
  isLoading: boolean;
  currentSong: Song | null;
  searchQuery: string;
  onLoadMore: (type: 'songs' | 'albums' | 'artists' | 'playlists') => void;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  isPlaying: boolean;
}

const SearchTabs = ({
  searchResults,
  onPlaySong,
  onPlayAlbum,
  onPlayArtist,
  onPlayPlaylist,
  isLoading,
  currentSong,
  searchQuery,
  onLoadMore,
  onToggleLike,
  likedSongs,
  isPlaying
}: SearchTabsProps) => {
  const [downloadingStates, setDownloadingStates] = useState<{ [key: string]: boolean }>({});

  const downloadSong = async (song: Song) => {
    setDownloadingStates(prev => ({ ...prev, [song.id]: true }));
    
    try {
      const audioUrl = song.downloadUrl?.find(url => url.quality === '320kbps')?.url || 
                      song.downloadUrl?.find(url => url.quality === '160kbps')?.url ||
                      song.downloadUrl?.[0]?.url;
      const secureDownloadUrl= audioUrl.replace(/^http:\/\//i, 'https://');
      if (!audioUrl) {
        console.error('No audio URL found for song:', song.name);
        return;
      }

      const response = await fetch(secureDownloadUrl);
      const audioBlob = await response.blob();
      
      const request = indexedDB.open('OfflineMusicDB', 1);
      
      request.onupgradeneeded = function(event) {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = function(event) {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        
        const songWithBlob = {
          ...song,
          audioBlob: audioBlob
        };
        
        store.put(songWithBlob);
        
        transaction.oncomplete = () => {
          console.log('Song downloaded successfully:', song.name);
        };
      };
    } catch (error) {
      console.error('Error downloading song:', error);
    } finally {
      setDownloadingStates(prev => ({ ...prev, [song.id]: false }));
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const SongItem = ({ song }: { song: Song }) => (
    <Card className="mb-3 overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <LazyImage
              src={song.image[1]?.url || song.image[0]?.url}
              alt={song.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
            {currentSong?.id === song.id && (
              <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                {isPlaying ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
            )}
          </div>
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
              onClick={() => downloadSong(song)}
              disabled={downloadingStates[song.id]}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => onPlaySong(song)}
              disabled={currentSong?.id === song.id && isPlaying}
            >
              {currentSong?.id === song.id && isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Tabs defaultValue="songs" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/50 rounded-xl p-1 h-12">
        <TabsTrigger 
          value="songs" 
          className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium transition-all duration-200"
        >
          Songs ({searchResults.songs.length})
        </TabsTrigger>
        <TabsTrigger 
          value="albums"
          className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium transition-all duration-200"
        >
          Albums ({searchResults.albums.length})
        </TabsTrigger>
        <TabsTrigger 
          value="artists"
          className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium transition-all duration-200"
        >
          Artists ({searchResults.artists.length})
        </TabsTrigger>
        <TabsTrigger 
          value="playlists"
          className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium transition-all duration-200"
        >
          Playlists ({searchResults.playlists.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="songs" className="space-y-4">
        <div className="space-y-2">
          {searchResults.songs.map((song) => (
            <SongItem key={song.id} song={song} />
          ))}
        </div>
        {searchResults.songs.length > 0 && (
          <div className="text-center">
            <Button 
              onClick={() => onLoadMore('songs')} 
              disabled={isLoading}
              variant="outline"
              className="w-full max-w-xs"
            >
              {isLoading ? 'Loading...' : 'Load More Songs'}
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="albums" className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {searchResults.albums.map((album) => (
            <Card key={album.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => onPlayAlbum(album.id)}>
              <div className="aspect-square">
                <LazyImage
                  src={album.image[1]?.url || album.image[0]?.url}
                  alt={album.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium truncate text-sm">{album.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{album.primaryArtists}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {searchResults.albums.length > 0 && (
          <div className="text-center">
            <Button 
              onClick={() => onLoadMore('albums')} 
              disabled={isLoading}
              variant="outline"
              className="w-full max-w-xs"
            >
              {isLoading ? 'Loading...' : 'Load More Albums'}
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="artists" className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {searchResults.artists.map((artist) => (
            <Card key={artist.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => onPlayArtist(artist.id)}>
              <div className="aspect-square">
                <LazyImage
                  src={artist.image[1]?.url || artist.image[0]?.url}
                  alt={artist.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <CardContent className="p-3 text-center">
                <h3 className="font-medium truncate text-sm">{artist.name}</h3>
                <p className="text-xs text-muted-foreground">Artist</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {searchResults.artists.length > 0 && (
          <div className="text-center">
            <Button 
              onClick={() => onLoadMore('artists')} 
              disabled={isLoading}
              variant="outline"
              className="w-full max-w-xs"
            >
              {isLoading ? 'Loading...' : 'Load More Artists'}
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="playlists" className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {searchResults.playlists.map((playlist) => (
            <Card key={playlist.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => onPlayPlaylist(playlist.id)}>
              <div className="aspect-square">
                <LazyImage
                  src={playlist.image[1]?.url || playlist.image[0]?.url}
                  alt={playlist.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium truncate text-sm">{playlist.name}</h3>
                <p className="text-xs text-muted-foreground">Playlist</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {searchResults.playlists.length > 0 && (
          <div className="text-center">
            <Button 
              onClick={() => onLoadMore('playlists')} 
              disabled={isLoading}
              variant="outline"
              className="w-full max-w-xs"
            >
              {isLoading ? 'Loading...' : 'Load More Playlists'}
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default SearchTabs;
