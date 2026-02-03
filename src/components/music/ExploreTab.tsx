import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Radio, Loader2, Users, ListMusic, Clock, Heart, ChevronRight } from "lucide-react";
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

const MOOD_PLAYLISTS = [
  { id: "romantic", name: "Romantic", emoji: "❤️", gradient: "from-pink-500 to-rose-500", queries: ["romantic bollywood", "love songs hindi"], playlistIds: ["1134543285", "74313682"] },
  { id: "party", name: "Party", emoji: "🎉", gradient: "from-red-500 to-orange-500", queries: ["party anthems bollywood"], playlistIds: ["1134543277", "82914609"] },
  { id: "sad", name: "Sad", emoji: "💔", gradient: "from-slate-500 to-gray-600", queries: ["sad songs hindi", "heartbreak songs"], playlistIds: ["1134550498"] },
  { id: "workout", name: "Workout", emoji: "💪", gradient: "from-green-500 to-emerald-500", queries: ["gym motivation hindi"], playlistIds: ["1134684545"] },
  { id: "chill", name: "Chill", emoji: "😌", gradient: "from-sky-400 to-blue-500", queries: ["chill hindi songs", "relaxing bollywood"] },
  { id: "focus", name: "Focus", emoji: "🎯", gradient: "from-indigo-500 to-purple-500", queries: ["focus music", "study music hindi"] },
  { id: "sleep", name: "Sleep", emoji: "🌙", gradient: "from-violet-600 to-purple-700", queries: ["sleep music", "calm hindi songs"] },
  { id: "drive", name: "Long Drive", emoji: "🚗", gradient: "from-indigo-500 to-blue-600", queries: ["long drive songs hindi", "road trip bollywood"] },
  { id: "lofi", name: "Lo-Fi", emoji: "🎧", gradient: "from-violet-500 to-purple-600", queries: ["lofi bollywood", "lofi chill"], playlistIds: ["1134684498"] },
  { id: "sufi", name: "Sufi", emoji: "🌹", gradient: "from-rose-600 to-pink-500", queries: ["sufi songs", "qawwali"] },
  { id: "devotional", name: "Devotional", emoji: "🙏", gradient: "from-amber-500 to-orange-500", queries: ["morning bhajan", "devotional songs"] },
  { id: "rain", name: "Rain Vibes", emoji: "🌧️", gradient: "from-cyan-500 to-blue-600", queries: ["rain songs bollywood", "monsoon romantic"] },
];

const CURATED_SECTIONS = [
  { title: "New Releases", playlistIds: ["1134543265"], gradient: "from-purple-500 to-pink-500" },
  { title: "Trending Now", playlistIds: ["1134543272", "1134770509"], gradient: "from-orange-500 to-red-500" },
  { title: "Top Charts", playlistIds: ["1134543272"], gradient: "from-blue-500 to-indigo-500" },
  { title: "Fresh Hits", playlistIds: ["1134543265", "1134770509"], gradient: "from-green-500 to-teal-500" },
  { title: "Best of 2025", playlistIds: ["1134543265"], gradient: "from-pink-400 to-purple-500" },
  { title: "Best of 2024", playlistIds: ["1134770509"], gradient: "from-violet-500 to-purple-600" },
  { title: "Best of 90s", playlistIds: ["1134770516"], gradient: "from-purple-500 to-indigo-500" },
  { title: "Best of 2000s", playlistIds: ["1134770509"], gradient: "from-blue-500 to-purple-500" },
  { title: "Best of 80s", playlistIds: ["1134770523"], gradient: "from-teal-500 to-cyan-500" },
  { title: "Top 50 Punjabi", playlistIds: ["1134543307", "1029579349"], gradient: "from-orange-400 to-yellow-500" },
  { title: "Top 50 Hindi", playlistIds: ["1134543272"], gradient: "from-rose-500 to-pink-500" },
  { title: "Bollywood Classics", playlistIds: ["1134770516", "1134770523"], gradient: "from-amber-500 to-orange-500" },
  { title: "Indie Hits", playlistIds: ["1134684498"], gradient: "from-emerald-500 to-teal-500" },
  { title: "Romantic Hits", playlistIds: ["1134543285", "74313682"], gradient: "from-pink-500 to-rose-500" },
];

const RADIO_CATEGORIES: RadioCategory[] = [
  { id: "bollywood-hits", name: "Bollywood", queries: ["bollywood top 50", "hindi chartbusters"], playlistIds: ["1134543272", "1134770509"], gradient: "from-orange-500 to-red-500", emoji: "🎬" },
  { id: "punjabi", name: "Punjabi", queries: ["punjabi top hits", "latest punjabi songs 2024"], playlistIds: ["1134543307", "1029579349"], gradient: "from-orange-400 to-yellow-500", emoji: "🦁" },
  { id: "tamil", name: "Tamil", queries: ["tamil hits 2024", "kollywood songs"], playlistIds: ["1134543292"], gradient: "from-green-500 to-teal-500", emoji: "🌴" },
  { id: "telugu", name: "Telugu", queries: ["telugu latest hits", "tollywood songs 2024"], playlistIds: ["1134543299"], gradient: "from-yellow-500 to-orange-500", emoji: "🌺" },
  { id: "malayalam", name: "Malayalam", queries: ["malayalam songs 2024", "mollywood hits"], gradient: "from-emerald-500 to-green-500", emoji: "🌿" },
  { id: "kannada", name: "Kannada", queries: ["kannada hits 2024", "sandalwood songs"], gradient: "from-purple-500 to-violet-500", emoji: "🏔️" },
  { id: "marathi", name: "Marathi", queries: ["marathi songs 2024", "marathi hits"], gradient: "from-orange-600 to-red-500", emoji: "🎪" },
  { id: "90s", name: "90s Hits", queries: ["90s bollywood gold", "evergreen 90s hindi"], playlistIds: ["1134770516"], gradient: "from-purple-500 to-indigo-500", emoji: "📼" },
  { id: "80s", name: "80s Hits", queries: ["80s bollywood", "retro hindi songs"], playlistIds: ["1134770523"], gradient: "from-teal-500 to-cyan-500", emoji: "📻" },
  { id: "arijit", name: "Arijit Singh", queries: ["arijit singh hits", "arijit singh romantic"], gradient: "from-red-500 to-rose-600", emoji: "🎙️" },
  { id: "ar-rahman", name: "A.R. Rahman", queries: ["ar rahman hits", "rahman melodies"], gradient: "from-teal-500 to-emerald-500", emoji: "🏆" },
  { id: "english", name: "English", queries: ["english pop hits 2024", "billboard hot 100"], playlistIds: ["1134770495"], gradient: "from-blue-500 to-cyan-500", emoji: "🌍" },
  { id: "bhajan", name: "Bhajan", queries: ["krishna bhajan", "morning bhajan"], gradient: "from-orange-500 to-amber-500", emoji: "🙏" },
  { id: "ghazal", name: "Ghazal", queries: ["ghazal songs", "jagjit singh ghazal"], gradient: "from-rose-600 to-pink-500", emoji: "🎭" },
];

interface ExploreTabProps {
  onPlaySong: (song: Song) => void;
  onNavigateToContent: (type: "album" | "artist" | "playlist", item: any) => void;
  setPlaylist: (songs: Song[]) => void;
  recentlyPlayed?: Song[];
}

const ExploreTab = ({ onPlaySong, onNavigateToContent, setPlaylist, recentlyPlayed = [] }: ExploreTabProps) => {
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [loadingMood, setLoadingMood] = useState<string | null>(null);
  const [activeRadio, setActiveRadio] = useState<string | null>(null);
  const [popularArtists, setPopularArtists] = useState<Artist[]>([]);
  const [curatedSongs, setCuratedSongs] = useState<Record<string, Song[]>>({});
  const [loading, setLoading] = useState(true);
  const [artistPage, setArtistPage] = useState(1);
  const [showAllArtists, setShowAllArtists] = useState(false);
  
  const isFetchingArtists = useRef(false);
  const artistSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadExploreData();
  }, []);

  const loadExploreData = async () => {
    setLoading(true);
    try {
      const artists = await musicApi.getPopularArtists(1, 20);
      setPopularArtists(artists || []);
      
      // Load first few curated sections
      const sectionsToLoad = CURATED_SECTIONS.slice(0, 4);
      const sectionPromises = sectionsToLoad.map(async (section) => {
        const playlistId = section.playlistIds[0];
        const songs = await musicApi.getPlaylistSongs(playlistId);
        return { title: section.title, songs: songs.slice(0, 10) };
      });
      
      const results = await Promise.all(sectionPromises);
      const songsMap: Record<string, Song[]> = {};
      results.forEach(r => { songsMap[r.title] = r.songs; });
      setCuratedSongs(songsMap);
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

  const playMoodPlaylist = async (mood: typeof MOOD_PLAYLISTS[0]) => {
    if (loadingMood) return;
    setLoadingMood(mood.id);
    
    try {
      let songs: Song[] = [];
      
      if (mood.playlistIds?.length) {
        const randomPlaylistId = mood.playlistIds[Math.floor(Math.random() * mood.playlistIds.length)];
        try {
          songs = await musicApi.getPlaylistSongs(randomPlaylistId);
        } catch (e) {
          console.log("Playlist fetch failed, falling back to search");
        }
      }
      
      if (songs.length === 0) {
        const randomQuery = mood.queries[Math.floor(Math.random() * mood.queries.length)];
        const results = await musicApi.search(randomQuery, 1, 40);
        songs = results.songs;
      }
      
      if (songs.length > 0) {
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        setPlaylist(shuffled);
        onPlaySong(shuffled[0]);
      }
    } catch (error) {
      console.error("Failed to load mood playlist:", error);
    } finally {
      setLoadingMood(null);
    }
  };

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

  const playCuratedSection = async (section: typeof CURATED_SECTIONS[0]) => {
    try {
      const randomPlaylistId = section.playlistIds[Math.floor(Math.random() * section.playlistIds.length)];
      const songs = await musicApi.getPlaylistSongs(randomPlaylistId);
      if (songs.length > 0) {
        setPlaylist(songs);
        onPlaySong(songs[0]);
      }
    } catch (error) {
      console.error("Failed to play curated section:", error);
    }
  };

  const displayedArtists = showAllArtists ? popularArtists : popularArtists.slice(0, 12);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section className="bg-gradient-to-r from-primary/5 to-transparent rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Recently Played</h2>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {recentlyPlayed.slice(0, 20).map((song) => (
                <Card
                  key={song.id}
                  className="cursor-pointer hover:scale-105 transition-all duration-200 shrink-0 w-28 border-0 bg-background/50 backdrop-blur-sm"
                  onClick={() => onPlaySong(song)}
                >
                  <CardContent className="p-1.5">
                    <div className="relative mb-1.5">
                      <LazyImage
                        src={song.image?.[1]?.url || song.image?.[0]?.url}
                        alt={song.name}
                        className="w-full aspect-square rounded-lg object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-5 w-5 text-white fill-white" />
                      </div>
                    </div>
                    <h3 className="font-medium text-[11px] truncate">{song.name}</h3>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {song.artists?.primary?.[0]?.name || "Unknown"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {/* Mood & Vibes */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Mood & Vibes</h2>
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {MOOD_PLAYLISTS.map((mood) => (
              <Card
                key={mood.id}
                className="cursor-pointer hover:scale-105 transition-all duration-200 overflow-hidden shrink-0 w-[72px] border-0 shadow-md"
                onClick={() => playMoodPlaylist(mood)}
              >
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${mood.gradient} p-2.5 aspect-square flex flex-col items-center justify-center relative`}>
                    <span className="text-xl mb-0.5">{mood.emoji}</span>
                    <span className="text-white font-semibold text-[9px] text-center drop-shadow-md leading-tight">
                      {mood.name}
                    </span>
                    
                    {loadingMood === mood.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
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

      {/* Curated Sections */}
      {CURATED_SECTIONS.map((section) => (
        <section key={section.title}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListMusic className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">{section.title}</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => playCuratedSection(section)}
              className="text-xs h-7 px-2"
            >
              <Play className="h-3 w-3 mr-1 fill-current" />
              Play
            </Button>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {curatedSongs[section.title]?.length > 0 ? (
                curatedSongs[section.title].map((song) => (
                  <Card
                    key={song.id}
                    className="cursor-pointer hover:scale-105 transition-all duration-200 shrink-0 w-28 border-0 bg-muted/30"
                    onClick={() => onPlaySong(song)}
                  >
                    <CardContent className="p-1.5">
                      <div className="relative mb-1.5">
                        <LazyImage
                          src={song.image?.[1]?.url || song.image?.[0]?.url}
                          alt={song.name}
                          className="w-full aspect-square rounded-lg object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="h-5 w-5 text-white fill-white" />
                        </div>
                      </div>
                      <h3 className="font-medium text-[11px] truncate">{song.name}</h3>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {song.artists?.primary?.[0]?.name || "Unknown"}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card
                  className={`cursor-pointer hover:scale-105 transition-all duration-200 shrink-0 w-28 border-0 shadow-md`}
                  onClick={() => playCuratedSection(section)}
                >
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-br ${section.gradient} p-3 aspect-square flex flex-col items-center justify-center rounded-lg`}>
                      <ListMusic className="h-6 w-6 text-white/90 mb-1" />
                      <span className="text-white font-semibold text-[10px] text-center drop-shadow-md leading-tight">
                        {section.title}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      ))}

      {/* Radio Stations */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Radio className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Radio Stations</h2>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {RADIO_CATEGORIES.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer hover:scale-105 transition-all duration-200 overflow-hidden shrink-0 w-[72px] border-0 shadow-md ${
                  activeRadio === category.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => playRadio(category)}
              >
                <CardContent className="p-0">
                  <div className={`bg-gradient-to-br ${category.gradient} p-2.5 aspect-square flex flex-col items-center justify-center relative`}>
                    <span className="text-xl mb-0.5">{category.emoji}</span>
                    <span className="text-white font-semibold text-[9px] text-center drop-shadow-md leading-tight">
                      {category.name}
                    </span>
                    
                    {loadingCategory === category.id && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      </div>
                    )}
                    
                    {activeRadio === category.id && loadingCategory !== category.id && (
                      <div className="absolute bottom-1 right-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
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

      {/* Popular Artists - At Bottom */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Popular Artists</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAllArtists(!showAllArtists)}
            className="text-xs h-7 px-2"
          >
            {showAllArtists ? "Show Less" : "See All"}
            <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${showAllArtists ? "rotate-90" : ""}`} />
          </Button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {displayedArtists.map((artist) => (
            <Card
              key={artist.id}
              className="cursor-pointer hover:shadow-lg transition-shadow group border-0 bg-muted/30"
              onClick={() => onNavigateToContent("artist", artist)}
            >
              <CardContent className="p-1.5 text-center">
                <div className="relative mb-1">
                  <LazyImage
                    src={artist.image?.[1]?.url || artist.image?.[0]?.url}
                    alt={artist.name}
                    className="w-full aspect-square rounded-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-4 w-4 text-white fill-white" />
                  </div>
                </div>
                <h3 className="font-medium text-[10px] truncate">{artist.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>

        {showAllArtists && (
          <div ref={artistSentinelRef} className="h-8 flex items-center justify-center mt-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </section>
    </div>
  );
};

export default ExploreTab;
