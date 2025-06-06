
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle } from 'lucide-react';
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

interface AudioPlayerProps {
  song: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isRepeat: boolean;
  isShuffle: boolean;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
}

const AudioPlayer = ({ 
  song, 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrevious,
  currentTime,
  onTimeUpdate,
  volume,
  onVolumeChange,
  isRepeat,
  isShuffle,
  onToggleRepeat,
  onToggleShuffle
}: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && song) {
      const audioUrl = song.downloadUrl?.find(url => url.quality === '320kbps')?.url || 
                      song.downloadUrl?.find(url => url.quality === '160kbps')?.url ||
                      song.downloadUrl?.[0]?.url;
      
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.currentTime = currentTime;
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
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      onTimeUpdate(audioRef.current.currentTime);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && song) {
      const newTime = (value[0] / 100) * song.duration;
      audioRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    onVolumeChange(value[0]);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!song) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-50">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
      />
      
      <div className="max-w-screen-xl mx-auto">
        {/* Progress bar */}
        <div className="mb-4">
          <Slider
            value={[song.duration > 0 ? (currentTime / song.duration) * 100 : 0]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(song.duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Song info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <LazyImage
              src={song.image[1]?.url || song.image[0]?.url}
              alt={song.name}
              className="w-14 h-14 rounded object-cover"
            />
            <div className="min-w-0">
              <h4 className="font-medium truncate">{song.name}</h4>
              <p className="text-sm text-muted-foreground truncate">
                {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onToggleShuffle}
              className={isShuffle ? "text-primary" : ""}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onPrevious}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={onPlayPause}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={onNext}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onToggleRepeat}
              className={isRepeat ? "text-primary" : ""}
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="h-4 w-4" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
