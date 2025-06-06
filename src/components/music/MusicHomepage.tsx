
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Heart } from 'lucide-react';
import httpClient from '@/utils/httpClient';
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

interface MusicHomepageProps {
  onPlaySong: (song: Song) => void;
  onOpenBottomSheet: (content: any) => void;
  currentSong: Song | null;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  isPlaying: boolean;
  setPlaylist: (songs: Song[]) => void;
}

const MusicHomepage = ({
  onPlaySong,
  onOpenBottomSheet,
  currentSong,
  onToggleLike,
  likedSongs,
  isPlaying,
  setPlaylist
}: MusicHomepageProps) => {
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [topCharts, setTopCharts] = useState<any[]>([]);
  const [popularArtists, setPopularArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomepageData();
  }, []);

  const loadHomepageData = async () => {
    try {
      setLoading(true);
      
      // Load trending songs
      const trendingResponse = await httpClient.get('https://saavn.dev/api/search/songs?query=trending&limit=10', { skipAuth: true });
      setTrendingSongs(trendingResponse?.data?.results || []);

      // Load top charts
      const chartsResponse = await httpClient.get('https://saavn.dev/api/search/playlists?query=new&limit=50', { skipAuth: true });
      setTopCharts(chartsResponse?.data?.results || []);

      // Load popular artists
      const artistsResponse = await httpClient.get('https://saavn.dev/api/search/artists?query=popular artists&limit=50', { skipAuth: true });
      setPopularArtists(artistsResponse?.data?.results || []);

    } catch (error) {
      console.error('Error loading homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = (song: Song) => {
    setPlaylist(trendingSongs);
    onPlaySong(song);
  };

  const handleOpenContent = async (type: 'artist' | 'playlist', item: any) => {
    try {
      let response;
      let songs = [];

      if (type === 'artist') {
        response = await httpClient.get(`https://saavn.dev/api/artists/${item.id}/songs`, { skipAuth: true });
        songs = response?.data?.songs || [];
      } else if (type === 'playlist') {
        response = await httpClient.get(`https://saavn.dev/api/playlists?id=${item.id}`, { skipAuth: true });
        songs = response?.data?.songs || [];
      }

      onOpenBottomSheet({
        type,
        id: item.id,
        name: item.name || item.title,
        songs,
        image: item.image?.[1]?.url || item.image?.[0]?.url,
      });
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleMoodChange = async (moods) => {
    try {

      const response = await httpClient.get(`https://saavn.dev/api/search/songs?query=${moods} song&limit=10`, { skipAuth: true });
      const songs = response?.data?.results || [];
      onOpenBottomSheet({
        type: "mood",
        name: moods,
        songs,
      });
    } catch (error) {
      console.error(`Error loading ${moods}:`, error);
    }
  }

  return (
    <div className="space-y-8">
      {/* Trending Songs */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Trending Songs</h2>
        <div className="space-y-2">
          {trendingSongs.map((song, index) => (
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
                  src={song.image[0]?.url}
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
              <span className="text-sm text-muted-foreground w-8">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{song.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
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
                    onToggleLike(song.id);
                  }}
                  className={likedSongs.includes(song.id) ? "text-red-500" : ""}
                >
                  <Heart className={`h-4 w-4 ${likedSongs.includes(song.id) ? "fill-current" : ""}`} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Moods  */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Select your Moond</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {["Romantic", "Happy", "Sad", "Calm", "Relax", "Slow", "Dance"].map((moods, i) => (
            <Card
              key={i}
              className="cursor-pointer hover:shadow-sm transition-shadow group"
              onClick={() => handleMoodChange(moods)}
            >
              <CardContent className="p-3">
                <div className="relative mb-2">
                  <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-sm truncate text-center">{moods}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      {/* Popular Artists */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Popular Artists</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-4">
          {popularArtists.map((artist) => (
            <Card
              key={artist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => handleOpenContent('artist', artist)}
            >
              <CardContent className="p-3">
                <div className="relative mb-2">
                  <LazyImage
                    src={artist.image?.[1]?.url || artist.image?.[0]?.url}
                    alt={artist.name}
                    className="w-full aspect-square rounded-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-sm truncate text-center">{artist.name}</h3>
                <p className="text-xs text-muted-foreground text-center">Artist</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Top Charts */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Top Charts</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-4">
          {topCharts.map((chart) => (
            <Card
              key={chart.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => handleOpenContent('playlist', chart)}
            >
              <CardContent className="p-3">
                <div className="relative mb-2">
                  <LazyImage
                    src={chart.image?.[1]?.url || chart.image?.[0]?.url}
                    alt={chart.name || chart.title}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-sm truncate">{chart.name || chart.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{chart.subtitle || 'Playlist'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MusicHomepage;
