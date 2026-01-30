import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Heart, MoreHorizontal, Download, Loader2, X, Music, HardDrive, Compass } from "lucide-react";
import { musicApi, Song } from "@/services/musicApi";
import LazyImage from "@/components/ui/lazy-image";
import { useMusicContext } from "@/contexts/MusicContext";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { weightedPages } from "@/services/constants";
import ExploreTab from "@/components/music/ExploreTab";

interface MusicHomepageProps {
  onPlaySong: (song: Song) => void;
  onNavigateToContent: (type: "album" | "artist" | "playlist", item: any) => void;
  currentSong: Song | null;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  isPlaying: boolean;
  setPlaylist: (songs: Song[]) => void;
}

const MusicHomepage = ({ onPlaySong, onNavigateToContent, likedSongs, setPlaylist }: MusicHomepageProps) => {
  const { likedSongs: likedSongObjects, offlineSongs, downloadProgress, setDownloadProgress, addToOffline, toggleLike, loadLikedSongs } = useMusicContext();

  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);
  const [popularArtists, setPopularArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedSongIds, setUsedSongIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("recommended");
  const [hasMoreSongs, setHasMoreSongs] = useState(true);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);

  // Load recently played from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("recentlyPlayedSongs");
      if (saved) setRecentlyPlayed(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to load recently played:", e);
    }
  }, []);

  // Save recently played to localStorage and add song
  const addToRecentlyPlayed = useCallback((song: Song) => {
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(s => s.id !== song.id);
      const updated = [song, ...filtered].slice(0, 30);
      localStorage.setItem("recentlyPlayedSongs", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isFetchingRelated = useRef(false);
  const artistPageCache = useRef<Set<string>>(new Set());
  const [songSentinel, setSongSentinel] = useState<HTMLDivElement | null>(null);

  const getCachedSearchResults = (): Song[] => {
    try { return JSON.parse(localStorage.getItem("musicSearchResults") || "[]"); }
    catch { return []; }
  };

  const getArtistsSongsFromSaved = (): Song[] => {
    try {
      const artists = JSON.parse(localStorage.getItem("favoriteArtists") || "[]");
      return artists.map((a: any, i: number) => ({
        id: `fav-artist-${a.id}-${i}`,
        name: `Artist ${a.id}`,
        artists: { primary: [{ id: a.id, name: a.name || "Artist" }] },
        duration: 0,
        language: "hindi",
        image: []
      } as unknown as Song));
    } catch { return []; }
  };

  useEffect(() => {
    loadHomepageData();
  }, []);


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

  
  useEffect(() => {
    if (activeTab === "recommended") setPlaylist(relatedSongs);
    else if (activeTab === "likes") setPlaylist(likedSongObjects || []);
    else if (activeTab === "offline") setPlaylist(offlineSongs || []);
  }, [activeTab, relatedSongs, likedSongObjects, offlineSongs]);

  const loadHomepageData = async () => {
    try {
      setLoading(true);
      const artists = await musicApi.getPopularArtists();
      setPopularArtists(artists || []);
      await loadRelatedSongs(); // initial fetch
    } catch (err) {
      console.error("Error loading homepage:", err);
    } finally { setLoading(false); }
  };

  const loadRelatedSongs = useCallback(async () => {
    if (isFetchingRelated.current || !hasMoreSongs) return;
    isFetchingRelated.current = true;

    try {
      const savedOptions = JSON.parse(localStorage.getItem("recommendationOptions") || "{}");
      let basePool: Song[] = [];

      if (savedOptions?.liked) {
        if (likedSongObjects?.length) basePool = basePool.concat(likedSongObjects);
        else {
          const res: any = await loadLikedSongs();
          basePool = basePool.concat(res?.songs || []);
        }
      }
      if (savedOptions?.searched) basePool = basePool.concat(getCachedSearchResults());
      if (savedOptions?.favorites) basePool = basePool.concat(getArtistsSongsFromSaved());
      if (!basePool.length && popularArtists.length) {
        basePool = popularArtists.slice(0, 5).map((a, i) => ({
          id: `seed-artist-${a.id}-${i}`,
          name: `seed-${a.name}`,
          artists: { primary: [{ id: a.id, name: a.name }] },
          duration: 0,
          image: [],
          language: "hindi"
        })) as unknown as Song[];
      }

      if (!basePool.length) return;

      const randomSongs = getRandomSongs(basePool, 3, usedSongIds);
      if (!randomSongs.length) { setHasMoreSongs(false); return; } // <-- stop infinite

      const newUsedIds: string[] = [...usedSongIds, ...randomSongs.map((s) => s.id)];
      const newRelatedSongs: Song[] = [];
      const likedIdsSet = new Set((likedSongObjects || []).map((s) => s.id));

      const promises = randomSongs.map(async (seedSong) => {
        const primary = seedSong.artists?.primary?.[0]; if (!primary?.id) return [];
        const artistId = primary.id;

        for (let attempt = 0; attempt < 10; attempt++) {
          const page = weightedPages[Math.floor(Math.random() * weightedPages.length)];
          const cacheKey = `${artistId}:${page}`;
          if (artistPageCache.current.has(cacheKey)) continue;

          let searchResults: Song[] = [];
          try { searchResults = await musicApi.getArtistSongs(artistId, page); }
          catch { continue; }

          const filtered = searchResults.filter(s =>
            s?.id && !newUsedIds.includes(s.id) && !likedIdsSet.has(s.id) && !newRelatedSongs.some(x => x.id === s.id)
          );

          if (filtered.length > 0) { artistPageCache.current.add(cacheKey); return filtered; }
        }
        return [];
      });

      const results = await Promise.all(promises);
      const flatResults = results.flat();
      const trulyUniqueSongs = flatResults.filter((s, i, arr) => s?.id && arr.findIndex(x => x.id === s.id) === i);
      const allowedLang = new Set(["hindi", "english"]);
      const finalNewSongs = trulyUniqueSongs.filter(s => allowedLang.has((s.language || "").toLowerCase()));

      if (!finalNewSongs.length) { setHasMoreSongs(false); return; }

      setRelatedSongs(prev => {
        const merged = [...prev, ...finalNewSongs];
        const seen = new Set<string>();
        return merged.filter(s => s?.id && !seen.has(s.id) && seen.add(s.id));
      });

      setUsedSongIds(newUsedIds.concat(finalNewSongs.map(s => s.id)));
    } catch (err) { console.error(err); }
    finally { isFetchingRelated.current = false; }
  }, [usedSongIds, likedSongObjects, popularArtists, hasMoreSongs]);

  const getRandomSongs = (songs: Song[], count: number, usedIds: string[]) => {
    const available = songs.filter(s => s?.id && !usedIds.includes(s.id));
    const pool = available.length ? available : songs;
    return [...pool].sort(() => 0.5 - Math.random()).slice(0, Math.min(count, pool.length));
  };

  useEffect(() => {
    if (!songSentinel) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && activeTab === "recommended" && hasMoreSongs) loadRelatedSongs();
    }, { root: null, rootMargin: "300px", threshold: 0.1 });
    obs.observe(songSentinel);
    return () => obs.disconnect();
  }, [songSentinel, activeTab, loadRelatedSongs, hasMoreSongs]);

  const handlePlaySong = (song: Song) => {
    if (activeTab === "recommended") setPlaylist([...relatedSongs]);
    else if (activeTab === "likes") setPlaylist([...likedSongObjects]);
    else if (activeTab === "offline") setPlaylist([...offlineSongs]);
    addToRecentlyPlayed(song);
    onPlaySong(song);
  };

  const handleToggleLike = (song: Song) => toggleLike(song);

  const isOffline = (songId: string) => offlineSongs?.some(s => s.id === songId);

  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin h-8 w-8" /></div>;


  return (
    <div className="space-y-4">
      <Tabs defaultValue={activeTab} onValueChange={(v) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommended" className="flex flex-col items-center">
            <Music className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">Recommended</span>
          </TabsTrigger>
          <TabsTrigger value="explore" className="flex flex-col items-center">
            <Compass className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">Explore</span>
          </TabsTrigger>
          <TabsTrigger value="likes" className="flex flex-col items-center">
            <Heart className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">Likes</span>
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex flex-col items-center">
            <HardDrive className="h-4 w-4 sm:hidden" /> <span className="hidden sm:inline">Offline</span>
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

        {/* Explore */}
        <TabsContent value="explore" className="space-y-4">
          <ExploreTab 
            onPlaySong={(song) => { addToRecentlyPlayed(song); onPlaySong(song); }} 
            onNavigateToContent={onNavigateToContent}
            setPlaylist={setPlaylist}
            recentlyPlayed={recentlyPlayed}
          />
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

      </Tabs>
    </div>
  );
};

export default MusicHomepage;
