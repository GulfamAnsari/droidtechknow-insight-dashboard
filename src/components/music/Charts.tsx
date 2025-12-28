
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, TrendingUp } from 'lucide-react';
import httpClient from '@/utils/httpClient';
import LazyImage from '@/components/ui/lazy-image';
import { SAVAN_URL } from '@/services/config';

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

interface ChartsProps {
  onPlaySong: (song: Song) => void;
}

const Charts = ({ onPlaySong }: ChartsProps) => {
  const { data: chartsData, isLoading } = useQuery({
    queryKey: ['charts'],
    queryFn: async () => {
      const response = await httpClient.get(`${SAVAN_URL}/api/charts`, {
        skipAuth: true
      });
      return response;
    },
    staleTime: 0,
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Top Charts</h2>
      </div>

      {chartsData?.data && Object.entries(chartsData.data).map(([chartName, songs]: [string, any]) => (
        <Card key={chartName}>
          <CardHeader>
            <CardTitle className="capitalize">{chartName.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {songs?.slice(0, 10).map((song: Song, index: number) => (
              <div key={song.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => onPlaySong(song)}>
                <div className="w-8 text-center font-bold text-muted-foreground">
                  {index + 1}
                </div>
                <LazyImage
                  src={song.image[1]?.url || song.image[0]?.url}
                  alt={song.name}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{song.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDuration(song.duration)}
                </div>
                <Button size="sm" variant="ghost">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Charts;
