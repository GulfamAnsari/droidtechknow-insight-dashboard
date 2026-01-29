import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Radio, Loader2, Users, ListMusic, TrendingUp, Sparkles, Music2, ChevronRight } from "lucide-react";
import { musicApi, Song, Artist, Playlist } from "@/services/musicApi";
import LazyImage from "@/components/ui/lazy-image";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface RadioCategory {
  id: string;
  name: string;
  queries: string[];
  playlistIds?: string[];
  gradient: string;
  emoji: string;
}

const RADIO_CATEGORIES: RadioCategory[] = [
  // Top Picks
  { id: "bollywood-hits", name: "Bollywood Hits", queries: ["bollywood top 50", "hindi chartbusters"], playlistIds: ["1134543272", "1134770509"], gradient: "from-orange-500 to-red-500", emoji: "🎬" },
  { id: "romantic", name: "Romantic", queries: ["romantic bollywood", "love songs hindi 2024"], playlistIds: ["1134543285", "74313682"], gradient: "from-pink-500 to-rose-500", emoji: "❤️" },
  { id: "party", name: "Party", queries: ["party anthems bollywood", "dance floor hits"], playlistIds: ["1134543277", "82914609"], gradient: "from-red-500 to-orange-500", emoji: "🎉" },
  { id: "sad", name: "Sad Songs", queries: ["dard bhare geet", "breakup songs hindi"], playlistIds: ["1134550498"], gradient: "from-slate-500 to-gray-600", emoji: "💔" },
  
  // Regional
  { id: "punjabi", name: "Punjabi", queries: ["punjabi top hits", "latest punjabi songs 2024"], playlistIds: ["1134543307", "1029579349"], gradient: "from-orange-400 to-yellow-500", emoji: "🦁" },
  { id: "tamil", name: "Tamil", queries: ["tamil hits 2024", "kollywood songs"], playlistIds: ["1134543292"], gradient: "from-green-500 to-teal-500", emoji: "🌴" },
  { id: "telugu", name: "Telugu", queries: ["telugu latest hits", "tollywood songs 2024"], playlistIds: ["1134543299"], gradient: "from-yellow-500 to-orange-500", emoji: "🌺" },
  { id: "malayalam", name: "Malayalam", queries: ["malayalam songs 2024", "mollywood hits"], gradient: "from-emerald-500 to-green-500", emoji: "🌿" },
  
  // Decades
  { id: "90s", name: "90s Hits", queries: ["90s bollywood gold", "evergreen 90s hindi"], playlistIds: ["1134770516"], gradient: "from-purple-500 to-indigo-500", emoji: "📼" },
  { id: "80s", name: "80s Classic", queries: ["80s bollywood classics", "kishore kumar hits"], playlistIds: ["1134770523"], gradient: "from-teal-500 to-cyan-500", emoji: "🎹" },
  { id: "2000s", name: "2000s", queries: ["2000s bollywood", "early 2000s hindi hits"], gradient: "from-blue-500 to-purple-500", emoji: "💿" },
  { id: "new-releases", name: "New Releases", queries: ["new hindi songs 2024", "latest bollywood 2024"], playlistIds: ["1134543265"], gradient: "from-pink-400 to-purple-500", emoji: "✨" },
  
  // Mood & Genre
  { id: "lofi", name: "Lo-Fi", queries: ["lofi bollywood", "lofi chill beats"], playlistIds: ["1134684498"], gradient: "from-violet-500 to-purple-600", emoji: "🌙" },
  { id: "workout", name: "Workout", queries: ["gym motivation hindi", "workout songs bollywood"], playlistIds: ["1134684545"], gradient: "from-green-500 to-emerald-500", emoji: "💪" },
  { id: "chill", name: "Chill Vibes", queries: ["chill hindi songs", "relaxing bollywood"], gradient: "from-sky-400 to-blue-500", emoji: "😌" },
  { id: "drive", name: "Long Drive", queries: ["long drive songs hindi", "road trip bollywood"], gradient: "from-indigo-500 to-blue-600", emoji: "🚗" },
  
  // Artists
  { id: "arijit", name: "Arijit Singh", queries: ["arijit singh hits", "arijit singh romantic"], gradient: "from-red-500 to-rose-600", emoji: "🎙️" },
  { id: "ar-rahman", name: "A.R. Rahman", queries: ["ar rahman hits", "rahman melodies"], gradient: "from-teal-500 to-emerald-500", emoji: "🏆" },
  { id: "shreya", name: "Shreya Ghoshal", queries: ["shreya ghoshal songs", "shreya ghoshal hits"], gradient: "from-pink-400 to-rose-500", emoji: "👑" },
  { id: "honey-singh", name: "Yo Yo Honey Singh", queries: ["honey singh hits", "honey singh party songs"], gradient: "from-yellow-400 to-orange-500", emoji: "🔥" },
  
  // International
  { id: "english", name: "English Hits", queries: ["english pop hits 2024", "billboard hot 100"], playlistIds: ["1134770495"], gradient: "from-blue-500 to-cyan-500", emoji: "🌍" },
  { id: "kpop", name: "K-Pop", queries: ["kpop hits 2024", "bts songs"], gradient: "from-pink-400 to-purple-400", emoji: "🇰🇷" },
  
  // Devotional
  { id: "bhajan", name: "Bhajan", queries: ["krishna bhajan", "morning bhajan"], gradient: "from-orange-500 to-amber-500", emoji: "🙏" },
  { id: "sufi", name: "Sufi", queries: ["sufi songs", "qawwali"], gradient: "from-rose-600 to-pink-500", emoji: "🌹" },
];

const FEATURED_PLAYLISTS = [
  { id: "1134543272", name: "Bollywood Top 50", gradient: "from-red-500 to-orange-500" },
  { id: "1134543265", name: "New Releases", gradient: "from-purple-500 to-pink-500" },
  { id: "1134543277", name: "Party Hits", gradient: "from-yellow-500 to-red-500" },
  { id: "1134543285", name: "Romantic Songs", gradient: "from-pink-500 to-rose-500" },
  { id: "1134770509", name: "Hindi Chartbusters", gradient: "from-blue-500 to-indigo-500" },
  { id: "1134543307", name: "Punjabi Beats", gradient: "from-orange-400 to-yellow-500" },
  { id: "1134684498", name: "Lo-Fi Chill", gradient: "from-violet-500 to-purple-600" },
  { id: "1134684545", name: "Workout Mix", gradient: "from-green-500 to-emerald-500" },
];

interface ExploreTabProps {
  onPlaySong: (song: Song) => void;
  onNavigateToContent: (type: "album" | "artist" | "playlist", item: any) => void;
  setPlaylist: (songs: Song[]) => void;
}

const ExploreTab = ({ onPlaySong, onNavigateToContent, setPlaylist }: ExploreTabProps) => {
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState<string | null>(null);
  const [activeRadio, setActiveRadio] = useState<string | null>(null);
  const [popularArtists, setPopularArtists] = useState<Artist[]>([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [artistPage, setArtistPage] = useState(1);
  const [showAllRadio, setShowAllRadio] = useState(false);
  const [showAllArtists, setShowAllArtists] = useState(false);
  
  const isFetchingArtists = useRef(false);
  const artistSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadExploreData();
  }, []);

  const loadExploreData = async () => {
    setLoading(true);
    try {
      const [artists, playlists] = await Promise.all([
        musicApi.getPopularArtists(1, 20),
        musicApi.searchByType("playlists", "trending bollywood", 1, 10)
      ]);
      setPopularArtists(artists || []);
      setTrendingPlaylists(playlists || []);
    } catch (error) {
      console.error("Failed to load explore data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreArtists = useCallback(async () => {
    if (isFetchingArtists.current) return;
    isFetchingArtists.current = true;
    try {
      const artists = await musicApi.getPopularArtists(artistPage + 1, 20);
      if (artists?.length) {
        setArtistPage(p => p + 1);
        setPopularArtists(prev => [...prev, ...artists]);
      }
    } catch (error) {
      console.error("Failed to load more artists:", error);
    } finally {
      isFetchingArtists.current = false;
    }
  }, [artistPage]);

  useEffect(() => {
    if (!showAllArtists || !artistSentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMoreArtists();
    }, { rootMargin: "300px", threshold: 0.1 });
    obs.observe(artistSentinelRef.current);
    return () => obs.disconnect();
  }, [showAllArtists, loadMoreArtists]);

  const playRadio = async (category: RadioCategory) => {
    if (loadingCategory) return;
    setLoadingCategory(category.id);
    
    try {
      let songs: Song[] = [];
      
      if (category.playlistIds?.length) {
        const randomPlaylistId = category.playlistIds[Math.floor(Math.random() * category.playlistIds.length)];
        try {
          songs = await musicApi.getPlaylistSongs(randomPlaylistId);
        } catch (e) {
          console.log("Playlist fetch failed, falling back to search");
        }
      }
      
      if (songs.length === 0) {
        const randomQuery = category.queries[Math.floor(Math.random() * category.queries.length)];
        const randomPage = Math.floor(Math.random() * 3) + 1;
        const results = await musicApi.search(randomQuery, randomPage, 40);
        songs = results.songs;
      }
      
      if (songs.length > 0) {
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        setPlaylist(shuffled);
        setActiveRadio(category.id);
        onPlaySong(shuffled[0]);
      }
    } catch (error) {
      console.error("Failed to load radio:", error);
    } finally {
      setLoadingCategory(null);
    }
  };

  const playFeaturedPlaylist = async (playlist: typeof FEATURED_PLAYLISTS[0]) => {
    if (loadingPlaylist) return;
    setLoadingPlaylist(playlist.id);
    
    try {
      const songs = await musicApi.getPlaylistSongs(playlist.id);
      if (songs.length > 0) {
        setPlaylist(songs);
        onPlaySong(songs[0]);
      }
    } catch (error) {
      console.error("Failed to load playlist:", error);
    } finally {
      setLoadingPlaylist(null);
    }
  };

  const displayedRadioCategories = showAllRadio ? RADIO_CATEGORIES : RADIO_CATEGORIES.slice(0, 12);
  const displayedArtists = showAllArtists ? popularArtists : popularArtists.slice(0, 12);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-6">
      {/* Featured Playlists */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Featured Playlists</h2>
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-4">
            {FEATURED_PLAYLISTS.map((playlist) => (
              <Card
                key={playlist.id}
                className="cursor-pointer hover:scale-105 transition-all duration-200 overflow-hidden shrink-0 w-32"
                onClick={() => playFeaturedPlaylist(playlist)}
              >
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${playlist.gradient} p-4 aspect-square flex flex-col items-center justify-center relative`}>
                    <ListMusic className="h-8 w-8 text-white/80 mb-2" />
                    <span className="text-white font-semibold text-xs text-center drop-shadow-md line-clamp-2 whitespace-normal">
                      {playlist.name}
                    </span>
                    
                    {loadingPlaylist === playlist.id ? (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-8 w-8 text-white fill-white" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* Radio Stations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Radio Stations</h2>
            <span className="text-xs text-muted-foreground">({RADIO_CATEGORIES.length})</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAllRadio(!showAllRadio)}
            className="text-xs"
          >
            {showAllRadio ? "Show Less" : "See All"}
            <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAllRadio ? "rotate-90" : ""}`} />
          </Button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {displayedRadioCategories.map((category) => (
            <Card
              key={category.id}
              className={`cursor-pointer hover:scale-105 transition-all duration-200 overflow-hidden ${
                activeRadio === category.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => playRadio(category)}
            >
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${category.gradient} p-3 aspect-square flex flex-col items-center justify-center relative`}>
                  <span className="text-2xl mb-1">{category.emoji}</span>
                  <span className="text-white font-semibold text-xs text-center drop-shadow-md line-clamp-2">
                    {category.name}
                  </span>
                  
                  {loadingCategory === category.id ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  )}
                  
                  {activeRadio === category.id && loadingCategory !== category.id && (
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Popular Artists */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Popular Artists</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAllArtists(!showAllArtists)}
            className="text-xs"
          >
            {showAllArtists ? "Show Less" : "See All"}
            <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAllArtists ? "rotate-90" : ""}`} />
          </Button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
          {displayedArtists.map((artist) => (
            <Card
              key={artist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => onNavigateToContent("artist", artist)}
            >
              <CardContent className="p-2 text-center">
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
                <h3 className="font-medium text-xs truncate">{artist.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {showAllArtists && (
          <div ref={artistSentinelRef} className="h-12 flex items-center justify-center mt-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </section>

      {/* Trending Playlists */}
      {trendingPlaylists.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Trending Playlists</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {trendingPlaylists.map((playlist) => (
              <Card
                key={playlist.id}
                className="cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => onNavigateToContent("playlist", playlist)}
              >
                <CardContent className="p-2">
                  <div className="relative mb-2">
                    <LazyImage
                      src={playlist.image?.[1]?.url || playlist.image?.[0]?.url}
                      alt={playlist.name}
                      className="w-full aspect-square rounded-lg object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="font-medium text-sm truncate">{playlist.name}</h3>
                  {playlist.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{playlist.subtitle}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ExploreTab;
