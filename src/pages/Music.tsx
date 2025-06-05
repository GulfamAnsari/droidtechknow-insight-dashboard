
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Play, Pause, SkipBack, SkipForward, Volume2, Music as MusicIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import httpClient from "@/utils/httpClient";
import { Slider } from "@/components/ui/slider";
import LazyImage from "@/components/ui/lazy-image";

interface Song {
  id: string;
  name: string;
  artist: {
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

const Music = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([70]);

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['songs', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const response = await httpClient.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery)}`, {
        skipAuth: true
      });
      return response;
    },
    enabled: false
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-purple-900/20 to-blue-900/20">
      {/* Header */}
      <div className="p-6 border-b">
        <h1 className="text-3xl font-bold text-foreground mb-4">Music Player</h1>
        
        {/* Search Bar */}
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Search for songs, artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {searchResults?.data?.results && (
          <div className="grid gap-4">
            <h2 className="text-xl font-semibold">Search Results</h2>
            <div className="grid gap-3">
              {searchResults.data.results.map((song: Song) => (
                <Card key={song.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => playSong(song)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <LazyImage
                        src={song.image[1]?.url || song.image[0]?.url}
                        alt={song.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{song.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {song.artist.primary.map(a => a.name).join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(song.duration)}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!searchResults && !isLoading && (
          <div className="text-center py-12">
            <MusicIcon size={64} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Discover Music</h3>
            <p className="text-muted-foreground">Search for your favorite songs and artists to get started</p>
          </div>
        )}
      </div>

      {/* Music Player */}
      {currentSong && (
        <div className="border-t bg-background/95 backdrop-blur p-4">
          <div className="flex items-center gap-4">
            <LazyImage
              src={currentSong.image[1]?.url || currentSong.image[0]?.url}
              alt={currentSong.name}
              className="w-12 h-12 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{currentSong.name}</h4>
              <p className="text-sm text-muted-foreground truncate">
                {currentSong.artist.primary.map(a => a.name).join(", ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 w-24">
              <Volume2 className="h-4 w-4" />
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={100}
                step={1}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Music;
