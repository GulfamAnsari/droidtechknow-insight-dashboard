import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Radio, Loader2 } from "lucide-react";
import { musicApi, Song } from "@/services/musicApi";

interface RadioCategory {
  id: string;
  name: string;
  queries: string[]; // Multiple queries for variety
  playlistIds?: string[]; // Optional playlist IDs for direct fetch
  gradient: string;
  emoji: string;
}

const RADIO_CATEGORIES: RadioCategory[] = [
  // Hindi/Bollywood
  { id: "bollywood-hits", name: "Bollywood Hits", queries: ["bollywood top 50", "hindi chartbusters", "bollywood latest"], playlistIds: ["1134543272", "1134770509"], gradient: "from-orange-500 to-red-500", emoji: "🎬" },
  { id: "romantic", name: "Romantic", queries: ["romantic bollywood", "love songs hindi 2024", "ishq wala love"], playlistIds: ["1134543285", "74313682"], gradient: "from-pink-500 to-rose-500", emoji: "❤️" },
  { id: "sad", name: "Sad Songs", queries: ["dard bhare geet", "breakup songs hindi", "sad bollywood songs"], playlistIds: ["1134550498"], gradient: "from-slate-500 to-gray-600", emoji: "💔" },
  { id: "party", name: "Party", queries: ["party anthems bollywood", "dance floor hits", "dj remix hindi"], playlistIds: ["1134543277", "82914609"], gradient: "from-red-500 to-orange-500", emoji: "🎉" },
  { id: "90s", name: "90s Hits", queries: ["90s bollywood gold", "evergreen 90s hindi", "90s romantic songs"], playlistIds: ["1134770516"], gradient: "from-purple-500 to-indigo-500", emoji: "📼" },
  { id: "80s", name: "80s Classic", queries: ["80s bollywood classics", "purane gane", "kishore kumar hits"], playlistIds: ["1134770523"], gradient: "from-teal-500 to-cyan-500", emoji: "🎹" },
  { id: "2000s", name: "2000s", queries: ["2000s bollywood", "early 2000s hindi hits", "bollywood 2005"], gradient: "from-blue-500 to-purple-500", emoji: "💿" },
  
  // Regional
  { id: "punjabi", name: "Punjabi", queries: ["punjabi top hits", "latest punjabi songs 2024", "diljit dosanjh"], playlistIds: ["1134543307", "1029579349"], gradient: "from-orange-400 to-yellow-500", emoji: "🦁" },
  { id: "tamil", name: "Tamil", queries: ["tamil hits 2024", "kollywood songs", "anirudh ravichander"], playlistIds: ["1134543292"], gradient: "from-green-500 to-teal-500", emoji: "🌴" },
  { id: "telugu", name: "Telugu", queries: ["telugu latest hits", "tollywood songs 2024", "devi sri prasad"], playlistIds: ["1134543299"], gradient: "from-yellow-500 to-orange-500", emoji: "🌺" },
  { id: "marathi", name: "Marathi", queries: ["marathi songs latest", "marathi dj songs", "marathi lavani"], gradient: "from-saffron-500 to-orange-500", emoji: "🚩" },
  { id: "kannada", name: "Kannada", queries: ["kannada hits 2024", "sandalwood songs", "kannada melody"], gradient: "from-red-400 to-pink-500", emoji: "🏯" },
  { id: "malayalam", name: "Malayalam", queries: ["malayalam songs 2024", "mollywood hits", "malayalam melody"], gradient: "from-emerald-500 to-green-500", emoji: "🌿" },
  { id: "bengali", name: "Bengali", queries: ["bengali songs latest", "rabindra sangeet", "tollywood bengali"], gradient: "from-amber-500 to-yellow-500", emoji: "🌸" },
  { id: "gujarati", name: "Gujarati", queries: ["gujarati garba", "gujarati songs 2024", "gujarati folk"], gradient: "from-rose-500 to-red-500", emoji: "🪔" },
  { id: "bhojpuri", name: "Bhojpuri", queries: ["bhojpuri hits 2024", "pawan singh songs", "bhojpuri dj"], gradient: "from-lime-500 to-green-500", emoji: "🎭" },
  { id: "haryanvi", name: "Haryanvi", queries: ["haryanvi dj songs", "haryanvi hits 2024", "sapna choudhary"], gradient: "from-sky-500 to-blue-500", emoji: "🌾" },
  { id: "rajasthani", name: "Rajasthani", queries: ["rajasthani folk songs", "marwadi songs", "rajasthani dj"], gradient: "from-amber-600 to-orange-500", emoji: "🏜️" },
  
  // Genres
  { id: "lofi", name: "Lo-Fi", queries: ["lofi bollywood", "lofi chill beats", "arijit singh lofi"], playlistIds: ["1134684498"], gradient: "from-violet-500 to-purple-600", emoji: "🌙" },
  { id: "sufi", name: "Sufi", queries: ["sufi songs", "qawwali", "nusrat fateh ali khan"], gradient: "from-rose-600 to-pink-500", emoji: "🌹" },
  { id: "ghazal", name: "Ghazal", queries: ["ghazal classics", "jagjit singh ghazals", "mehdi hassan"], gradient: "from-amber-600 to-yellow-500", emoji: "📜" },
  { id: "rock", name: "Rock", queries: ["indian rock bands", "rock hindi songs", "rock on"], gradient: "from-zinc-700 to-stone-600", emoji: "🎸" },
  { id: "hip-hop", name: "Hip Hop", queries: ["indian hip hop", "desi rap", "divine rapper"], gradient: "from-yellow-500 to-lime-500", emoji: "🎤" },
  { id: "indie", name: "Indie Pop", queries: ["indie hindi songs", "indie pop india", "prateek kuhad"], gradient: "from-fuchsia-500 to-pink-500", emoji: "🎧" },
  { id: "classical", name: "Classical", queries: ["indian classical music", "raga", "hindustani classical"], gradient: "from-amber-700 to-yellow-600", emoji: "🎻" },
  { id: "instrumental", name: "Instrumental", queries: ["bollywood instrumental", "flute music indian", "santoor music"], gradient: "from-cyan-500 to-blue-500", emoji: "🎺" },
  
  // Mood
  { id: "chill", name: "Chill Vibes", queries: ["chill hindi songs", "relaxing bollywood", "acoustic hindi"], gradient: "from-sky-400 to-blue-500", emoji: "😌" },
  { id: "workout", name: "Workout", queries: ["gym motivation hindi", "workout songs bollywood", "pump up hindi"], playlistIds: ["1134684545"], gradient: "from-green-500 to-emerald-500", emoji: "💪" },
  { id: "drive", name: "Long Drive", queries: ["long drive songs hindi", "road trip bollywood", "highway music"], gradient: "from-indigo-500 to-blue-600", emoji: "🚗" },
  { id: "sleep", name: "Sleep", queries: ["sleep music hindi", "lullaby hindi", "peaceful night songs"], gradient: "from-slate-600 to-gray-700", emoji: "😴" },
  { id: "focus", name: "Focus", queries: ["study music hindi", "concentration music", "calm instrumental"], gradient: "from-teal-400 to-cyan-500", emoji: "🧘" },
  { id: "morning", name: "Morning", queries: ["morning raga", "fresh morning songs hindi", "subah ki dhun"], gradient: "from-yellow-400 to-orange-400", emoji: "🌅" },
  
  // Era/Decades
  { id: "70s", name: "70s Golden", queries: ["70s hindi songs", "rafi songs", "lata mangeshkar classics"], gradient: "from-yellow-600 to-amber-600", emoji: "🌟" },
  { id: "retro", name: "Retro Mix", queries: ["retro bollywood remix", "old is gold hindi", "evergreen hindi songs"], gradient: "from-stone-500 to-amber-600", emoji: "📻" },
  { id: "new-releases", name: "New Releases", queries: ["new hindi songs 2024", "latest bollywood 2024", "trending hindi"], playlistIds: ["1134543265"], gradient: "from-pink-400 to-purple-500", emoji: "✨" },
  
  // Artists Mix
  { id: "arijit", name: "Arijit Singh", queries: ["arijit singh hits", "arijit singh romantic", "arijit singh sad songs"], gradient: "from-red-500 to-rose-600", emoji: "🎙️" },
  { id: "shreya", name: "Shreya Ghoshal", queries: ["shreya ghoshal songs", "shreya ghoshal hits", "shreya ghoshal classical"], gradient: "from-pink-400 to-rose-500", emoji: "👑" },
  { id: "sonu", name: "Sonu Nigam", queries: ["sonu nigam hits", "sonu nigam romantic", "sonu nigam classics"], gradient: "from-blue-400 to-indigo-500", emoji: "🎵" },
  { id: "kumar-sanu", name: "Kumar Sanu", queries: ["kumar sanu hits", "kumar sanu romantic", "kumar sanu 90s"], gradient: "from-purple-400 to-violet-500", emoji: "💫" },
  { id: "ar-rahman", name: "A.R. Rahman", queries: ["ar rahman hits", "rahman melodies", "ar rahman oscar"], gradient: "from-teal-500 to-emerald-500", emoji: "🏆" },
  { id: "neha-kakkar", name: "Neha Kakkar", queries: ["neha kakkar songs", "neha kakkar hits 2024", "neha kakkar party"], gradient: "from-pink-500 to-fuchsia-500", emoji: "🌟" },
  { id: "honey-singh", name: "Yo Yo Honey Singh", queries: ["honey singh hits", "honey singh party songs", "yo yo honey singh"], gradient: "from-yellow-400 to-orange-500", emoji: "🔥" },
  { id: "badshah", name: "Badshah", queries: ["badshah songs", "badshah hits 2024", "badshah party"], gradient: "from-red-400 to-orange-500", emoji: "👑" },
  
  // International
  { id: "english", name: "English Hits", queries: ["english pop hits 2024", "billboard hot 100", "trending english songs"], playlistIds: ["1134770495"], gradient: "from-blue-500 to-cyan-500", emoji: "🌍" },
  { id: "kpop", name: "K-Pop", queries: ["kpop hits 2024", "bts songs", "blackpink hits"], gradient: "from-pink-400 to-purple-400", emoji: "🇰🇷" },
  { id: "spanish", name: "Spanish", queries: ["spanish hits", "reggaeton 2024", "latin pop"], gradient: "from-red-500 to-yellow-500", emoji: "🇪🇸" },
  
  // Devotional
  { id: "bhajan", name: "Bhajan", queries: ["krishna bhajan", "morning bhajan", "shiv bhajan"], gradient: "from-orange-500 to-amber-500", emoji: "🙏" },
  { id: "aarti", name: "Aarti", queries: ["aarti collection", "ganesh aarti", "lakshmi aarti"], gradient: "from-saffron-500 to-yellow-500", emoji: "🪔" },
  { id: "mantra", name: "Mantra", queries: ["gayatri mantra", "om chanting", "vedic mantras"], gradient: "from-amber-500 to-orange-400", emoji: "🕉️" },
];

interface RadioTabProps {
  onPlaySong: (song: Song) => void;
  setPlaylist: (songs: Song[]) => void;
}

const RadioTab = ({ onPlaySong, setPlaylist }: RadioTabProps) => {
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [activeRadio, setActiveRadio] = useState<string | null>(null);

  const playRadio = async (category: RadioCategory) => {
    if (loadingCategory) return;
    
    setLoadingCategory(category.id);
    try {
      let songs: Song[] = [];
      
      // Try playlist first if available
      if (category.playlistIds && category.playlistIds.length > 0) {
        const randomPlaylistId = category.playlistIds[Math.floor(Math.random() * category.playlistIds.length)];
        try {
          const playlistSongs = await musicApi.getPlaylistSongs(randomPlaylistId);
          if (playlistSongs.length > 0) {
            songs = playlistSongs;
          }
        } catch (e) {
          console.log("Playlist fetch failed, falling back to search");
        }
      }
      
      // If no songs from playlist, use search with random query
      if (songs.length === 0) {
        const randomQuery = category.queries[Math.floor(Math.random() * category.queries.length)];
        const randomPage = Math.floor(Math.random() * 3) + 1;
        const results = await musicApi.search(randomQuery, randomPage, 40);
        songs = results.songs;
      }
      
      if (songs.length > 0) {
        // Shuffle the songs for random playback
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Play Radio</h2>
        <span className="text-xs text-muted-foreground ml-2">({RADIO_CATEGORIES.length} stations)</span>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Select a category to start playing random songs from curated playlists
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {RADIO_CATEGORIES.map((category) => (
          <Card
            key={category.id}
            className={`cursor-pointer hover:scale-105 transition-all duration-200 overflow-hidden group ${
              activeRadio === category.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => playRadio(category)}
          >
            <CardContent className={`p-0 relative`}>
              <div className={`bg-gradient-to-br ${category.gradient} p-4 aspect-square flex flex-col items-center justify-center`}>
                <span className="text-3xl mb-2">{category.emoji}</span>
                <span className="text-white font-semibold text-sm text-center drop-shadow-md">
                  {category.name}
                </span>
                
                {loadingCategory === category.id ? (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-10 w-10 text-white fill-white" />
                  </div>
                )}
                
                {activeRadio === category.id && loadingCategory !== category.id && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RadioTab;