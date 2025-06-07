
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Heart, Download, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import LazyImage from "@/components/ui/lazy-image";

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

interface SearchResults {
  songs: Song[];
  albums: any[];
  artists: any[];
  playlists: any[];
}

interface SearchTabsProps {
  searchResults: SearchResults;
  onPlaySong: (song: Song) => void;
  onNavigateToContent: (type: 'album' | 'artist' | 'playlist', item: any) => void;
  onNavigateToSearchResults: (type: 'songs' | 'albums' | 'artists' | 'playlists') => void;
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
  onNavigateToContent,
  onNavigateToSearchResults,
  isLoading,
  currentSong,
  searchQuery,
  onLoadMore,
  onToggleLike,
  likedSongs,
  isPlaying
}: SearchTabsProps) => {
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      };
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Tabs defaultValue="songs" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="songs">Songs ({searchResults.songs.length})</TabsTrigger>
        <TabsTrigger value="albums">Albums ({searchResults.albums.length})</TabsTrigger>
        <TabsTrigger value="artists">Artists ({searchResults.artists.length})</TabsTrigger>
        <TabsTrigger value="playlists">Playlists ({searchResults.playlists.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="songs" className="mt-4">
        <div className="space-y-2">
          {searchResults.songs.slice(0, 10).map((song, index) => (
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
                        onToggleLike(song.id);
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
        {searchResults.songs.length > 10 && (
          <Button 
            onClick={() => onNavigateToSearchResults('songs')} 
            className="w-full mt-4"
            variant="outline"
          >
            View All Songs ({searchResults.songs.length})
          </Button>
        )}
      </TabsContent>

      <TabsContent value="albums" className="mt-4">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {searchResults.albums.slice(0, 12).map((album) => (
            <Card
              key={album.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => onNavigateToContent('album', album)}
            >
              <CardContent className="p-2">
                <div className="relative mb-2">
                  <LazyImage
                    src={album.image?.[1]?.url || album.image?.[0]?.url}
                    alt={album.name}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-xs truncate">{album.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{album.primaryArtists}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {searchResults.albums.length > 12 && (
          <Button 
            onClick={() => onNavigateToSearchResults('albums')} 
            className="w-full mt-4"
            variant="outline"
          >
            View All Albums ({searchResults.albums.length})
          </Button>
        )}
      </TabsContent>

      <TabsContent value="artists" className="mt-4">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {searchResults.artists.slice(0, 12).map((artist) => (
            <Card
              key={artist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => onNavigateToContent('artist', artist)}
            >
              <CardContent className="p-2">
                <div className="relative mb-2">
                  <LazyImage
                    src={artist.image?.[1]?.url || artist.image?.[0]?.url}
                    alt={artist.name}
                    className="w-full aspect-square rounded-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-xs truncate text-center">{artist.name}</h3>
                <p className="text-xs text-muted-foreground text-center">Artist</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {searchResults.artists.length > 12 && (
          <Button 
            onClick={() => onNavigateToSearchResults('artists')} 
            className="w-full mt-4"
            variant="outline"
          >
            View All Artists ({searchResults.artists.length})
          </Button>
        )}
      </TabsContent>

      <TabsContent value="playlists" className="mt-4">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {searchResults.playlists.slice(0, 12).map((playlist) => (
            <Card
              key={playlist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => onNavigateToContent('playlist', playlist)}
            >
              <CardContent className="p-2">
                <div className="relative mb-2">
                  <LazyImage
                    src={playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                    alt={playlist.name}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-xs truncate">{playlist.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{playlist.subtitle || 'Playlist'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {searchResults.playlists.length > 12 && (
          <Button 
            onClick={() => onNavigateToSearchResults('playlists')} 
            className="w-full mt-4"
            variant="outline"
          >
            View All Playlists ({searchResults.playlists.length})
          </Button>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default SearchTabs;
