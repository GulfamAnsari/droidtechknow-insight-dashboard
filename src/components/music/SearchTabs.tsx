import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Play, Heart, Download, X, Loader2 } from "lucide-react";
import { Song } from "@/services/musicApi";
import LazyImage from "@/components/ui/lazy-image";
import { useMusicContext } from "@/contexts/MusicContext";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";

interface SearchTabsProps {
  searchResults: {
    songs: Song[];
    albums: any[];
    artists: any[];
    playlists: any[];
  };
  onPlaySong: (song: Song) => void;
  onNavigateToContent: (
    type: "album" | "artist" | "playlist",
    item: any
  ) => void;
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
  isPlaying
}: SearchTabsProps) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const {
    toggleLike,
    likedSongs,
    downloadProgress,
    offlineSongs,
    setDownloadProgress,
    addToOffline
  } = useMusicContext();

  const isOffline = (songId: string) => {
    return offlineSongs.some((song) => song.id === songId);
  };

  const { toast } = useToast();
  const downloadSong = async (song: Song) => {
    try {
      setDownloadProgress(song.id, 10);

      const audioUrl =
        song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
        song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
        song.downloadUrl?.[0]?.url;

      if (!audioUrl) {
        setDownloadProgress(song.id, -1);
        return;
      }

      const secureAudioUrl = audioUrl.replace(/^http:\/\//i, "https://");

      // Download audio with progress tracking
      setDownloadProgress(song.id, 30);
      const audioResponse = await fetch(secureAudioUrl);
      const audioBlob = await audioResponse.blob();

      setDownloadProgress(song.id, 70);

      // Download image
      const imageUrl = song.image?.[0]?.url;
      let imageBlob = null;
      if (imageUrl) {
        const secureImageUrl = imageUrl.replace(/^http:\/\//i, "https://");
        const imageResponse = await fetch(secureImageUrl);
        imageBlob = await imageResponse.blob();
      }

      setDownloadProgress(song.id, 90);

      // Store in IndexedDB
      const request = indexedDB.open("OfflineMusicDB", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("songs")) {
          db.createObjectStore("songs", { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["songs"], "readwrite");
        const store = transaction.objectStore("songs");

        store.put({
          ...song,
          audioBlob: audioBlob,
          imageBlob: imageBlob
        });

        addToOffline(song);
        setDownloadProgress(song.id, 100);
        toast({
          title: "Success",
          description: song?.name + " is downloaded",
          variant: "success"
        });
        setTimeout(() => {
          setDownloadProgress(song.id, 0);
        }, 2000);
      };
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Failed",
        description: song?.name + " failed to download",
        variant: "destructive"
      });
      setDownloadProgress(song.id, -1);
      setTimeout(() => {
        setDownloadProgress(song.id, 0);
      }, 3000);
    }
  };
  const isLiked = (songId: string) => {
    return likedSongs.some((song) => song.id === songId);
  };

  return (
    <Tabs defaultValue="songs" className="w-full mb-6">
      <TabsList className="flex justify-start border-b border-border bg-transparent p-0 gap-4 overflow-x-auto rounded-none">
        <TabsTrigger
          value="songs"
          className="px-4 py-2 text-sm font-medium text-muted-foreground bg-transparent border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:text-primary"
        >
          Songs ({searchResults.songs.length})
        </TabsTrigger>
        <TabsTrigger
          value="albums"
          className="px-4 py-2 text-sm font-medium text-muted-foreground bg-transparent border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:text-primary"
        >
          Albums ({searchResults.albums.length})
        </TabsTrigger>
        <TabsTrigger
          value="artists"
          className="px-4 py-2 text-sm font-medium text-muted-foreground bg-transparent border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:text-primary"
        >
          Artists ({searchResults.artists.length})
        </TabsTrigger>
        <TabsTrigger
          value="playlists"
          className="px-4 py-2 text-sm font-medium text-muted-foreground bg-transparent border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:text-primary"
        >
          Playlists ({searchResults.playlists.length})
        </TabsTrigger>
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
            <span className="text-sm text-muted-foreground w-8">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{song.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {song.artists?.primary?.map((a) => a.name).join(", ") ||
                  "Unknown Artist"}
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
                <Heart
                  className={`h-4 w-4 ${
                    isLiked(song.id) ? "fill-current" : ""
                  }`}
                />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadSong(song);
                }}
                disabled={downloadProgress[song.id] > 0}
              >
                {downloadProgress[song.id] > 0 ? (
                  downloadProgress[song.id] === -1 ? (
                    <X className="h-4 w-4 text-red-500" />
                  ) : downloadProgress[song.id] === 100 ? (
                    <Download className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 min-w-[40px]">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <Progress
                        value={downloadProgress[song.id]}
                        className="w-8 h-1"
                      />
                    </div>
                  )
                ) : isOffline(song.id) ? (
                  <Download className="h-4 w-4 text-green-500" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ))}

        {searchResults.songs.length > 0 &&
          searchResults.songs.length % 20 === 0 && (
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
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {searchResults.albums.map((album) => (
            <div
              key={album.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onNavigateToContent("album", album)}
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
              <p className="text-xs text-muted-foreground truncate">
                {album.primaryArtists}
              </p>
            </div>
          ))}
        </div>

        {searchResults.albums.length > 0 &&
          searchResults.albums.length % 20 === 0 && (
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
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {searchResults.artists.map((artist) => (
            <div
              key={artist.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onNavigateToContent("artist", artist)}
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
              <h3 className="font-medium text-sm truncate text-center">
                {artist.name}
              </h3>
            </div>
          ))}
        </div>

        {searchResults.artists.length > 0 &&
          searchResults.artists.length % 20 === 0 && (
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
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {searchResults.playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onNavigateToContent("playlist", playlist)}
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
              <h3 className="font-medium text-sm truncate">
                {playlist.name || playlist.title}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {playlist.subtitle}
              </p>
            </div>
          ))}
        </div>

        {searchResults.playlists.length > 0 &&
          searchResults.playlists.length % 20 === 0 && (
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
