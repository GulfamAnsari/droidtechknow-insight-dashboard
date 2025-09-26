import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Heart,
  MoreHorizontal,
  Download,
  Loader2,
  X
} from "lucide-react";
import { musicApi, Song } from "@/services/musicApi";
import LazyImage from "@/components/ui/lazy-image";
import { useMusicContext } from "@/contexts/MusicContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@radix-ui/react-dropdown-menu";
import { weightedPages } from "@/services/constants";

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
  likedSongs,
  setPlaylist
}: MusicHomepageProps) => {
  const {
    likedSongs: likedSongObjects,
    offlineSongs,
    downloadProgress,
    setDownloadProgress,
    addToOffline,
    toggleLike,
    loadLikedSongs
  } = useMusicContext();

  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);
  const [popularArtists, setPopularArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingArtistMore, setloadingArtistMore] = useState(false);
  const [usedSongIds, setUsedSongIds] = useState<string[]>([]);
  const [artistPage, setartistPage] = useState(1);

  // Get cached search results from localStorage
  const getCachedSearchResults = (): Song[] => {
    try {
      const cached = localStorage.getItem("musicSearchResults");
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error("Error loading cached search results:", error);
      return [];
    }
  };

  const getArtistsSongsFromSaved = () => {
    try {
      const artists = JSON.parse(localStorage.getItem('favoriteArtists') || null);
      let songs = [];
      if (artists) {
        for (let i = 0;  i < artists.length; i++) {
          const { id } = artists[i];
          const s = {
            artists: {
              primary: [{ id }]
            }
          }
          songs = [...songs, s];
        }
       
      }
      return songs;
    } catch (error) {
      console.error("Error loading cached search results:", error);
      return [];
    }
  };

  useEffect(() => {
    loadHomepageData();
  }, []);

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

  const artistPageCache = useRef<Set<string>>(new Set());

  const loadRelatedSongs = async () => {
    const savedOptions = JSON.parse(localStorage.getItem('recommendationOptions') || null);

    
    let likedSongs = [];
    let cachedSearchResults = [];
    let favorites = [];
    let basePool = [];

    if (savedOptions?.liked) {
      if (likedSongObjects.length) {
        likedSongs = likedSongObjects;
      } else {
        const res: any = await loadLikedSongs();
        likedSongs = res.songs;
      }
      console.log('likedSongs', likedSongs)
      basePool = [...basePool, ...likedSongs];
    }
    if (savedOptions?.searched) {
      cachedSearchResults = getCachedSearchResults();
      console.log('cachedSearchResults', cachedSearchResults)
      basePool = [...basePool, ...cachedSearchResults];
    }
    if (savedOptions?.favorites)  {
      favorites = getArtistsSongsFromSaved();
      console.log('favorites', favorites)
      basePool = [...basePool, ...favorites];
    }
    console.log(basePool)


    const randomSongs = getRandomSongs(basePool, 3, usedSongIds);
    const newUsedIds: string[] = [
      ...usedSongIds,
      ...randomSongs.map((s) => s.id)
    ];
    const newRelatedSongs: Song[] = [];

    try {
      const promises = randomSongs.map(async (song) => {
        const primary = song.artists?.primary?.[0];
        if (!primary?.id) return [];

        const artistId = primary.id;

        for (let attempt = 0; attempt < 10; attempt++) {
        
          const page =
            weightedPages[Math.floor(Math.random() * weightedPages.length)];
          const cacheKey = `${artistId}:${page}`;

          // Skip only if this page has already returned good songs before
          if (artistPageCache.current.has(cacheKey)) continue;

          const searchResults = await musicApi.getArtistSongs(artistId, page);

          const filtered = searchResults.filter(
            (resultSong) =>
              !newUsedIds.includes(resultSong.id) &&
              !likedSongs.includes(resultSong.id) &&
              !newRelatedSongs.some((s) => {
                return s.id === resultSong.id;
              })
          );

          if (filtered.length > 0) {
            artistPageCache.current.add(cacheKey); // ✅ Cache only after success
            return filtered;
          }

          // Don’t cache if nothing useful found!
        }

        return [];
      });

      const results = await Promise.all(promises);
      const flatResults = results.flat();

      const trulyUniqueSongs = flatResults.filter(
        (song, index, self) => self.findIndex((s) => s.id === song.id) === index
      );

      newRelatedSongs.push(...trulyUniqueSongs);
      newUsedIds.push(...trulyUniqueSongs.map((s) => s.id));

      
      setRelatedSongs((prev) => {
        const merged = [...prev, ...newRelatedSongs].filter((s) => {
          const LAN = ["hindi", "english"];
          return LAN.includes(s.language);
        });
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

  const getRandomSongs = (
    songs: Song[],
    count: number,
    usedSongIds: string[]
  ): Song[] => {
    // Step 1: Try filtering unused songs
    const availableSongs = songs.filter(
      (song) => !usedSongIds.includes(song.id)
    );

    // Step 2: If some are unused, return random from them
    const pool = availableSongs.length > 0 ? availableSongs : songs;

    // Step 3: Shuffle and return up to `count`
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadRelatedSongs();
    setLoadingMore(false);
  };

  const handleArtistLoadMore = async () => {
     setloadingArtistMore(true);
    const artists = await musicApi.getPopularArtists(artistPage + 1);
    setartistPage(artistPage + 1);
    setPopularArtists([...popularArtists, ...artists]);
    setloadingArtistMore(false);
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
    <div className="space-y-4">
      <Tabs defaultValue="recommended" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="likes">Likes</TabsTrigger>
          <TabsTrigger value="offline">Offline</TabsTrigger>
          <TabsTrigger value="artists">Popular Artists</TabsTrigger>
        </TabsList>

        {/* Recommended Tab */}
        <TabsContent value="recommended" className="space-y-4">
          <div className="mt-6">
            {relatedSongs?.length == 0 ? (
              <Card className="cursor-pointer hover:shadow-lg transition-shadow group">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-medium mb-2">Try searching to get started</h3>
                  <p className="text-muted-foreground">
                    Start searching for music to help us build a feed of songs that
                    you'll love.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                  {relatedSongs.map((song) => (
                    <Card
                      key={song.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow group"
                    >
                      <CardContent className="p-2">
                        <div className="relative mb-2">
                          <LazyImage
                            src={song.image?.[1]?.url || song.image?.[0]?.url}
                            alt={song.name}
                            className="w-full aspect-square rounded-lg object-cover"
                            onClick={() => handlePlaySong(song)}
                          />
                          <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play
                              className="h-8 w-8 text-white"
                              onClick={() => handlePlaySong(song)}
                            />
                          </div>

                          <div className="absolute top-2 right-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align="end"
                                className="p-1 bg-black/90 text-white flex flex-row gap-1"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleLike(song);
                                  }}
                                  className={`h-8 w-8 p-1 rounded hover:bg-black/60 flex items-center justify-center ${
                                    likedSongs.includes(song.id) ? "text-red-500" : ""
                                  }`}
                                >
                                  <Heart
                                    className={`h-4 w-4 ${
                                      likedSongs.includes(song.id) ? "fill-current" : ""
                                    }`}
                                  />
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadSong(song);
                                  }}
                                  disabled={downloadProgress[song.id] > 0}
                                  className="h-8 w-8 p-1 rounded hover:bg-black/60 flex items-center justify-center"
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
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
              </>
            )}
          </div>
        </TabsContent>

        {/* Likes Tab */}
        <TabsContent value="likes" className="space-y-4">
          <div className="mt-6">
            {likedSongObjects?.length === 0 ? (
              <Card className="cursor-pointer hover:shadow-lg transition-shadow group">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-medium mb-2">No liked songs yet</h3>
                  <p className="text-muted-foreground">
                    Start liking songs to see them here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                {likedSongObjects.map((song) => (
                  <Card
                    key={song.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow group"
                  >
                    <CardContent className="p-2">
                      <div className="relative mb-2">
                        <LazyImage
                          src={song.image?.[1]?.url || song.image?.[0]?.url}
                          alt={song.name}
                          className="w-full aspect-square rounded-lg object-cover"
                          onClick={() => handlePlaySong(song)}
                        />
                        <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play
                            className="h-8 w-8 text-white"
                            onClick={() => handlePlaySong(song)}
                          />
                        </div>

                        <div className="absolute top-2 right-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="p-1 bg-black/90 text-white flex flex-row gap-1"
                            >
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLike(song);
                                }}
                                className="h-8 w-8 p-1 rounded hover:bg-black/60 flex items-center justify-center text-red-500"
                              >
                                <Heart className="h-4 w-4 fill-current" />
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadSong(song);
                                }}
                                disabled={downloadProgress[song.id] > 0}
                                className="h-8 w-8 p-1 rounded hover:bg-black/60 flex items-center justify-center"
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
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            )}
          </div>
        </TabsContent>

        {/* Offline Tab */}
        <TabsContent value="offline" className="space-y-4">
          <div className="mt-6">
            {offlineSongs?.length === 0 ? (
              <Card className="cursor-pointer hover:shadow-lg transition-shadow group">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-medium mb-2">No offline songs</h3>
                  <p className="text-muted-foreground">
                    Download songs to listen offline.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2">
                {offlineSongs.map((song) => (
                  <Card
                    key={song.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow group"
                  >
                    <CardContent className="p-2">
                      <div className="relative mb-2">
                        <LazyImage
                          src={song.image?.[1]?.url || song.image?.[0]?.url}
                          alt={song.name}
                          className="w-full aspect-square rounded-lg object-cover"
                          onClick={() => handlePlaySong(song)}
                        />
                        <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play
                            className="h-8 w-8 text-white"
                            onClick={() => handlePlaySong(song)}
                          />
                        </div>

                        <div className="absolute top-2 right-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="p-1 bg-black/90 text-white flex flex-row gap-1"
                            >
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleLike(song);
                                }}
                                className={`h-8 w-8 p-1 rounded hover:bg-black/60 flex items-center justify-center ${
                                  likedSongs.includes(song.id) ? "text-red-500" : ""
                                }`}
                              >
                                <Heart
                                  className={`h-4 w-4 ${
                                    likedSongs.includes(song.id) ? "fill-current" : ""
                                  }`}
                                />
                              </DropdownMenuItem>

                              <DropdownMenuItem className="h-8 w-8 p-1 rounded hover:bg-black/60 flex items-center justify-center">
                                <Download className="h-4 w-4 text-green-500" />
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            )}
          </div>
        </TabsContent>

        {/* Popular Artists Tab */}
        <TabsContent value="artists" className="space-y-4">
          <div className="mt-6">
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
            <div className="flex justify-center mt-6 mb-6">
              <Button
                onClick={handleArtistLoadMore}
                variant="outline"
                disabled={loadingArtistMore}
                className="gap-2"
              >
                {loadingArtistMore ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
                Load More Artists
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MusicHomepage;
