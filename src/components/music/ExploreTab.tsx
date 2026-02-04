import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Radio, Loader2, Users, ListMusic, Clock, Heart, ChevronRight, TrendingUp, Music2, Sparkles } from "lucide-react";
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

// Grouped curated sections for Spotify-like layout
const PLAYLIST_ROWS = [
  {
    title: "Top Charts",
    icon: TrendingUp,
    playlists: [
      { id: "1134543272", name: "Top 50 Hindi", gradient: "from-rose-500 to-pink-600" },
      { id: "1134543307", name: "Top 50 Punjabi", gradient: "from-orange-400 to-yellow-500" },
      { id: "1134543292", name: "Top 50 Tamil", gradient: "from-green-500 to-teal-500" },
      { id: "1134543299", name: "Top 50 Telugu", gradient: "from-yellow-500 to-orange-500" },
      { id: "1134770495", name: "Top 50 English", gradient: "from-blue-500 to-cyan-500" },
    ]
  },
  {
    title: "New Releases",
    icon: Sparkles,
    playlists: [
      { id: "1134543265", name: "Fresh Hits", gradient: "from-purple-500 to-pink-500" },
      { id: "1134770509", name: "Trending Now", gradient: "from-orange-500 to-red-500" },
      { id: "1134543265", name: "New This Week", gradient: "from-green-500 to-teal-500" },
      { id: "1134684498", name: "Indie Spotlight", gradient: "from-emerald-500 to-teal-500" },
    ]
  },
  {
    title: "Bollywood Essentials",
    icon: Music2,
    playlists: [
      { id: "1134543285", name: "Romantic Hits", gradient: "from-pink-500 to-rose-500" },
      { id: "1134543277", name: "Party Anthems", gradient: "from-red-500 to-orange-500" },
      { id: "1134550498", name: "Heartbreak Songs", gradient: "from-slate-500 to-gray-600" },
      { id: "1134684545", name: "Workout Mix", gradient: "from-green-500 to-emerald-500" },
    ]
  },
  {
    title: "Throwback Hits",
    icon: Clock,
    playlists: [
      { id: "1134770516", name: "90s Gold", gradient: "from-purple-500 to-indigo-500" },
      { id: "1134770523", name: "80s Classics", gradient: "from-teal-500 to-cyan-500" },
      { id: "1134770509", name: "2000s Nostalgia", gradient: "from-blue-500 to-purple-500" },
      { id: "1134543265", name: "Best of 2024", gradient: "from-violet-500 to-purple-600" },
      { id: "1134543265", name: "Best of 2025", gradient: "from-pink-400 to-purple-500" },
    ]
  },
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
  const [loadingPlaylist, setLoadingPlaylist] = useState<string | null>(null);
  const [activeRadio, setActiveRadio] = useState<string | null>(null);
  const [popularArtists, setPopularArtists] = useState<Artist[]>([]);
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
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
      const [artists, trending] = await Promise.all([
        musicApi.getPopularArtists(1, 20),
        musicApi.getPlaylistSongs("1134543272") // Top Hindi for trending
      ]);
      setPopularArtists(artists || []);
      setTrendingSongs(trending?.slice(0, 15) || []);
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

  const playPlaylistFromRow = async (playlistId: string, playlistName: string) => {
    if (loadingPlaylist) return;
    setLoadingPlaylist(playlistId + playlistName);
    
    try {
      const songs = await musicApi.getPlaylistSongs(playlistId);
      if (songs.length > 0) {
        setPlaylist(songs);
        onPlaySong(songs[0]);
      }
    } catch (error) {
      console.error("Failed to play playlist:", error);
    } finally {
      setLoadingPlaylist(null);
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
    <div className="space-y-8 pb-32">
      {/* Recently Played - Spotify style horizontal cards */}
      {recentlyPlayed.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Recently Played</h2>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-3">
              {recentlyPlayed.slice(0, 20).map((song) => (
                <div
                  key={song.id}
                  className="group cursor-pointer shrink-0 w-36"
                  onClick={() => onPlaySong(song)}
                >
                  <div className="relative mb-2">
                    <LazyImage
                      src={song.image?.[1]?.url || song.image?.[0]?.url}
                      alt={song.name}
                      className="w-full aspect-square rounded-lg object-cover shadow-lg"
                    />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <div className="bg-primary rounded-full p-3 shadow-xl">
                        <Play className="h-5 w-5 text-primary-foreground fill-current" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-medium text-sm truncate">{song.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {song.artists?.primary?.[0]?.name || "Unknown"}
                  </p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" variant="music" />
          </ScrollArea>
        </section>
      )}

      {/* Trending Songs */}
      {trendingSongs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Trending Now</h2>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-3">
              {trendingSongs.map((song, index) => (
                <div
                  key={song.id}
                  className="group cursor-pointer shrink-0 w-40 bg-card/50 rounded-lg p-3 hover:bg-card transition-colors"
                  onClick={() => onPlaySong(song)}
                >
                  <div className="relative mb-2">
                    <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center z-10">
                      {index + 1}
                    </span>
                    <LazyImage
                      src={song.image?.[1]?.url || song.image?.[0]?.url}
                      alt={song.name}
                      className="w-full aspect-square rounded-md object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </div>
                  </div>
                  <h3 className="font-medium text-sm truncate">{song.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {song.artists?.primary?.[0]?.name || "Unknown"}
                  </p>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" variant="music" />
          </ScrollArea>
        </section>
      )}

      {/* Mood & Vibes - Compact circular cards */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Mood & Vibes</h2>
        </div>
        
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-3">
            {MOOD_PLAYLISTS.map((mood) => (
              <div
                key={mood.id}
                className="cursor-pointer group shrink-0"
                onClick={() => playMoodPlaylist(mood)}
              >
                <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${mood.gradient} flex flex-col items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                  <span className="text-2xl">{mood.emoji}</span>
                  {loadingMood === mood.id && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-center mt-2 font-medium">{mood.name}</p>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" variant="music" />
        </ScrollArea>
      </section>

      {/* Playlist Rows - Spotify/Saavn style */}
      {PLAYLIST_ROWS.map((row) => {
        const IconComponent = row.icon;
        return (
          <section key={row.title}>
            <div className="flex items-center gap-2 mb-4">
              <IconComponent className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{row.title}</h2>
            </div>
            
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-3 pb-3">
                {row.playlists.map((playlist, idx) => {
                  const isLoading = loadingPlaylist === playlist.id + playlist.name;
                  return (
                    <div
                      key={`${playlist.id}-${idx}`}
                      className="group cursor-pointer shrink-0 w-40"
                      onClick={() => playPlaylistFromRow(playlist.id, playlist.name)}
                    >
                      <div className={`relative aspect-square rounded-lg bg-gradient-to-br ${playlist.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-[1.02]`}>
                        <ListMusic className="h-12 w-12 text-white/80" />
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                          <div className="bg-white/90 rounded-full p-2 shadow-xl">
                            {isLoading ? (
                              <Loader2 className="h-5 w-5 text-black animate-spin" />
                            ) : (
                              <Play className="h-5 w-5 text-black fill-current" />
                            )}
                          </div>
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm mt-2 truncate">{playlist.name}</h3>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" variant="music" />
            </ScrollArea>
          </section>
        );
      })}

      {/* Radio Stations - Compact grid */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Radio className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Radio Stations</h2>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-3">
            {RADIO_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className={`group cursor-pointer shrink-0 ${activeRadio === category.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : ""}`}
                onClick={() => playRadio(category)}
              >
                <div className={`relative w-24 h-24 rounded-xl bg-gradient-to-br ${category.gradient} flex flex-col items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                  <span className="text-2xl mb-1">{category.emoji}</span>
                  <span className="text-white font-semibold text-xs text-center px-2 drop-shadow-md">
                    {category.name}
                  </span>
                  
                  {loadingCategory === category.id && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                  
                  {activeRadio === category.id && loadingCategory !== category.id && (
                    <div className="absolute bottom-1 right-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" variant="music" />
        </ScrollArea>
      </section>

      {/* Popular Artists - Grid layout */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Popular Artists</h2>
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

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {displayedArtists.map((artist) => (
            <div
              key={artist.id}
              className="group cursor-pointer text-center"
              onClick={() => onNavigateToContent("artist", artist)}
            >
              <div className="relative mb-2">
                <LazyImage
                  src={artist.image?.[1]?.url || artist.image?.[0]?.url}
                  alt={artist.name}
                  className="w-full aspect-square rounded-full object-cover shadow-lg group-hover:shadow-xl transition-shadow"
                />
                <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-6 w-6 text-white fill-white" />
                </div>
              </div>
              <h3 className="font-medium text-xs truncate">{artist.name}</h3>
            </div>
          ))}
        </div>

        {showAllArtists && (
          <div ref={artistSentinelRef} className="h-8 flex items-center justify-center mt-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </section>
    </div>
  );
};

export default ExploreTab;
