import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Song } from '@/services/musicApi';
import httpClient from '@/utils/httpClient';

interface MusicContextType {
  // Player state
  currentSong: Song | null;
  isPlaying: boolean;
  playlist: Song[];
  currentIndex: number;
  isRepeat: boolean;
  isShuffle: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  
  // UI state
  isFullscreen: boolean;
  isSearchMode: boolean;
  showSongsModal: boolean;
  songsModalData: {
    type: 'album' | 'artist' | 'playlist' | 'liked' | 'offline' | 'search';
    id?: string;
    name: string;
    image?: string;
    query?: string;
    searchType?: 'songs' | 'albums' | 'artists' | 'playlists';
  } | null;
  
  // User data
  likedSongs: Song[];
  offlineSongs: Song[];
  downloadProgress: { [songId: string]: number };
  
  // Actions
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaylist: (songs: Song[]) => void;
  setCurrentIndex: (index: number) => void;
  setIsRepeat: (repeat: boolean) => void;
  setIsShuffle: (shuffle: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (muted: boolean) => void;
  setIsFullscreen: (fullscreen: boolean) => void;
  setIsSearchMode: (searchMode: boolean) => void;
  setShowSongsModal: (show: boolean) => void;
  setSongsModalData: (data: any) => void;
  toggleLike: (song: Song) => void;
  addToOffline: (song: Song) => void;
  removeFromOffline: (songId: string) => void;
  setDownloadProgress: (songId: string, progress: number) => void;
  playSong: (song: Song) => void;
  playNext: () => void;
  playPrevious: () => void;
  playAllSongs: (songs: Song[]) => void;
  downloadAllSongs: (songs: Song[]) => Promise<void>;
  deleteAllOfflineSongs: () => Promise<void>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicContext must be used within a MusicProvider');
  }
  return context;
};

interface MusicProviderProps {
  children: ReactNode;
}

export const MusicProvider = ({ children }: MusicProviderProps) => {
  // Player state
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  
  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showSongsModal, setShowSongsModal] = useState(false);
  const [songsModalData, setSongsModalData] = useState<any>(null);
  
  // User data - Store complete Song objects
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  
  const [offlineSongs, setOfflineSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem("offlineSongs");
    return saved ? JSON.parse(saved) : [];
  });

  const [downloadProgress, setDownloadProgressState] = useState<{ [songId: string]: number }>({});

  // Load liked songs from API on component mount
  useEffect(() => {
    loadLikedSongs();
  }, []);

  // Save offline songs to localStorage
  useEffect(() => {
    localStorage.setItem("offlineSongs", JSON.stringify(offlineSongs));
  }, [offlineSongs]);

  const loadLikedSongs = async () => {
    try {
      const response = await httpClient.get(
        `https://droidtechknow.com/admin/api/music/likedsongs.php`,
        { skipAuth: true }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.songs && Array.isArray(data.songs)) {
          setLikedSongs(data.songs);
        }
      }
    } catch (error) {
      console.error('Error loading liked songs:', error);
      // Fallback to localStorage if API fails
      const saved = localStorage.getItem("likedSongs");
      if (saved) {
        setLikedSongs(JSON.parse(saved));
      }
    }
  };

  const saveLikedSongToAPI = async (song: Song) => {
    try {

      const response = await httpClient.post("https://droidtechknow.com/admin/api/music/likedsongs.php", song);
      
      if (!response.ok) {
        throw new Error('Failed to save liked song');
      }
    } catch (error) {
      console.error('Error saving liked song:', error);
      // Fallback to localStorage if API fails
      const currentLiked = localStorage.getItem("likedSongs");
      const likedArray = currentLiked ? JSON.parse(currentLiked) : [];
      const updated = [...likedArray, song];
      localStorage.setItem("likedSongs", JSON.stringify(updated));
    }
  };

  const toggleLike = async (song: Song) => {
    const isLiked = likedSongs.find(s => s.id === song.id);
    
    if (isLiked) {
      setLikedSongs(prev => prev.filter(s => s.id !== song.id));
    } else {
      setLikedSongs(prev => [...prev, song]);
      await saveLikedSongToAPI(song);
    }
  };

  const addToOffline = (song: Song) => {
    setOfflineSongs(prev => {
      if (!prev.find(s => s.id === song.id)) {
        return [...prev, song];
      }
      return prev;
    });
  };

  const removeFromOffline = (songId: string) => {
    setOfflineSongs(prev => prev.filter(s => s.id !== songId));
  };

  const setDownloadProgress = (songId: string, progress: number) => {
    setDownloadProgressState(prev => ({
      ...prev,
      [songId]: progress
    }));
  };

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    const songIndex = playlist.findIndex(s => s.id === song.id);
    setCurrentIndex(songIndex !== -1 ? songIndex : 0);
    setCurrentTime(0);
    setDuration(song.duration);
  };

  const playAllSongs = (songs: Song[]) => {
    if (songs.length > 0) {
      setPlaylist(songs);
      setCurrentSong(songs[0]);
      setCurrentIndex(0);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(songs[0].duration);
    }
  };

  const playNext = () => {
    if (playlist.length > 0) {
      let nextIndex;
      if (isShuffle) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } else {
        nextIndex = (currentIndex + 1) % playlist.length;
      }
      setCurrentIndex(nextIndex);
      setCurrentSong(playlist[nextIndex]);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(playlist[nextIndex].duration);
    }
  };

  const playPrevious = () => {
    if (playlist.length > 0) {
      let prevIndex;
      if (isShuffle) {
        prevIndex = Math.floor(Math.random() * playlist.length);
      } else {
        prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
      }
      setCurrentIndex(prevIndex);
      setCurrentSong(playlist[prevIndex]);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(playlist[prevIndex].duration);
    }
  };

  const downloadAllSongs = async (songs: Song[]) => {
    for (const song of songs) {
      try {
        setDownloadProgress(song.id, 10);

        const audioUrl =
          song.downloadUrl?.find((url) => url.quality === "320kbps")?.url ||
          song.downloadUrl?.find((url) => url.quality === "160kbps")?.url ||
          song.downloadUrl?.[0]?.url;

        if (!audioUrl) {
          setDownloadProgress(song.id, -1);
          continue;
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
          
          setTimeout(() => {
            setDownloadProgress(song.id, 0);
          }, 2000);
        };
      } catch (error) {
        console.error("Download failed for song:", song.name, error);
        setDownloadProgress(song.id, -1);
        setTimeout(() => {
          setDownloadProgress(song.id, 0);
        }, 3000);
      }
    }
  };

  const deleteAllOfflineSongs = async () => {
    return new Promise<void>((resolve) => {
      const request = indexedDB.open("OfflineMusicDB", 1);
      
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains("songs")) {
          setOfflineSongs([]);
          resolve();
          return;
        }
        
        const transaction = db.transaction(["songs"], "readwrite");
        const store = transaction.objectStore("songs");
        
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          setOfflineSongs([]);
          resolve();
        };
        
        clearRequest.onerror = () => {
          resolve();
        };
      };
      
      request.onerror = () => {
        resolve();
      };
    });
  };

  const value: MusicContextType = {
    // Player state
    currentSong,
    isPlaying,
    playlist,
    currentIndex,
    isRepeat,
    isShuffle,
    currentTime,
    duration,
    volume,
    isMuted,
    
    // UI state
    isFullscreen,
    isSearchMode,
    showSongsModal,
    songsModalData,
    
    // User data
    likedSongs,
    offlineSongs,
    downloadProgress,
    
    // Actions
    setCurrentSong,
    setIsPlaying,
    setPlaylist,
    setCurrentIndex,
    setIsRepeat,
    setIsShuffle,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsMuted,
    setIsFullscreen,
    setIsSearchMode,
    setShowSongsModal,
    setSongsModalData,
    toggleLike,
    addToOffline,
    removeFromOffline,
    setDownloadProgress,
    playSong,
    playNext,
    playPrevious,
    playAllSongs,
    downloadAllSongs,
    deleteAllOfflineSongs,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};
