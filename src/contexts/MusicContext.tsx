
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Song } from '@/services/musicApi';

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
  const [likedSongs, setLikedSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem("likedSongs");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [offlineSongs, setOfflineSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem("offlineSongs");
    return saved ? JSON.parse(saved) : [];
  });

  const [downloadProgress, setDownloadProgressState] = useState<{ [songId: string]: number }>({});

  // Save liked songs to localStorage
  useEffect(() => {
    localStorage.setItem("likedSongs", JSON.stringify(likedSongs));
  }, [likedSongs]);

  // Save offline songs to localStorage
  useEffect(() => {
    localStorage.setItem("offlineSongs", JSON.stringify(offlineSongs));
  }, [offlineSongs]);

  const toggleLike = (song: Song) => {
    setLikedSongs(prev => {
      const isLiked = prev.find(s => s.id === song.id);
      if (isLiked) {
        return prev.filter(s => s.id !== song.id);
      } else {
        return [...prev, song];
      }
    });
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
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};
