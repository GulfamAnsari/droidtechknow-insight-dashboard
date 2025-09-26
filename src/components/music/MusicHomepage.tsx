import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Heart,
  MoreHorizontal,
  Download,
  Loader2,
  X,
  Star,
  Music,
  HardDrive
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
  const [usedSongIds, setUsedSongIds] = useState<string[]>([]);
  const [artistPage, setArtistPage] = useState(1);
  const [activeTab, setActiveTab] = useState<string>("recommended");

  // prevent concurrent fetches
  const isFetchingRelated = useRef(false);
  const isFetchingArtists = useRef(false);

  // sentinel refs via callback ref so intersection observer attaches reliably
  const [songSentinel, setSongSentinel] = useState<HTMLDivElement | null>(null);
  const [artistSentinel, setArtistSentinel] = useState<HTMLDivElement | null>(null);

  // ---------- Helpers (safe localStorage parsing) ----------
  const getCachedSearchResults = (): Song[] => {
    try {
      const cached = localStorage.getItem("musicSearchResults");
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error("Error loading cached search results:", error);
      return [];
    }
  };

  const getArtistsSongsFromSaved = (): Song[] => {
    try {
      const artists = JSON.parse(localStorage.getItem("favoriteArtists") || "[]");
      const songs: Song[] = [];
      if (Array.isArray(artists) && artists.length) {
        for (let i = 0; i < artists.length; i++) {
          const artistId = artists[i]?.id ?? artists[i];
          // make a minimal pseudo-song object that includes a root id (so getRandomSongs works)
          songs.push({
            id: `fav-artist-${artistId}-${i}`,
            name: `Artist ${artistId}`,
            artists: { primary: [{ id: artistId, name: artists[i]?.name || "Artist" }] },
            // keep optional fields safe
            duration: 0,
            language: "hindi",
            image: []
          } as unknown as Song);
        }
      }
      return songs;
    } catch (error) {
      console.error("Error reading favoriteArtists:", error);
      return [];
    }
  };

  useEffect(() => {
    loadHomepageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep playlist in sync with active tab
  useEffect(() => {
    if (activeTab === "recommended") {
      setPlaylist(relatedSongs);
    } else if (activeTab === "likes") {
      setPlaylist(likedSongObjects || []);
    } else if (activeTab === "offline") {
      setPlaylist(offlineSongs || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, relatedSongs, likedSongObjects, offlineSongs]);

  const loadHomepageData = async () => {
    try {
      setLoading(true);
      const artists = await musicApi.getPopularArtists();
      setPopularArtists(artists || []);
      await loadRelatedSongs(); // initial fill
    } catch (err) {
      console.error("Error loading homepage:", err);
    } finally {
      setLoading(false);
    }
  };

  const artistPageCache = useRef<Set<string>>(new Set());

  // ---------- Core: loadRelatedSongs (with safeguards) ----------
  const loadRelatedSongs = useCallback(async () => {
    if (isFetchingRelated.current) return;
    isFetchingRelated.current = true;

    try {
      const savedOptions = JSON.parse(localStorage.getItem("recommendationOptions") || "{}");

      let basePool: Song[] = [];

      // liked songs
      if (savedOptions?.liked) {
        if (Array.isArray(likedSongObjects) && likedSongObjects.length > 0) {
          basePool = basePool.concat(likedSongObjects);
        } else {
          try {
            const res: any = await loadLikedSongs();
            const loaded = res?.songs || [];
            basePool = basePool.concat(loaded);
          } catch (e) {
            console.warn("Could not load liked songs:", e);
          }
        }
      }

      // cached searches
      if (savedOptions?.searched) {
        basePool = basePool.concat(getCachedSearchResults());
      }

      // favorite artists -> pseudo songs (used to pick artist ids)
      if (savedOptions?.favorites) {
        basePool = basePool.concat(getArtistsSongsFromSaved());
      }

      // fallback: if basePool empty, use popular artists as seeds
      if (basePool.length === 0 && popularArtists.length > 0) {
        const fallback = popularArtists.slice(0, 5).map((a: any, i: number) => ({
          id: `seed-artist-${a.id}-${i}`,
          name: `seed-${a.name}`,
          artists: { primary: [{ id: a.id, name: a.name }] },
          duration: 0,
          image: [],
          language: "hindi"
        })) as unknown as Song[];
        basePool = basePool.concat(fallback);
      }

      if (basePool.length === 0) {
        // nothing to do
        return;
      }

      const randomSongs = getRandomSongs(basePool, 3, usedSongIds);
      const newUsedIds: string[] = [...usedSongIds, ...randomSongs.map((s) => s.id)];
      const newRelatedSongs: Song[] = [];

      const likedIdsSet = new Set(
        (Array.isArray(likedSongObjects) ? likedSongObjects : []).map((s) => s.id)
      );

      const promises = randomSongs.map(async (seedSong) => {
        const primary = seedSong.artists?.primary?.[0];
        if (!primary?.id) return [];

        const artistId = primary.id;

        for (let attempt = 0; attempt < 10; attempt++) {
          const page = weightedPages[Math.floor(Math.random() * weightedPages.length)];
          const cacheKey = `${artistId}:${page}`;

          // skip if we've already gotten useful songs for this artist:page
          if (artistPageCache.current.has(cacheKey)) continue;

          let searchResults: Song[] = [];
          try {
            searchResults = await musicApi.getArtistSongs(artistId, page);
          } catch (err) {
            console.warn("Artist songs fetch failed:", artistId, page, err);
            continue;
          }

          const filtered = searchResults.filter(
            (resultSong) =>
              resultSong?.id &&
              !newUsedIds.includes(resultSong.id) &&
              !likedIdsSet.has(resultSong.id) &&
              !newRelatedSongs.some((s) => s.id === resultSong.id)
          );

          if (filtered.length > 0) {
            artistPageCache.current.add(cacheKey); // cache only on success
            return filtered;
          }
        }
        return [];
      });

      const results = await Promise.all(promises);
      const flatResults = results.flat();

      // dedupe and language filter
      const trulyUniqueSongs = flatResults.filter(
        (song, idx, self) => song?.id && self.findIndex((s) => s.id === song.id) === idx
      );

      // only keep specific languages (as your original did)
      const allowedLang = new Set(["hindi", "english"]);
      const finalNewSongs = trulyUniqueSongs.filter((s) =>
        allowedLang.has((s.language || "").toLowerCase())
      );

      if (finalNewSongs.length > 0) {
        setRelatedSongs((prev) => {
          const merged = [...prev, ...finalNewSongs];
          // keep unique by id and limit size to avoid memory bloat
          const seen = new Set<string>();
          const limited: Song[] = [];
          for (let i = 0; i < merged.length; i++) {
            const song = merged[i];
            if (!song?.id) continue;
            if (!seen.has(song.id)) {
              seen.add(song.id);
              limited.push(song);
            }
            if (limited.length >= 200) break; // keep last up to 200
          }
          return limited;
        });

        setUsedSongIds(newUsedIds.concat(finalNewSongs.map((s) => s.id)));
      }
    } catch (err) {
      console.error("Error in loadRelatedSongs:", err);
    } finally {
      isFetchingRelated.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedSongIds, likedSongObjects, popularArtists]);

  // ---------- getRandomSongs ----------
  const getRandomSongs = (songs: Song[], count: number, usedIds: string[]) => {
    if (!Array.isArray(songs) || songs.length === 0) return [];
    const available = songs.filter((s) => s?.id && !usedIds.includes(s.id));
    const pool = available.length > 0 ? available : songs;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  };

  // ---------- Artists infinite load ----------
  const loadMoreArtists = useCallback(async () => {
    if (isFetchingArtists.current) return;
    isFetchingArtists.current = true;
    try {
      const artists = await musicApi.getPopularArtists(artistPage + 1);
      setArtistPage((p) => p + 1);
      setPopularArtists((prev) => [...prev, ...(artists || [])]);
    } catch (err) {
      console.error("Error loading more artists:", err);
    } finally {
      isFetchingArtists.current = false;
    }
  }, [artistPage]);

  // ---------- Intersection Observers (sentinels) ----------
  useEffect(() => {
    if (!songSentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && activeTab === "recommended") {
          loadRelatedSongs();
        }
      },
      { root: null, rootMargin: "300px", threshold: 0.1 }
    );
    obs.observe(songSentinel);
    return () => obs.disconnect();
  }, [songSentinel, activeTab, loadRelatedSongs]);

  useEffect(() => {
    if (!artistSentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && activeTab === "artists") {
          loadMoreArtists();
        }
      },
      { root: null, rootMargin: "300px", threshold: 0.1 }
    );
    obs.observe(artistSentinel);
    return () => obs.disconnect();
  }, [artistSentinel, activeTab, loadMoreArtists]);

  // ---------- Play / Like handlers ----------
  const handlePlaySong = (song: Song) => {
    // set playlist as per active tab
    if (activeTab === "recommended") setPlaylist([...relatedSongs]);
    if (activeTab === "likes") setPlaylist([...likedSongObjects]);
    if (activeTab === "offline") setPlaylist([...offlineSongs]);
    onPlaySong(song);
  };

  const handleToggleLike = (song: Song) => {
    toggleLike(song);
  };

  // ---------- Download with progress (XHR) ----------
  const downloadSong = (song: Song) => {
    try {
      // decide url
      const audioUrl =
        song.downloadUrl?.find((u) => u.quality === "320kbps")?.url ||
        song.downloadUrl?.find((u) => u.quality === "160kbps")?.url ||
        song.downloadUrl?.[0]?.url;

      if (!audioUrl) {
        setDownloadProgress(song.id, -1);
        toast.error("No download URL available for this song");
        return;
      }

      const secureUrl = audioUrl.replace(/^http:\/\//i, "https://");

      const xhr = new XMLHttpRequest();
      xhr.open("GET", secureUrl, true);
      xhr.responseType = "blob";

      xhr.onprogress = (ev: ProgressEvent<EventTarget>) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100);
          setDownloadProgress(song.id, pct);
        } else {
          // unknown total (set a small heartbeat)
          setDownloadProgress(song.id, 10);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const blob = xhr.response;
          // store in IndexedDB
          const request = indexedDB.open("OfflineMusicDB", 1);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("songs")) {
              db.createObjectStore("songs", { keyPath: "id" });
            }
          };
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(["songs"], "readwrite");
            const store = tx.objectStore("songs");
            try {
              store.put({ ...song, audioBlob: blob });
              tx.oncomplete = () => {
                addToOffline(song);
                setDownloadProgress(song.id, 100);
                toast.success(`${song.name} downloaded successfully`);
                setTimeout(() => setDownloadProgress(song.id, 0), 2000);
              };
              tx.onerror = () => {
                setDownloadProgress(song.id, -1);
                toast.error("Saving to local DB failed");
              };
            } catch (err) {
              console.error("IndexedDB put failed:", err);
              setDownloadProgress(song.id, -1);
              toast.error("Failed to save download");
            }
          };
          request.onerror = () => {
            setDownloadProgress(song.id, -1);
            toast.error("IndexedDB error");
          };
        } else {
          setDownloadProgress(song.id, -1);
          toast.error(`Download failed (${xhr.status})`);
        }
      };

      xhr.onerror = () => {
        setDownloadProgress(song.id, -1);
        toast.error("Download request failed");
      };

      // start
      setDownloadProgress(song.id, 1);
      xhr.send();
    } catch (err) {
      console.error("Download error:", err);
      setDownloadProgress(song.id, -1);
      toast.error("Failed to download");
    }
  };

  const isOffline = (songId: string) => {
    return offlineSongs?.some((s) => s.id === songId);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={activeTab} onValueChange={(v) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommended" className="flex flex-col items-center">
            <Music className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">Recommended</span>
          </TabsTrigger>
          <TabsTrigger value="likes" className="flex flex-col items-center">
            <Heart className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">Likes</span>
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex flex-col items-center">
            <HardDrive className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">Offline</span>
          </TabsTrigger>
          <TabsTrigger value="artists" className="flex flex-col items-center">
            <Star className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">Popular Artists</span>
          </TabsTrigger>
        </TabsList>

        {/* Recommended */}
        <TabsContent value="recommended" className="space-y-4">
          <div className="mt-6">
            {relatedSongs?.length === 0 ? (
              <Card className="cursor-pointer hover:shadow-lg transition-shadow group">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-medium mb-2">Try searching to get started</h3>
                  <p className="text-muted-foreground">
                    Start searching for music to help us build a feed of songs that you'll love.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2 mt-2">
                  {relatedSongs.map((song) => (
                    <Card key={song.id} className="cursor-pointer hover:shadow-lg transition-shadow group">
                      <CardContent className="p-2">
                        <div className="relative mb-2">
                          <LazyImage
                            src={song.image?.[1]?.url || song.image?.[0]?.url}
                            alt={song.name}
                            className="w-full aspect-square rounded-lg object-cover"
                            onClick={() => handlePlaySong(song)}
                          />
                          <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="h-8 w-8 text-white" onClick={() => handlePlaySong(song)} />
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
                                      <div className="flex items-center gap-1">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-xs">{downloadProgress[song.id]}%</span>
                                      </div>
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
                            {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDuration(song.duration)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* sentinel for infinite load */}
                <div ref={setSongSentinel} className="h-12 flex items-center justify-center mt-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Likes */}
        <TabsContent value="likes" className="space-y-4">
          <div className="mt-6">
            {(!likedSongObjects || likedSongObjects.length === 0) ? (
              <Card className="cursor-pointer hover:shadow-lg transition-shadow group">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-medium mb-2">No liked songs yet</h3>
                  <p className="text-muted-foreground">Start liking songs to see them here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2 mt-2">
                {likedSongObjects.map((song) => (
                  <Card key={song.id} className="cursor-pointer hover:shadow-lg transition-shadow group">
                    <CardContent className="p-2">
                      <div className="relative mb-2">
                        <LazyImage
                          src={song.image?.[1]?.url || song.image?.[0]?.url}
                          alt={song.name}
                          className="w-full aspect-square rounded-lg object-cover"
                          onClick={() => handlePlaySong(song)}
                        />
                        <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="h-8 w-8 text-white" onClick={() => handlePlaySong(song)} />
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
                                    <div className="flex items-center gap-1">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      <span className="text-xs">{downloadProgress[song.id]}%</span>
                                    </div>
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
                          {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDuration(song.duration)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Offline */}
        <TabsContent value="offline" className="space-y-4">
          <div className="mt-6">
            {(!offlineSongs || offlineSongs.length === 0) ? (
              <Card className="cursor-pointer hover:shadow-lg transition-shadow group">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-medium mb-2">No offline songs</h3>
                  <p className="text-muted-foreground">Download songs to listen offline.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-2 mt-2">
                {offlineSongs.map((song) => (
                  <Card key={song.id} className="cursor-pointer hover:shadow-lg transition-shadow group">
                    <CardContent className="p-2">
                      <div className="relative mb-2">
                        <LazyImage
                          src={song.image?.[1]?.url || song.image?.[0]?.url}
                          alt={song.name}
                          className="w-full aspect-square rounded-lg object-cover"
                          onClick={() => handlePlaySong(song)}
                        />
                        <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="h-8 w-8 text-white" onClick={() => handlePlaySong(song)} />
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
                          {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDuration(song.duration)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Artists */}
        <TabsContent value="artists" className="space-y-4">
          <div className="mt-6">
            <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-3">
              {popularArtists.map((artist) => (
                <Card
                  key={artist.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => onNavigateToContent("artist", artist)}
                >
                  <CardContent className="p-2 text-center">
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

                    <h3 className="font-medium text-xs truncate mt-2">{artist.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div ref={setArtistSentinel} className="h-12 flex items-center justify-center mt-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MusicHomepage;
