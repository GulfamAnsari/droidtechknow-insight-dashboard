
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Heart, MoreHorizontal, Download, Loader2, X } from "lucide-react";
import { musicApi, Song } from "@/services/musicApi";
import LazyImage from "@/components/ui/lazy-image";
import { useMusicContext } from "@/contexts/MusicContext";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface MusicHomepageProps {
  onPlaySong: (song: Song) => void;
  onNavigateToContent: (
    type: "album" | "artist" | "playlist",
    item: any
  ) => void;
  currentSong: Song | null;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  isPlaying: boolean;
  setPlaylist: (songs: Song[]) => void;
}

const MusicHomepage = ({
  onPlaySong,
  onNavigateToContent,
  currentSong,
  onToggleLike,
  likedSongs,
  isPlaying,
  setPlaylist
}: MusicHomepageProps) => {
  const { 
    likedSongs: likedSongObjects, 
    offlineSongs, 
    downloadProgress, 
    setDownloadProgress, 
    addToOffline,
    toggleLike 
  } = useMusicContext();
  
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);
  const [popularArtists, setPopularArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [usedSongIds, setUsedSongIds] = useState<string[]>([]);

  // Get cached search results from localStorage
  const getCachedSearchResults = (): Song[] => {
    try {
      const cached = localStorage.getItem('musicSearchResults');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error loading cached search results:', error);
      return [];
    }
  };

  useEffect(() => {
    loadHomepageData();
  }, [likedSongObjects]);

  const loadHomepageData = async () => {
    try {
      setLoading(true);

      // Load popular artists
      const artists = await musicApi.getPopularArtists();
      setPopularArtists(artists);

      // Get recommendations from liked songs and cached search results
      await loadRelatedSongs();
    } catch (error) {
      console.error("Error loading homepage data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Persistent cache across multiple calls (per session)
  const artistCallCacheRef = useRef<Set<string>>(new Set());

  const loadRelatedSongs = async () => {
    // Combine liked songs and cached search results for recommendations
    const cachedSearchResults = getCachedSearchResults();
    const basePool = [...likedSongObjects, ...cachedSearchResults, ...relatedSongs];

    const sourceSongs = basePool.filter(
      (song) => !usedSongIds.includes(song.id)
    );

    if (sourceSongs.length === 0) {
      toast.info("No more recommendations available");
      return;
    }

    const randomSongs = getRandomSongs(sourceSongs, 3);
    const newUsedIds: string[] = [...usedSongIds];
    const newRelatedSongs: Song[] = [];

    try {
      const promises = randomSongs.map(async (song) => {
        const primary = song.artists?.primary?.[0];
        if (!primary || artistCallCacheRef.current.has(primary.id)) return [];

        artistCallCacheRef.current.add(primary.id);

        const searchResults = await musicApi.getArtistSongs(primary.id, 0);

        return searchResults.filter(
          (song) =>
            !newUsedIds.includes(song.id) &&
            !likedSongs.includes(song.id) &&
            !newRelatedSongs.some((s) => s.id === song.id)
        );
      });

      const results = await Promise.all(promises);
      const flatResults = results.flat();

      const trulyUniqueSongs = flatResults.filter(
        (song, index, self) => self.findIndex((s) => s.id === song.id) === index
      );

      trulyUniqueSongs.forEach((song) => newUsedIds.push(song.id));
      newRelatedSongs.push(...trulyUniqueSongs);

      setRelatedSongs((prev) => {
        const merged = [...prev, ...newRelatedSongs];
        return merged.filter(
          (song, index, self) =>
            self.findIndex((s) => s.id === song.id) === index
        );
      });

      setUsedSongIds(newUsedIds);
    } catch (error) {
      console.error("Error fetching related songs:", error);
    }
  };

  const getRandomSongs = (songs: Song[], count: number) => {
    const shuffled = [...songs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, songs.length));
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadRelatedSongs();
    setLoadingMore(false);
  };

  const handlePlaySong = (song: Song) => {
    setPlaylist([...relatedSongs]);
    onPlaySong(song);
  };

  const handleToggleLike = (song: Song) => {
    toggleLike(song);
  };

  const downloadSong = async (song: Song) => {
    try {
      setDownloadProgress(song.id, 10);

      const audioUrl =
        song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
        song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
        song.downloadUrl?.[0]?.url;

      if (!audioUrl) {
        setDownloadProgress(song.id, -1);
        toast.error("No download URL available for this song");
        return;
      }

      const secureAudioUrl = audioUrl.replace(/^http:\/\//i, "https://");

      setDownloadProgress(song.id, 30);
      const audioResponse = await fetch(secureAudioUrl);
      const audioBlob = await audioResponse.blob();

      setDownloadProgress(song.id, 70);

      const imageUrl = song.image?.[0]?.url;
      let imageBlob = null;
      if (imageUrl) {
        const secureImageUrl = imageUrl.replace(/^http:\/\//i, "https://");
        const imageResponse = await fetch(secureImageUrl);
        imageBlob = await imageResponse.blob();
      }

      setDownloadProgress(song.id, 90);

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
        toast.success(`${song.name} downloaded successfully`);
        
        setTimeout(() => {
          setDownloadProgress(song.id, 0);
        }, 2000);
      };
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(`Failed to download ${song.name}`);
      setDownloadProgress(song.id, -1);
      setTimeout(() => {
        setDownloadProgress(song.id, 0);
      }, 3000);
    }
  };

  const isOffline = (songId: string) => {
    return offlineSongs.some((song) => song.id === songId);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Related Songs Based on Liked Songs and Search History */}
      <section>
        <h2 className="text-2xl font-bold mb-4">
          {likedSongObjects.length > 0
            ? "Recommended for You"
            : "Trending Songs"}
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-3">
          {relatedSongs.map((song) => (
            <Card
              key={song.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
            >
              <CardContent className="p-4">
                <div className="relative mb-3">
                  <LazyImage
                    src={song.image?.[1]?.url || song.image?.[0]?.url}
                    alt={song.name}
                    className="w-full aspect-square rounded-lg object-cover"
                    onClick={() => handlePlaySong(song)}
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLike(song);
                      }}
                      variant="ghost"
                      size="sm"
                      className={`bg-black/50 hover:bg-black/70 ${
                        likedSongs.includes(song.id)
                          ? "text-red-500"
                          : "text-white"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          likedSongs.includes(song.id) ? "fill-current" : ""
                        }`}
                      />
                    </Button>
                    
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSong(song);
                      }}
                      variant="ghost"
                      size="sm"
                      className="bg-black/50 hover:bg-black/70 text-white"
                      disabled={downloadProgress[song.id] > 0}
                    >
                      {downloadProgress[song.id] > 0 ? (
                        downloadProgress[song.id] === -1 ? (
                          <X className="h-4 w-4 text-red-500" />
                        ) : downloadProgress[song.id] === 100 ? (
                          <Download className="h-4 w-4 text-green-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )
                      ) : isOffline(song.id) ? (
                        <Download className="h-4 w-4 text-green-500" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div onClick={() => handlePlaySong(song)}>
                  <h3 className="font-medium text-sm truncate">{song.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {song.artists?.primary?.map((a) => a.name).join(", ") ||
                      "Unknown Artist"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDuration(song.duration)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More Button */}
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            disabled={loadingMore}
            className="gap-2"
          >
            {loadingMore ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
            Load More Songs
          </Button>
        </div>
      </section>

      {/* Popular Artists */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Popular Artists</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-3">
          {popularArtists.map((artist) => (
            <Card
              key={artist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => onNavigateToContent("artist", artist)}
            >
              <CardContent className="p-2">
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
                <h3 className="font-medium text-xs truncate text-center">
                  {artist.name}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MusicHomepage;
