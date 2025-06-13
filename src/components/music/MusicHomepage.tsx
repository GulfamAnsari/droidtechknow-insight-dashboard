
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Heart } from 'lucide-react';
import { musicApi, Song } from '@/services/musicApi';
import LazyImage from '@/components/ui/lazy-image';

interface MusicHomepageProps {
  onPlaySong: (song: Song) => void;
  onNavigateToContent: (type: 'album' | 'artist' | 'playlist', item: any) => void;
  currentSong: Song | null;
  onToggleLike: (songId: string) => void;
  likedSongs: string[];
  isPlaying: boolean;
  setPlaylist: (songs: Song[]) => void;
}

const MusicHomepage = ({
  onPlaySong,
  onNavigateToContent,
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
      const trendingSongs = await musicApi.getTrendingSongs();
      setTrendingSongs(trendingSongs);

      // Load top charts
      const charts = await musicApi.searchByType('playlists', 'bollywood', 1, 50);
      setTopCharts(charts);

      // Load popular artists
      const artists = await musicApi.getPopularArtists();
      setPopularArtists(artists);

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

  const handleMoodChange = async (mood: string) => {
    try {
      const songs = await musicApi.searchByType('songs', `${mood} song`, 1, 10);
      if (songs.length > 0) {
        setPlaylist(songs);
        onPlaySong(songs[0]);
      }
    } catch (error) {
      console.error(`Error loading ${mood}:`, error);
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

  return (
    <div className="space-y-8">
     

      {/* Popular Artists */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Popular Artists</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-3">
          {popularArtists.map((artist) => (
            <Card
              key={artist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => onNavigateToContent('artist', artist)}
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
                <h3 className="font-medium text-xs truncate text-center">{artist.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Top Charts */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Top Charts</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-3">
          {topCharts.map((chart) => (
            <Card
              key={chart.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => onNavigateToContent('playlist', chart)}
            >
              <CardContent className="p-2">
                <div className="relative mb-2">
                  <LazyImage
                    src={chart.image?.[1]?.url || chart.image?.[0]?.url}
                    alt={chart.name || chart.title}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </div>
                <h3 className="font-medium text-xs truncate">{chart.name || chart.title}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MusicHomepage;
