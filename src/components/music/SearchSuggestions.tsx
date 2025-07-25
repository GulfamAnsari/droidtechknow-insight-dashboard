import { useState, useEffect, useRef } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Search,
  Clock,
  Music
} from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("musicSearchResults");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreviousSearches(Array.isArray(parsed) ? parsed : []);
      } catch {
        setPreviousSearches([]);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim().length > 1) {
      setIsLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await musicApi.searchByType("songs", searchQuery, 1, 8);
          setSuggestions(Array.isArray(results) ? results : []);
        } catch {
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSelectSong = (song: Song) => {
    const existing = localStorage.getItem("musicSearchResults");
    const existingSongs = existing ? JSON.parse(existing) : [];
    const updated = [song, ...existingSongs.filter((s: Song) => s.id !== song.id)];
    localStorage.setItem("musicSearchResults", JSON.stringify(updated));
    setPreviousSearches(updated);
    onSearchQueryChange(song.name);
    setIsOpen(false);
    onSelectSong(song);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
      setIsOpen(false);
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchQueryChange(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => setIsOpen(true);

  const showPreviousSearches = searchQuery.trim().length <= 1 && previousSearches.length > 0;
  const showSuggestions = suggestions.length > 0 && searchQuery.trim().length > 1;

  return (
    <div ref={wrapperRef} className="flex items-center gap-2 flex-1 relative">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <input
          ref={inputRef}
          placeholder="Search for songs, artists, albums..."
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onFocus={handleInputFocus}
          className="w-full pl-10 pr-4 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          autoComplete="off"
        />

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-96 overflow-hidden">
            <Command shouldFilter={false} className="w-full">
              <CommandList className="max-h-96">
                {isLoading && <CommandEmpty>Searching...</CommandEmpty>}

                {!isLoading && !showSuggestions && !showPreviousSearches && (
                  <CommandEmpty>
                    {searchQuery.trim().length > 1
                      ? "No songs found"
                      : "Start typing to see suggestions"}
                  </CommandEmpty>
                )}

                {showSuggestions && (
                  <CommandGroup heading="Search Results">
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

                {showPreviousSearches && (
                  <CommandGroup heading="Recent Searches">
                    {previousSearches.slice(0, 8).map((song) => (
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
          </div>
        )}
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
  );
};

export default SearchSuggestions;
