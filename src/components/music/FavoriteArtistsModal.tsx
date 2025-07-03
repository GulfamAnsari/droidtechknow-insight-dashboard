
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Plus } from "lucide-react";
import { musicApi } from "@/services/musicApi";
import { useToast } from "@/hooks/use-toast";

interface Artist {
  id: string;
  name: string;
  image?: Array<{ url: string }>;
}

interface FavoriteArtistsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FavoriteArtistsModal = ({ open, onOpenChange }: FavoriteArtistsModalProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('favoriteArtists');
    if (saved) {
      setFavoriteArtists(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const results = await musicApi.search(searchQuery, 1, 10);
      setSearchResults(results.artists || []);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Search failed",
        description: "Unable to search for artists",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addFavoriteArtist = (artist: Artist) => {
    if (!favoriteArtists.find(a => a.id === artist.id)) {
      const updated = [...favoriteArtists, artist];
      setFavoriteArtists(updated);
      localStorage.setItem('favoriteArtists', JSON.stringify(updated));
      toast({
        title: "Artist added",
        description: `${artist.name} added to favorites`,
        variant: "success"
      });
    }
  };

  const removeFavoriteArtist = (artistId: string) => {
    const updated = favoriteArtists.filter(a => a.id !== artistId);
    setFavoriteArtists(updated);
    localStorage.setItem('favoriteArtists', JSON.stringify(updated));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Favorite Artists</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Section */}
          <div className="flex gap-2">
            <Input
              placeholder="Search for artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Search Results</h3>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {searchResults.map((artist) => (
                  <div key={artist.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      {artist.image?.[0]?.url && (
                        <img
                          src={artist.image[0].url}
                          alt={artist.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <span className="font-medium">{artist.name}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addFavoriteArtist(artist)}
                      disabled={favoriteArtists.some(a => a.id === artist.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favorite Artists */}
          <div className="space-y-2">
            <h3 className="font-medium">Your Favorite Artists ({favoriteArtists.length})</h3>
            <div className="flex flex-wrap gap-2">
              {favoriteArtists.map((artist) => (
                <Badge key={artist.id} variant="secondary" className="gap-2">
                  {artist.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeFavoriteArtist(artist.id)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FavoriteArtistsModal;
