
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Heart, MoreHorizontal } from 'lucide-react';
import { musicApi, Song } from '@/services/musicApi';
import LazyImage from '@/components/ui/lazy-image';
import { useMusicContext } from '@/contexts/MusicContext';

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
  const { likedSongs: likedSongObjects } = useMusicContext();
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);
  const [popularArtists, setPopularArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [usedSongIds, setUsedSongIds] = useState<string[]>([]);

  useEffect(() => {
    loadHomepageData();
  }, [likedSongObjects]);

  const loadHomepageData = async () => {
    try {
      setLoading(true);
      
      // Load popular artists
      const artists = await musicApi.getPopularArtists();
      setPopularArtists(artists);

      // Get 10 random liked songs and fetch related songs
      await loadRelatedSongs();

    } catch (error) {
      console.error('Error loading homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedSongs = async () => {
    if (likedSongObjects.length === 0) {
      // If no liked songs, load trending songs
      const trendingSongs = await musicApi.getTrendingSongs();
      setRelatedSongs(trendingSongs.slice(0, 20));
      setUsedSongIds(trendingSongs.slice(0, 20).map(song => song.id));
      return;
    }

    const randomLikedSongs = getRandomSongs(likedSongObjects, 10);
    const newRelatedSongs: Song[] = [];
    const newUsedIds: string[] = [...usedSongIds];

    for (const likedSong of randomLikedSongs) {
      try {
        // Get related songs based on artists
        const artists = likedSong.artists?.primary?.map(a => a.name).join(', ') || '';
        if (artists) {
          const searchResults = await musicApi.searchByType('songs', artists, 1, 5);
          const uniqueSongs = searchResults.filter(song => 
            !newUsedIds.includes(song.id) && 
            !likedSongs.includes(song.id)
          );
          
          newRelatedSongs.push(...uniqueSongs.slice(0, 2));
          newUsedIds.push(...uniqueSongs.slice(0, 2).map(song => song.id));
        }
      } catch (error) {
        console.error('Error fetching related songs:', error);
      }
    }

    setRelatedSongs(prev => loadingMore ? [...prev, ...newRelatedSongs] : newRelatedSongs);
    setUsedSongIds(newUsedIds);
  };

  const getRandomSongs = (songs: Song[], count: number) => {
    const shuffled = [...songs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, songs.length));
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await loadRelatedSongs();
    setLoadingMore(false);
  };

  const handlePlaySong = (song: Song) => {
    setPlaylist([...relatedSongs]);
    onPlaySong(song);
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
      {/* Related Songs Based on Liked Songs */}
      <section>
        <h2 className="text-2xl font-bold mb-4">
          {likedSongObjects.length > 0 ? 'Recommended for You' : 'Trending Songs'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {relatedSongs.map((song) => (
            <Card
              key={song.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
            >
              <CardContent className="p-4">
                <div className="relative mb-3">
                  <LazyImage
                    src={song.image?.[1]?.url || song.image?.[0]?.url}
                    alt={song.name}
                    className="w-full aspect-square rounded-lg object-cover"
                    onClick={() => handlePlaySong(song)}
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(song.id);
                    }}
                    variant="ghost"
                    size="sm"
                    className={`absolute top-2 right-2 bg-black/50 hover:bg-black/70 ${
                      likedSongs.includes(song.id) ? 'text-red-500' : 'text-white'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${likedSongs.includes(song.id) ? 'fill-current' : ''}`} />
                  </Button>
                </div>
                <div onClick={() => handlePlaySong(song)}>
                  <h3 className="font-medium text-sm truncate">{song.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {song.artists?.primary?.map((a) => a.name).join(', ') || 'Unknown Artist'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDuration(song.duration)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Load More Button */}
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            disabled={loadingMore}
            className="gap-2"
          >
            {loadingMore ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
            Load More Songs
          </Button>
        </div>
      </section>

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
    </div>
  );
};

export default MusicHomepage;
