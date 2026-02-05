import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  X,
  Play,
  Heart,
  Download,
  Music,
  PlayCircle,
  Loader2,
  Trash2
} from "lucide-react";
import { musicApi, Song } from "@/services/musicApi";
import { useMusicContext } from "@/contexts/MusicContext";
import LazyImage from "@/components/ui/lazy-image";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";

const SongsModal = () => {
  const {
    songsModalData,
    showSongsModal,
    setShowSongsModal,
    currentSong,
    isPlaying,
    likedSongs,
    offlineSongs,
    downloadProgress,
    playSong,
    setPlaylist,
    toggleLike,
    addToOffline,
    setDownloadProgress,
    playAllSongs,
    downloadAllSongs,
    deleteAllOfflineSongs
  } = useMusicContext();

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showSongsModal) {
        setShowSongsModal(false);
      }
    };

    if (showSongsModal) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [showSongsModal, setShowSongsModal]);

  useEffect(() => {
    if (showSongsModal && songsModalData) {
      loadInitialSongs();
    }
  }, [showSongsModal, songsModalData]);

  const loadInitialSongs = async () => {
    if (!songsModalData) return;

    setLoading(true);
    setPage(1);
    let newSongs: Song[] = [];

    try {
      switch (songsModalData.type) {
        case "album":
          if (songsModalData.id) {
            newSongs = await musicApi.getAlbumSongs(songsModalData.id);
            setHasMore(true);
          }
          break;

        case "artist":
          if (songsModalData.id) {
            newSongs = await musicApi.getArtistSongs(songsModalData.id, 1);
            setHasMore(true);
          }
          break;

        case "playlist":
          if (songsModalData.id) {
            newSongs = await musicApi.getPlaylistSongs(songsModalData.id);
            setHasMore(true);
          }
          break;

        case "liked":
          newSongs = likedSongs;
          setHasMore(true);
          break;

        case "offline":
          newSongs = await loadOfflineSongs();
          setHasMore(false);
          break;

        case "search":
          if (songsModalData.query && songsModalData.searchType) {
            newSongs = await musicApi.searchByType(
              songsModalData.searchType,
              songsModalData.query,
              page
            );
            setHasMore(true);
          }
          break;
      }

      setSongs(newSongs);
      if (newSongs.length > 0) {
        setPlaylist(newSongs);
      }
    } catch (error) {
      console.error("Error loading songs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineSongs = async (): Promise<Song[]> => {
    return new Promise((resolve) => {
      const request = indexedDB.open("OfflineMusicDB", 1);
      request.onsuccess = function (event) {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains("songs")) {
          resolve([]);
          return;
        }

        const transaction = db.transaction(["songs"], "readonly");
        const store = transaction.objectStore("songs");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = function () {
          const offlineData = getAllRequest.result || [];
          // Convert blob URLs for offline songs
          const songsWithBlobUrls = offlineData.map((song: any) => ({
            ...song,
            downloadUrl: song.audioBlob
              ? [
                  {
                    quality: "320kbps",
                    url: URL.createObjectURL(song.audioBlob)
                  }
                ]
              : song.downloadUrl,
            image: song.imageBlob
              ? [
                  {
                    quality: "500x500",
                    url: URL.createObjectURL(song.imageBlob)
                  }
                ]
              : song.image
          }));
          resolve(songsWithBlobUrls);
        };

        getAllRequest.onerror = function () {
          resolve([]);
        };
      };

      request.onerror = function () {
        resolve([]);
      };
    });
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || !songsModalData) return;

    setLoadingMore(true);
    const nextPage = page + 1;
    let newSongs: Song[] = [];

    try {
      switch (songsModalData.type) {
        case "artist":
          if (songsModalData.id) {
            newSongs = await musicApi.getArtistSongs(
              songsModalData.id,
              nextPage
            );
          }
          break;

        case "search":
          if (songsModalData.query && songsModalData.searchType) {
            newSongs = await musicApi.searchByType(
              songsModalData.searchType,
              songsModalData.query,
              nextPage
            );
          }
          break;
      }

      if (newSongs.length > 0) {
        setSongs((prev) => [...prev, ...newSongs]);
        setPage(nextPage);
        setPlaylist([...songs, ...newSongs]);
      }

      if (newSongs.length < 10) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more songs:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePlaySong = (song: Song) => {
    playSong(song);
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

  const handleClose = () => {
    setShowSongsModal(false);
  };

  const handleDeleteAllOffline = async () => {
    try {
      await deleteAllOfflineSongs();
      setSongs([]);
      toast({
        title: "Success",
        description: "All offline songs deleted successfully",
        variant: "success"
      });
    } catch (error) {
      console.error("Delete all failed:", error);
      toast({
        title: "Error",
        description: "Failed to delete offline songs",
        variant: "destructive"
      });
    }
  };

  const handleDownloadAll = async () => {
    if (songs.length > 0) {
      await downloadAllSongs(songs);
      toast({
        title: "Download Started",
        description: `Downloading ${songs.length} songs...`,
        variant: "success"
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLiked = (songId: string) => {
    return likedSongs.some((song) => song.id === songId);
  };

  const isOffline = (songId: string) => {
    return offlineSongs.some((song) => song.id === songId);
  };

  if (!showSongsModal || !songsModalData) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-background rounded-2xl border border-white/10 w-full max-w-4xl lg:max-h-[78vh] h-full flex flex-col overflow-hidden pb-[100px] sm:pb-0">
          {/* Header */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 border-b p-6">
            <div className="flex items-center gap-4">
              {songsModalData.image && (
                <LazyImage
                  src={songsModalData.image}
                  alt={songsModalData.name}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">{songsModalData.name}</h1>
                <p className="text-muted-foreground">{songs.length} songs</p>
              </div>
            </div>
            <div className="shrink-0">
              <div className="flex items-center justify-end mb-4 gap-4">
                {songs.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => playAllSongs(songs)}
                      variant="outline"
                      size="sm"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Play All
                    </Button>
                    {songsModalData.type !== "offline" && (
                      <Button
                        onClick={handleDownloadAll}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                    )}
                    {songsModalData.type === "offline" && (
                      <Button
                        onClick={handleDeleteAllOffline}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </Button>
                    )}
                  </div>
                )}
                <Button onClick={handleClose} variant="secondary" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* Scrollable Songs List */}
          <div className="flex-1 overflow-auto music-scrollbar p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : songs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Music className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg mb-2">No songs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {songs.map((song, index) => (
                  <div
                    key={song.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      currentSong?.id === song.id
                        ? "bg-primary/20 border border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => handlePlaySong(song)}
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
                      <p className="truncate text-sm font-medium">
                        {song.name}
                      </p>
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

                      {songsModalData.type !== "offline" && (
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
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="flex justify-center mt-4">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outline"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SongsModal;
