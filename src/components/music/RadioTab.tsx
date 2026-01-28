import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Radio, Loader2 } from "lucide-react";
import { musicApi, Song } from "@/services/musicApi";
import { useMusicContext } from "@/contexts/MusicContext";

interface RadioCategory {
  id: string;
  name: string;
  query: string;
  gradient: string;
  emoji: string;
}

const RADIO_CATEGORIES: RadioCategory[] = [
  { id: "punjabi", name: "Punjabi", query: "punjabi hits", gradient: "from-orange-500 to-yellow-500", emoji: "🎵" },
  { id: "romantic", name: "Romantic", query: "romantic hindi songs", gradient: "from-pink-500 to-rose-500", emoji: "❤️" },
  { id: "90s", name: "90s Hits", query: "90s bollywood", gradient: "from-purple-500 to-indigo-500", emoji: "📼" },
  { id: "80s", name: "80s Classic", query: "80s hindi songs", gradient: "from-teal-500 to-cyan-500", emoji: "🎹" },
  { id: "party", name: "Party", query: "party songs hindi", gradient: "from-red-500 to-orange-500", emoji: "🎉" },
  { id: "sad", name: "Sad Songs", query: "sad hindi songs", gradient: "from-slate-500 to-gray-600", emoji: "💔" },
  { id: "devotional", name: "Devotional", query: "devotional bhajan", gradient: "from-amber-500 to-orange-400", emoji: "🙏" },
  { id: "rock", name: "Rock", query: "rock hindi songs", gradient: "from-zinc-700 to-stone-600", emoji: "🎸" },
  { id: "lofi", name: "Lo-Fi", query: "lofi hindi", gradient: "from-violet-500 to-purple-600", emoji: "🌙" },
  { id: "workout", name: "Workout", query: "workout songs hindi", gradient: "from-green-500 to-emerald-500", emoji: "💪" },
  { id: "sufi", name: "Sufi", query: "sufi songs", gradient: "from-rose-600 to-pink-500", emoji: "🌹" },
  { id: "ghazal", name: "Ghazal", query: "ghazal songs", gradient: "from-amber-600 to-yellow-500", emoji: "📜" },
  { id: "english", name: "English Hits", query: "english pop hits", gradient: "from-blue-500 to-cyan-500", emoji: "🌍" },
  { id: "hip-hop", name: "Hip Hop", query: "hip hop hindi", gradient: "from-yellow-500 to-lime-500", emoji: "🎤" },
  { id: "indie", name: "Indie", query: "indie hindi songs", gradient: "from-fuchsia-500 to-pink-500", emoji: "🎧" },
  { id: "retro", name: "Retro", query: "old hindi songs", gradient: "from-stone-500 to-amber-600", emoji: "📻" },
  { id: "chill", name: "Chill Vibes", query: "chill hindi songs", gradient: "from-sky-400 to-blue-500", emoji: "😌" },
  { id: "dance", name: "Dance", query: "dance songs bollywood", gradient: "from-pink-400 to-fuchsia-500", emoji: "💃" },
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
      // Fetch songs for the category with random page
      const randomPage = Math.floor(Math.random() * 5) + 1;
      const results = await musicApi.search(category.query, randomPage, 30);
      
      if (results.songs.length > 0) {
        // Shuffle the songs for random playback
        const shuffled = [...results.songs].sort(() => Math.random() - 0.5);
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
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Select a category to start playing random songs
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
