
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, X, Download } from 'lucide-react';
import LazyImage from '@/components/ui/lazy-image';

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

interface FullscreenPlayerProps {
  song: Song;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  isRepeat: boolean;
  isShuffle: boolean;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
}

const FullscreenPlayer = ({ 
  song, 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrevious, 
  onClose,
  isRepeat,
  isShuffle,
  onToggleRepeat,
  onToggleShuffle
}: FullscreenPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([70]);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (audioRef.current && song) {
      const audioUrl = song.downloadUrl?.find(url => url.quality === '320kbps')?.url || 
                      song.downloadUrl?.find(url => url.quality === '160kbps')?.url ||
                      song.downloadUrl?.[0]?.url;
      
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.volume = volume[0] / 100;
        if (isPlaying) {
          audioRef.current.play();
        }
      }
    }
  }, [song]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && song) {
      const newTime = (value[0] / 100) * song.duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // Check if it's a vertical swipe (more vertical than horizontal)
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
      if (deltaY < 0) {
        // Swipe up - next song
        onNext();
      } else {
        // Swipe down - previous song
        onPrevious();
      }
    }

    setTouchStart(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadSong = () => {
    const downloadUrl = song.downloadUrl?.find(url => url.quality === '320kbps')?.url || 
                       song.downloadUrl?.find(url => url.quality === '160kbps')?.url ||
                       song.downloadUrl?.[0]?.url;
    
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${song.name}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleAudioEnded = () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      onNext();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-50 flex flex-col items-center justify-center text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />
      
      {/* Close button */}
      <Button
        onClick={onClose}
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Swipe instructions */}
      <div className="absolute top-4 left-4 text-sm text-white/60">
        Swipe up/down to change songs
      </div>

      {/* Album Art */}
      <div className="mb-8">
        <LazyImage
          src={song.image[2]?.url || song.image[1]?.url || song.image[0]?.url}
          alt={song.name}
          className="w-80 h-80 rounded-2xl shadow-2xl object-cover"
        />
      </div>

      {/* Song Info */}
      <div className="text-center mb-8 max-w-md">
        <h1 className="text-3xl font-bold mb-2">{song.name}</h1>
        <p className="text-xl text-white/80">
          {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl mb-8 px-4">
        <Slider
          value={[song.duration > 0 ? (currentTime / song.duration) * 100 : 0]}
          onValueChange={handleSeek}
          max={100}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-white/60 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(song.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6 mb-8">
        <Button 
          size="lg" 
          variant="ghost"
          onClick={onToggleShuffle}
          className={`text-white hover:bg-white/20 ${isShuffle ? "text-primary" : ""}`}
        >
          <Shuffle className="h-6 w-6" />
        </Button>
        <Button size="lg" variant="ghost" onClick={onPrevious} className="text-white hover:bg-white/20">
          <SkipBack className="h-8 w-8" />
        </Button>
        <Button size="lg" onClick={onPlayPause} className="bg-white text-black hover:bg-white/90 rounded-full p-4">
          {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
        </Button>
        <Button size="lg" variant="ghost" onClick={onNext} className="text-white hover:bg-white/20">
          <SkipForward className="h-8 w-8" />
        </Button>
        <Button 
          size="lg" 
          variant="ghost"
          onClick={onToggleRepeat}
          className={`text-white hover:bg-white/20 ${isRepeat ? "text-primary" : ""}`}
        >
          <Repeat className="h-6 w-6" />
        </Button>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center gap-8 w-full max-w-2xl px-4">
        {/* Volume */}
        <div className="flex items-center gap-3 flex-1">
          <Volume2 className="h-5 w-5 text-white/60" />
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>

        {/* Download */}
        <Button 
          onClick={downloadSong}
          variant="ghost" 
          size="sm"
          className="text-white hover:bg-white/20"
        >
          <Download className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default FullscreenPlayer;
