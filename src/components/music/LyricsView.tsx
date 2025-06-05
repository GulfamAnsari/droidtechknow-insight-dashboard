
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Music } from 'lucide-react';
import httpClient from '@/utils/httpClient';

interface LyricsViewProps {
  songId: string;
  songName: string;
  artistName: string;
  onClose: () => void;
}

const LyricsView = ({ songId, songName, artistName, onClose }: LyricsViewProps) => {
  const { data: lyricsData, isLoading, error } = useQuery({
    queryKey: ['lyrics', songId],
    queryFn: async () => {
      const response = await httpClient.get(`https://saavn.dev/api/lyrics?id=${songId}`, {
        skipAuth: true
      });
      return response;
    },
    enabled: !!songId
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
            </div>
          )}
          
          {lyricsData?.data?.lyrics && (
            <div className="whitespace-pre-line leading-relaxed">
              {lyricsData.data.lyrics}
            </div>
          )}
          
          {lyricsData && !lyricsData.data?.lyrics && (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No lyrics found for this song</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LyricsView;
