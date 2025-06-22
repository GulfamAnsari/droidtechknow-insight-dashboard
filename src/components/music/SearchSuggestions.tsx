import { useState, useEffect, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Clock, Music } from "lucide-react";
import { musicApi, Song } from "@/services/musicApi";
import { Button } from "@/components/ui/button";

interface SearchSuggestionsProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelectSong: (song: Song) => void;
  onSearch: () => void;
}

const SearchSuggestions = ({
  searchQuery,
  onSearchQueryChange,
  onSelectSong,
  onSearch
}: SearchSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [previousSearches, setPreviousSearches] = useState<Song[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load previous searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('musicSearchResults');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreviousSearches(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error('Error parsing stored search results:', error);
        setPreviousSearches([]);
      }
    }
  }, []);

  // Debounced search for suggestions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.trim().length > 2) {
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const results = await musicApi.searchByType('songs', searchQuery, 1, 5);
          setSuggestions(Array.isArray(results) ? results : []);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectSong = (song: Song) => {
    // Add to search results history
    const existing = localStorage.getItem('musicSearchResults');
    const existingSongs = existing ? JSON.parse(existing) : [];
    
    // Add new song to the beginning and remove duplicates
    const updated = [song, ...existingSongs.filter((s: Song) => s.id !== song.id)];
    
    // Keep only the latest 20 songs
    const limited = updated.slice(0, 20);
    
    localStorage.setItem('musicSearchResults', JSON.stringify(limited));
    setPreviousSearches(limited);
    
    // Update search query and close suggestions
    onSearchQueryChange(song.name);
    setIsOpen(false);
    
    // Select the song
    onSelectSong(song);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search for songs, artists, albums, playlists..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button
            onClick={() => {
              onSearch();
              setIsOpen(false);
            }}
            size="icon"
            variant="default"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="start">
        <Command>
          <CommandList>
            {isLoading && (
              <CommandEmpty>Searching...</CommandEmpty>
            )}
            
            {!isLoading && suggestions.length === 0 && searchQuery.trim().length <= 2 && previousSearches.length === 0 && (
              <CommandEmpty>Start typing to see suggestions</CommandEmpty>
            )}

            {!isLoading && suggestions.length === 0 && searchQuery.trim().length > 2 && (
              <CommandEmpty>No songs found</CommandEmpty>
            )}

            {/* Live suggestions */}
            {suggestions.length > 0 && (
              <CommandGroup heading="Suggestions">
                {suggestions.map((song) => (
                  <CommandItem
                    key={song.id}
                    onSelect={() => handleSelectSong(song)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-muted rounded flex-shrink-0">
                      <img
                        src={song.image?.[0]?.url}
                        alt={song.name}
                        className="w-10 h-10 rounded object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{song.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
                      </p>
                    </div>
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Previous searches */}
            {previousSearches.length > 0 && suggestions.length === 0 && (
              <CommandGroup heading="Recent Searches">
                {previousSearches.slice(0, 5).map((song) => (
                  <CommandItem
                    key={`recent-${song.id}`}
                    onSelect={() => handleSelectSong(song)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-muted rounded flex-shrink-0">
                      <img
                        src={song.image?.[0]?.url}
                        alt={song.name}
                        className="w-10 h-10 rounded object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{song.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown Artist"}
                      </p>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchSuggestions;
