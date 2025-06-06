import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Heart } from "lucide-react";
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
  onOpenBottomSheet,
  isLoading,
  currentSong,
  searchQuery,
  onLoadMore,
  onToggleLike,
  likedSongs,
  isPlaying
}: SearchTabsProps & { onOpenBottomSheet: (content: any) => void }) => {
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenContent = async (type: 'album' | 'artist' | 'playlist', item: any) => {
    onOpenBottomSheet({
      type,
      id: item.id,
      name: item.name || item.title,
      songs: [],
      image: item.image?.[1]?.url || item.image?.[0]?.url
    });
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
                  className={likedSongs.includes(song.id) ? "text-red-500" : ""}
                >
                  <Heart className={`h-4 w-4 ${likedSongs.includes(song.id) ? "fill-current" : ""}`} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        {!isLoading && searchResults.songs.length > 0 && (
          <Button onClick={() => onLoadMore('songs')} disabled={isLoading} className="w-full">
            Load More Songs
          </Button>
        )}
      </TabsContent>

      <TabsContent value="albums" className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {searchResults.albums.map((album) => (
            <Card
              key={album.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleOpenContent('album', album)}
            >
              <CardContent className="p-3">
                <div className="relative mb-2">
                  <LazyImage
                    src={album.image?.[1]?.url || album.image?.[0]?.url}
                    alt={album.name}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-xs truncate">{album.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{album.primaryArtists}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        {!isLoading && searchResults.albums.length > 0 && (
          <Button onClick={() => onLoadMore('albums')} disabled={isLoading} className="w-full">
            Load More Albums
          </Button>
        )}
      </TabsContent>

      <TabsContent value="artists" className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {searchResults.artists.map((artist) => (
            <Card
              key={artist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleOpenContent('artist', artist)}
            >
              <CardContent className="p-3">
                <div className="relative mb-2">
                  <LazyImage
                    src={artist.image?.[1]?.url || artist.image?.[0]?.url}
                    alt={artist.name}
                    className="w-full aspect-square rounded-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-xs truncate text-center">{artist.name}</h3>
                <p className="text-xs text-muted-foreground text-center">Artist</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        {!isLoading && searchResults.artists.length > 0 && (
          <Button onClick={() => onLoadMore('artists')} disabled={isLoading} className="w-full">
            Load More Artists
          </Button>
        )}
      </TabsContent>

      <TabsContent value="playlists" className="mt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {searchResults.playlists.map((playlist) => (
            <Card
              key={playlist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleOpenContent('playlist', playlist)}
            >
              <CardContent className="p-3">
                <div className="relative mb-2">
                  <LazyImage
                    src={playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                    alt={playlist.name}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-xs truncate">{playlist.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{playlist.subtitle || 'Playlist'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
        {!isLoading && searchResults.playlists.length > 0 && (
          <Button onClick={() => onLoadMore('playlists')} disabled={isLoading} className="w-full">
            Load More Playlists
          </Button>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default SearchTabs;
