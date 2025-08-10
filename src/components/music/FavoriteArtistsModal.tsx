
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Plus, Loader2 } from "lucide-react";
import { musicApi } from "@/services/musicApi";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [popularArtists, setPopularArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const saved = localStorage.getItem('favoriteArtists');
    if (saved) {
      setFavoriteArtists(JSON.parse(saved));
    }
    loadPopularArtists();
  }, []);

  const loadPopularArtists = async (page = 1) => {
    setPopularLoading(true);
    try {
      const artists = await musicApi.getPopularArtists(page, 20);
      if (page === 1) {
        setPopularArtists(artists);
      } else {
        setPopularArtists(prev => [...prev, ...artists]);
      }
      setHasMorePages(artists.length === 20);
    } catch (error) {
      console.error('Failed to load popular artists:', error);
      toast({
        title: "Error",
        description: "Failed to load popular artists",
        variant: "destructive"
      });
    } finally {
      setPopularLoading(false);
    }
  };

  const loadMoreArtists = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadPopularArtists(nextPage);
  };

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

  const content = (
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

      {/* Popular Artists */}
      <div className="space-y-2">
        <h3 className="font-medium">Popular Artists</h3>
        <div className={`grid gap-3 max-h-64 overflow-y-auto ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {popularArtists.map((artist) => (
            <div key={artist.id} className="flex flex-col items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="relative">
                {artist.image?.[0]?.url && (
                  <img
                    src={artist.image[0].url}
                    alt={artist.name}
                    className="w-16 h-16 rounded-full object-cover mb-2"
                  />
                )}
                <Button
                  size="sm"
                  onClick={() => addFavoriteArtist(artist)}
                  disabled={favoriteArtists.some(a => a.id === artist.id)}
                  className="absolute -bottom-1 -right-1 w-6 h-6 p-0 rounded-full"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <span className="font-medium text-sm text-center truncate w-full">{artist.name}</span>
            </div>
          ))}
        </div>
        {hasMorePages && (
          <Button 
            variant="outline" 
            onClick={loadMoreArtists}
            disabled={popularLoading}
            className="w-full"
          >
            {popularLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Load More Artists
          </Button>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Search Results</h3>
          <div className={`grid gap-3 max-h-48 overflow-y-auto ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {searchResults.map((artist) => (
              <div key={artist.id} className="flex flex-col items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="relative">
                  {artist.image?.[0]?.url && (
                    <img
                      src={artist.image[0].url}
                      alt={artist.name}
                      className="w-16 h-16 rounded-full object-cover mb-2"
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={() => addFavoriteArtist(artist)}
                    disabled={favoriteArtists.some(a => a.id === artist.id)}
                    className="absolute -bottom-1 -right-1 w-6 h-6 p-0 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="font-medium text-sm text-center truncate w-full">{artist.name}</span>
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
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Select Favorite Artists</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Favorite Artists</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default FavoriteArtistsModal;
