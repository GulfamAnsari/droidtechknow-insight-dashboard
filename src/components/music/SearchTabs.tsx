
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Play, Heart, Download } from "lucide-react";
import { Song } from "@/services/musicApi";
import LazyImage from "@/components/ui/lazy-image";

interface SearchTabsProps {
  searchResults: {
    songs: Song[];
    albums: any[];
    artists: any[];
    playlists: any[];
  };
  onPlaySong: (song: Song) => void;
  onNavigateToContent: (type: 'album' | 'artist' | 'playlist', item: any) => void;
  isLoading: boolean;
  currentSong: Song | null;
  searchQuery: string;
  onLoadMore: (type: "songs" | "albums" | "artists" | "playlists") => void;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  isPlaying: boolean;
}

const SearchTabs = ({
  searchResults,
  onPlaySong,
  onNavigateToContent,
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
        
        console.log('Song downloaded successfully');
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

      <TabsContent value="songs" className="space-y-2 mt-4">
        {searchResults.songs.map((song, index) => (
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
                  downloadSong(song);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        
        {searchResults.songs.length > 0 && searchResults.songs.length % 20 === 0 && (
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => onLoadMore("songs")} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Loading..." : "Load More Songs"}
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="albums" className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {searchResults.albums.map((album) => (
            <div
              key={album.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onNavigateToContent('album', album)}
            >
              <div className="relative mb-2">
                <LazyImage
                  src={album.image?.[1]?.url || album.image?.[0]?.url}
                  alt={album.name}
                  className="w-full aspect-square rounded-lg object-cover"
                />
                <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="font-medium text-sm truncate">{album.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{album.primaryArtists}</p>
            </div>
          ))}
        </div>
        
        {searchResults.albums.length > 0 && searchResults.albums.length % 20 === 0 && (
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => onLoadMore("albums")} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Loading..." : "Load More Albums"}
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="artists" className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {searchResults.artists.map((artist) => (
            <div
              key={artist.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onNavigateToContent('artist', artist)}
            >
              <div className="relative mb-2">
                <LazyImage
                  src={artist.image?.[1]?.url || artist.image?.[0]?.url}
                  alt={artist.name}
                  className="w-full aspect-square rounded-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="font-medium text-sm truncate text-center">{artist.name}</h3>
            </div>
          ))}
        </div>
        
        {searchResults.artists.length > 0 && searchResults.artists.length % 20 === 0 && (
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => onLoadMore("artists")} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Loading..." : "Load More Artists"}
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="playlists" className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {searchResults.playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onNavigateToContent('playlist', playlist)}
            >
              <div className="relative mb-2">
                <LazyImage
                  src={playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                  alt={playlist.name || playlist.title}
                  className="w-full aspect-square rounded-lg object-cover"
                />
                <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="font-medium text-sm truncate">{playlist.name || playlist.title}</h3>
              <p className="text-xs text-muted-foreground truncate">{playlist.subtitle}</p>
            </div>
          ))}
        </div>
        
        {searchResults.playlists.length > 0 && searchResults.playlists.length % 20 === 0 && (
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => onLoadMore("playlists")} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Loading..." : "Load More Playlists"}
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default SearchTabs;
