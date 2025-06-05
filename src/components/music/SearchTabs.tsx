
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Download } from 'lucide-react';
import LazyImage from '@/components/ui/lazy-image';
import { useQuery } from '@tanstack/react-query';
import httpClient from '@/utils/httpClient';

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

interface Album {
  id: string;
  name: string;
  primaryArtists: string;
  image: {
    quality: string;
    url: string;
  }[];
  year: string;
}

interface Artist {
  id: string;
  name: string;
  image: {
    quality: string;
    url: string;
  }[];
  followerCount: string;
}

interface SearchTabsProps {
  searchResults: {
    songs?: { data: { results: Song[] } };
    albums?: { data: {results: Album[] }};
    artists?: { data: {results: Artist[] }};
  } | null;
  onPlaySong: (song: Song) => void;
  onPlayAlbum: (albumId: string) => void;
  onPlayArtist: (artistId: string) => void;
  isLoading: boolean;
}

const SearchTabs = ({ searchResults, onPlaySong, onPlayAlbum, onPlayArtist, isLoading }: SearchTabsProps) => {
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // Fetch album details when an album is selected
  const { data: albumData } = useQuery({
    queryKey: ['album', selectedAlbum],
    queryFn: async () => {
      const response = await httpClient.get(`https://saavn.dev/api/albums?id=${selectedAlbum}`, {
        skipAuth: true
      });
      return response;
    },
    enabled: !!selectedAlbum
  });

  // Fetch artist details when an artist is selected
  const { data: artistData } = useQuery({
    queryKey: ['artist', selectedArtist],
    queryFn: async () => {
      const response = await httpClient.get(`https://saavn.dev/api/artists?id=${selectedArtist}`, {
        skipAuth: true
      });
      return response;
    },
    enabled: !!selectedArtist
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadSong = (song: Song) => {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!searchResults) return null;

  // Show album songs if an album is selected
  if (selectedAlbum && albumData?.data?.songs) {
    return (
      <div className="space-y-4">
        <Button onClick={() => setSelectedAlbum(null)} variant="outline" className="mb-4">
          ← Back to Search Results
        </Button>
        <h2 className="text-xl font-bold mb-4">{albumData.data.name} - Songs</h2>
        {albumData.data.songs.map((song: Song) => (
          <Card key={song.id} className="hover:shadow-md transition-shadow">
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
                    {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(song.duration)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => onPlaySong(song)}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadSong(song)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show artist songs if an artist is selected
  if (selectedArtist && artistData?.data?.topSongs) {
    return (
      <div className="space-y-4">
        <Button onClick={() => setSelectedArtist(null)} variant="outline" className="mb-4">
          ← Back to Search Results
        </Button>
        <h2 className="text-xl font-bold mb-4">{artistData.data.name} - Top Songs</h2>
        {artistData.data.topSongs.map((song: Song) => (
          <Card key={song.id} className="hover:shadow-md transition-shadow">
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
                    {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(song.duration)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => onPlaySong(song)}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadSong(song)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="songs" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="songs">Songs</TabsTrigger>
        <TabsTrigger value="albums">Albums</TabsTrigger>
        <TabsTrigger value="artists">Artists</TabsTrigger>
      </TabsList>

      <TabsContent value="songs" className="space-y-4">
        {searchResults.songs?.data?.results?.map((song: Song) => (
          <Card key={song.id} className="hover:shadow-md transition-shadow">
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
                    {song.artists?.primary?.map(a => a.name).join(", ") || "Unknown Artist"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(song.duration)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => onPlaySong(song)}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => downloadSong(song)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="albums" className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {searchResults.albums?.data?.results?.map((album: Album) => (
            <Card key={album.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedAlbum(album.id)}>
              <CardContent className="p-4">
                <LazyImage
                  src={album.image[1]?.url || album.image[0]?.url}
                  alt={album.name}
                  className="w-full aspect-square rounded-lg object-cover mb-3"
                />
                <h3 className="font-medium truncate">{album.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{album.primaryArtists}</p>
                <p className="text-xs text-muted-foreground">{album.year}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="artists" className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {searchResults.artists?.data?.results?.map((artist: Artist) => (
            <Card key={artist.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedArtist(artist.id)}>
              <CardContent className="p-4 text-center">
                <LazyImage
                  src={artist.image[1]?.url || artist.image[0]?.url}
                  alt={artist.name}
                  className="w-24 h-24 rounded-full object-cover mx-auto mb-3"
                />
                <h3 className="font-medium truncate">{artist.name}</h3>
                <p className="text-sm text-muted-foreground">{artist.followerCount} followers</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default SearchTabs;
