import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Calendar
} from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Copy,
  Filter,
  ExternalLink,
  CalendarIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "stock-news-saved";

export default function StockNews() {
  const [news, setNews] = useState<any[]>([]);
  const [savedNews, setSavedNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("selected");
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  const [timeFilter, setTimeFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  /* ---------------- LOAD SAVED ---------------- */
  useEffect(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) setSavedNews(JSON.parse(s));
  }, []);

  /* ---------------- FETCH NEWS ---------------- */
  const fetchNews = async () => {
    setLoading(true);
    try {
      const from = format(fromDate, "dd-MM-yyyy");
      const to = format(toDate, "dd-MM-yyyy");

      const res = await fetch(
        `https://droidtechknow.com/admin/api/stocks/news/save.php?from=${from}&to=${to}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      let all: any[] = [];
      Object.values(json.data || {}).forEach((d: any) => {
        if (Array.isArray(d)) all.push(...d);
      });

      all.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
      );

      setNews(all);
    } catch {
      toast.error("Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- AUTO REFRESH ---------------- */
  useEffect(() => {
    fetchNews();
    const i = setInterval(fetchNews, 60000);
    return () => clearInterval(i);
  }, []);

  /* ---------------- FILTERS ---------------- */
  const applyFilters = (items: any[]) => {
    let f = [...items];

    if (timeFilter !== "all") {
      f = f.filter(i => {
        const h = new Date(i.publishedAt).getHours();
        if (timeFilter === "morning") return h >= 9 && h < 12;
        if (timeFilter === "afternoon") return h >= 12 && h < 15;
        return h >= 15;
      });
    }

    if (sentimentFilter !== "all") {
      f = f.filter(i =>
        savedNews.find(
          s => s.postId === i.postId && s.sentiment === sentimentFilter
        )
      );
    }

    return f;
  };

  const filteredNews = useMemo(
    () => applyFilters(news),
    [news, timeFilter, sentimentFilter, savedNews]
  );

  const filteredSaved = useMemo(
    () => applyFilters(savedNews),
    [savedNews, timeFilter, sentimentFilter]
  );

  /* ---------------- SAVE ---------------- */
  const saveNews = (item: any, sentiment: "bullish" | "bearish") => {
    const updated = [
      ...savedNews.filter(s => s.postId !== item.postId),
      { ...item, sentiment, savedAt: new Date().toISOString() }
    ];
    setSavedNews(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success(`Saved as ${sentiment}`);
  };

  const getSavedSentiment = (postId: string) =>
    savedNews.find(s => s.postId === postId)?.sentiment || "";

  /* ---------------- COPY ---------------- */
  const copyAllNews = () => {
    const list =
      activeTab === "saved" ? filteredSaved : filteredNews;

    const txt = list
      .map(
        i =>
          `${format(new Date(i.publishedAt), "dd MMM yyyy hh:mma")} | ${
            i.data.title
          }`
      )
      .join("\n");

    navigator.clipboard.writeText(txt);
    toast.success("Copied");
  };

  /* ================= CARD ================= */
  const NewsCard = ({ item }: { item: any }) => {
    const cta = item.data?.cta?.[0];
    const ml = item.machineLearningSentiments;
    const savedSentiment = getSavedSentiment(item.postId);

    return (
      <Card className="bg-[#0d1117] border border-white/10 rounded-lg">
        <CardContent className="p-3 space-y-2">

          {/* HEADER */}
          <div className="flex gap-2">
            {cta?.logoUrl && (
              <img
                src={cta.logoUrl}
                className="w-8 h-8 rounded"
              />
            )}

            <div className="flex-1">
              <a
                href={cta?.ctaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-blue-400 hover:underline"
              >
                {cta?.ctaText || item.data.title}
              </a>

              <div className="text-xs text-gray-400 mt-1">
                {format(
                  new Date(item.publishedAt),
                  "dd MMM yyyy hh:mma"
                )}
              </div>
            </div>
          </div>

          {/* BODY */}
          <p className="text-sm text-gray-300 whitespace-pre-line">
            {item.data.body}
          </p>

          {/* FOOTER */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">

            {/* ML SENTIMENT */}
            {ml && (
              <span
                className={cn(
                  "text-xs px-2 py-[2px] rounded",
                  ml.label === "positive" &&
                    "bg-green-500/20 text-green-400",
                  ml.label === "negative" &&
                    "bg-red-500/20 text-red-400",
                  ml.label === "neutral" &&
                    "bg-yellow-500/20 text-yellow-400"
                )}
              >
                {ml.label} ({(ml.confidence * 100).toFixed(0)}%)
              </span>
            )}

            <Select
              value={savedSentiment}
              onValueChange={v =>
                saveNews(item, v as any)
              }
            >
              <SelectTrigger className="h-7 w-24 text-xs">
                <SelectValue placeholder="Save" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bullish">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  Bullish
                </SelectItem>
                <SelectItem value="bearish">
                  <TrendingDown className="h-3 w-3 inline mr-1" />
                  Bearish
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  };

  const NewsGrid = ({ items }: any) => {
    if (loading)
      return (
        <div className="grid md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      );

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {items.map((i: any) => (
          <NewsCard key={i.postId} item={i} />
        ))}
      </div>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="h-[95vh] flex flex-col">
      {/* HEADER */}
      <div className="flex flex-wrap items-center gap-3 p-3 border-b">

        {/* LEFT */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {format(fromDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={d => d && setFromDate(d)}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {format(toDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={d => d && setToDate(d)}
              />
            </PopoverContent>
          </Popover>

          <Button size="sm" onClick={fetchNews}>
            Fetch
          </Button>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 ml-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="selected">Selected</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button size="sm" variant="outline" onClick={copyAllNews}>
            <Copy className="h-4 w-4" />
          </Button>

          <Button size="sm" variant="outline" onClick={fetchNews}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* TIME FILTER */}
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              Time
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="afternoon">Afternoon</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>

          {/* SENTIMENT FILTER */}
          <Select
            value={sentimentFilter}
            onValueChange={setSentimentFilter}
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              Sentiment
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="bullish">Bullish</SelectItem>
              <SelectItem value="bearish">Bearish</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "saved" ? (
          <NewsGrid items={filteredSaved} />
        ) : (
          <NewsGrid items={filteredNews} />
        )}
      </div>
    </div>
  );
}
