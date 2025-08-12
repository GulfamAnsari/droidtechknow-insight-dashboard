
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Music } from 'lucide-react';
import httpClient from '@/utils/httpClient';

interface LyricsViewProps {
  songName: string;
  artistName: string;
  songId?: string;
  onClose: () => void;
}

const LyricsView = ({ songName, artistName, songId, onClose }: LyricsViewProps) => {
  const { data: lyricsData, isLoading, error } = useQuery({
    queryKey: ['lyrics', songId, artistName, songName],
    queryFn: async () => {
      // First try Saavn API if songId is available
      if (songId) {
        try {
          const saavnResponse = await httpClient.get(`https://saavn.dev/api/lyrics?id=${songId}`, {
            skipAuth: true
          });
          if (saavnResponse?.data?.lyrics) {
            return { lyrics: saavnResponse.data.lyrics, source: 'saavn' };
          }
        } catch (error) {
          console.log('Saavn lyrics failed, trying other sources');
        }
      }

      // Clean artist and song names for better search
      const cleanArtist = artistName.replace(/[^\w\s]/gi, '').trim();
      const cleanSong = songName.replace(/[^\w\s]/gi, '').trim();

      // Try lyrics.ovh API
      try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanSong)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.lyrics) {
            return { lyrics: data.lyrics, source: 'lyrics.ovh' };
          }
        }
      } catch (error) {
        console.log('Lyrics.ovh failed');
      }

      // Try with different artist name variations
      const artistVariations = [
        cleanArtist.split(',')[0].trim(), // First artist only
        cleanArtist.split('&')[0].trim(), // Before &
        cleanArtist.split('feat')[0].trim(), // Before feat
      ];

      for (const artist of artistVariations) {
        try {
          const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(cleanSong)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.lyrics) {
              return { lyrics: data.lyrics, source: 'lyrics.ovh' };
            }
          }
        } catch (error) {
          console.log(`Failed with artist variation: ${artist}`);
        }
      }

      throw new Error('Lyrics not found');
    },
    enabled: !!(songName && artistName),
    staleTime: 0,
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Lyrics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {songName} - {artistName}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-96">
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          
          {error && (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Lyrics not available for this song</p>
              <p className="text-xs mt-2">Tried multiple sources but couldn't find lyrics</p>
            </div>
          )}
          
          {lyricsData?.lyrics && (
            <div>
              <div className="whitespace-pre-line leading-relaxed">
                {lyricsData.lyrics}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Source: {lyricsData.source}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LyricsView;
