import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Copy,
  Filter,
  CalendarIcon,
  Trash2,
  Clock,
  ArrowLeft,
  Search,
  X,
  File
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSentimentLocal } from "@/utils/sentiments";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from "@dnd-kit/core";

import { SortableContext, useSortable, arrayMove } from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
const STORAGE_KEY = "stock-news-saved";
const LATER_STORAGE_KEY = "stock-news-later";

const mapSentiment = (label?: string) => {
  if (label === "positive") return "bullish";
  if (label === "negative") return "bearish";
  return "neutral";
};

// Time range hours for double slider
const TIME_MIN = 0;
const TIME_MAX = 24;

export default function StockNews() {
  const [news, setNews] = useState<any[]>([]);
  const [savedNews, setSavedNews] = useState<any[]>([]);
  const [laterNews, setLaterNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [priceCache, setPriceCache] = useState<Record<string, { change: number; loading: boolean }>>({});
  const [autoFetchNews, setAutoFetchNews] = useState(false);
  const autoFetchNewsRef = useRef<NodeJS.Timeout | null>(null);
  const [highlightedNews, setHighlightedNews] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState("selected");
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  // Combined filters
  const [timeRange, setTimeRange] = useState<[number, number]>([TIME_MIN, TIME_MAX]); // double slider [start, end]
  const [sentimentFilters, setSentimentFilters] = useState<string[]>([]); // checkboxes: bullish, bearish, neutral
  const [sourceFilters, setSourceFilters] = useState<string[]>([]); // checkboxes for sources
  const [searchQuery, setSearchQuery] = useState("");
  
  const [sortBy, setSortBy] = useState<"time" | "change" | "sentiment">("time");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Get unique sources from news
  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    news.forEach((item) => {
      if (item.from) sources.add(item.from);
    });
    return Array.from(sources);
  }, [news]);

  /* ---------------- FETCH PRICE CHANGE ---------------- */
  const fetchPriceChange = async (symbol: string, force = false) => {
    if (!force && priceCache[symbol] !== undefined) return;
    
    setPriceCache((prev) => ({ ...prev, [symbol]: { change: prev[symbol]?.change || 0, loading: !force } }));
    
    try {
      const res = await fetch(
        `https://droidtechknow.com/admin/api/stocks/chart.php?symbol=${symbol}&interval=1d&range=1d`,
        { cache: "no-store" }
      );
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
 
      if (meta?.chartPreviousClose && meta?.regularMarketPrice) {
        const prevClose = meta.chartPreviousClose;
        const currentPrice = meta.regularMarketPrice;
        const change = ((currentPrice - prevClose) / prevClose) * 100;
        setPriceCache((prev) => ({ ...prev, [symbol]: { change, loading: false } }));
      } else {
        setPriceCache((prev) => ({ ...prev, [symbol]: { change: 0, loading: false } }));
      }
    } catch {
      setPriceCache((prev) => ({ ...prev, [symbol]: { change: prev[symbol]?.change || 0, loading: false } }));
    }
  };

  /* ---------------- GET ALL SYMBOLS ---------------- */
  const getAllSymbols = useCallback(() => {
    const items = activeTab === "saved" ? savedNews : activeTab === "later" ? laterNews : news;
    const symbols: string[] = [];
    items.forEach((item) => {
      const cta = item.data?.cta?.[0];
      const nseCode = cta?.meta?.nseScriptCode;
      const bseCode = cta?.meta?.bseScriptCode;
      const symbol = nseCode ? `${nseCode}.NS` : bseCode ? `${bseCode}.BO` : "";
      if (symbol && !symbols.includes(symbol)) symbols.push(symbol);
    });
    return symbols;
  }, [news, savedNews, laterNews, activeTab]);

  /* ---------------- AUTO FETCH NEWS ---------------- */
  const fetchNewsForAutoRefresh = useCallback(async () => {
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
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      // Find new items that weren't in previous news
      const existingIds = new Set(news.map((n) => n.postId));
      const newIds = all.filter((item) => !existingIds.has(item.postId)).map((item) => item.postId);

      const enriched = await Promise.all(
        all.map(async (item) => {
          try {
            if (item?.machineLearningSentiments?.label) {
              return {
                ...item,
                __sentiment: mapSentiment(item.machineLearningSentiments.label),
                __confidence: item.machineLearningSentiments.confidence ?? 0.5
              };
            }

            const title = item?.data?.title;
            if (!title) {
              return { ...item, __sentiment: "neutral", __confidence: 0.5 };
            }

            const local = await getSentimentLocal(title);
            return {
              ...item,
              __sentiment: mapSentiment(local?.label),
              __confidence: local?.confidence ?? 0.5
            };
          } catch {
            return { ...item, __sentiment: "neutral", __confidence: 0.5 };
          }
        })
      );

      setNews(enriched);
      
      // Highlight new items
      if (newIds.length > 0) {
        setHighlightedNews((prev) => {
          const updated = new Set(prev);
          newIds.forEach((id) => updated.add(id));
          return updated;
        });
        toast.success(`${newIds.length} new news items`);
      }
    } catch {
      // Silent fail for auto-refresh
    }
  }, [fromDate, toDate, news]);

  useEffect(() => {
    if (autoFetchNews) {
      autoFetchNewsRef.current = setInterval(() => {
        fetchNewsForAutoRefresh();
      }, 750);
    } else {
      if (autoFetchNewsRef.current) {
        clearInterval(autoFetchNewsRef.current);
        autoFetchNewsRef.current = null;
      }
    }

    return () => {
      if (autoFetchNewsRef.current) {
        clearInterval(autoFetchNewsRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetchNews]);

  /* ---------------- LOAD SAVED & LATER ---------------- */
  useEffect(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) setSavedNews(JSON.parse(s));
    const l = localStorage.getItem(LATER_STORAGE_KEY);
    if (l) setLaterNews(JSON.parse(l));
  }, []);

  /* ---------------- FETCH ---------------- */
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
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      const enriched = await Promise.all(
        all.map(async (item) => {
          try {
            if (item?.machineLearningSentiments?.label) {
              return {
                ...item,
                __sentiment: mapSentiment(item.machineLearningSentiments.label),
                __confidence: item.machineLearningSentiments.confidence ?? 0.5
              };
            }

            const title = item?.data?.title;
            if (!title) {
              return { ...item, __sentiment: "neutral", __confidence: 0.5 };
            }

            const local = await getSentimentLocal(title);
            return {
              ...item,
              __sentiment: mapSentiment(local?.label),
              __confidence: local?.confidence ?? 0.5
            };
          } catch {
            return { ...item, __sentiment: "neutral", __confidence: 0.5 };
          }
        })
      );

      setNews(enriched);
    } catch {
      toast.error("Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FILTERS ---------------- */
  const applyFilters = (items: any[]) => {
    let f = [...items];

    // Time range filter (double slider)
    if (timeRange[0] !== TIME_MIN || timeRange[1] !== TIME_MAX) {
      f = f.filter((i) => {
        const h = new Date(i.publishedAt).getHours();
        return h >= timeRange[0] && h < timeRange[1];
      });
    }

    // Sentiment checkboxes filter
    if (sentimentFilters.length > 0) {
      f = f.filter(
        (i) =>
          sentimentFilters.includes(i.__sentiment) || 
          sentimentFilters.includes(i.sentiment)
      );
    }

    // Source filter (checkboxes)
    if (sourceFilters.length > 0) {
      f = f.filter((i) => sourceFilters.includes(i.from));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      f = f.filter((i) => {
        const title = i.data?.title?.toLowerCase() || "";
        const body = i.data?.body?.toLowerCase() || "";
        const ctaText = i.data?.cta?.[0]?.ctaText?.toLowerCase() || "";
        return title.includes(query) || body.includes(query) || ctaText.includes(query);
      });
    }

    return f;
  };

  const toggleSentimentFilter = (sentiment: string) => {
    setSentimentFilters((prev) =>
      prev.includes(sentiment)
        ? prev.filter((s) => s !== sentiment)
        : [...prev, sentiment]
    );
  };

  const sortItems = (items: any[]) => {
    if (sortBy === "change") {
      return [...items].sort((a, b) => {
        const nseA = a.data?.cta?.[0]?.meta?.nseScriptCode;
        const bseA = a.data?.cta?.[0]?.meta?.bseScriptCode;
        const symbolA = nseA ? `${nseA}.NS` : bseA ? `${bseA}.BO` : "";
        
        const nseB = b.data?.cta?.[0]?.meta?.nseScriptCode;
        const bseB = b.data?.cta?.[0]?.meta?.bseScriptCode;
        const symbolB = nseB ? `${nseB}.NS` : bseB ? `${bseB}.BO` : "";
        
        const changeA = priceCache[symbolA]?.change || 0;
        const changeB = priceCache[symbolB]?.change || 0;
        return changeB - changeA;
      });
    }
    if (sortBy === "sentiment") {
      return [...items].sort((a, b) => {
        const confA = a.__confidence || 0;
        const confB = b.__confidence || 0;
        return confB - confA;
      });
    }
    return items;
  };

  const filteredNews = useMemo(
    () => sortItems(applyFilters(news)),
    [news, timeRange, sentimentFilters, sourceFilters, searchQuery, sortBy, priceCache]
  );

  const filteredSaved = useMemo(
    () => sortItems(applyFilters(savedNews)),
    [savedNews, timeRange, sentimentFilters, sourceFilters, searchQuery, sortBy, priceCache]
  );

  const filteredLater = useMemo(
    () => sortItems(applyFilters(laterNews)),
    [laterNews, timeRange, sentimentFilters, sourceFilters, searchQuery, sortBy, priceCache]
  );

  /* ---------------- SAVE ---------------- */
  const saveNews = (item: any, sentiment: "bullish" | "bearish") => {
    const existing = savedNews.find((s) => s.postId === item.postId);
    const updated = [
      ...savedNews.filter((s) => s.postId !== item.postId),
      { ...item, sentiment, remark: existing?.remark || item.remark || "", savedAt: new Date().toISOString() }
    ];
    setSavedNews(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success(`Saved as ${sentiment}`);
  };

  const removeSaved = (postId: string) => {
    const updated = savedNews.filter((s) => s.postId !== postId);
    setSavedNews(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast.success("Removed from saved");
  };

  const updateSavedRemark = (postId: string, remark: string) => {
    const updated = savedNews.map((item) =>
      item.postId === postId ? { ...item, remark } : item
    );
    setSavedNews(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const getSavedSentiment = (postId: string) =>
    savedNews.find((s) => s.postId === postId)?.sentiment || "";

  /* ---------------- SAVE FOR LATER ---------------- */
  const moveToLater = (item: any, remark: string = "") => {
    // Remove from saved
    const updatedSaved = savedNews.filter((s) => s.postId !== item.postId);
    setSavedNews(updatedSaved);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSaved));
    
    // Add to later
    const updatedLater = [
      ...laterNews.filter((s) => s.postId !== item.postId),
      { ...item, remark, movedAt: new Date().toISOString() }
    ];
    setLaterNews(updatedLater);
    localStorage.setItem(LATER_STORAGE_KEY, JSON.stringify(updatedLater));
    toast.success("Moved to Save for Later");
  };

  const updateRemark = (postId: string, remark: string) => {
    const updated = laterNews.map((item) =>
      item.postId === postId ? { ...item, remark } : item
    );
    setLaterNews(updated);
    localStorage.setItem(LATER_STORAGE_KEY, JSON.stringify(updated));
  };

  const removeLater = (postId: string) => {
    const updated = laterNews.filter((s) => s.postId !== postId);
    setLaterNews(updated);
    localStorage.setItem(LATER_STORAGE_KEY, JSON.stringify(updated));
    toast.success("Removed from Save for Later");
  };

  const moveBackToSaved = (item: any) => {
    // Remove from later
    const updatedLater = laterNews.filter((s) => s.postId !== item.postId);
    setLaterNews(updatedLater);
    localStorage.setItem(LATER_STORAGE_KEY, JSON.stringify(updatedLater));
    
    // Add back to saved
    const updatedSaved = [
      ...savedNews.filter((s) => s.postId !== item.postId),
      { ...item, savedAt: new Date().toISOString() }
    ];
    setSavedNews(updatedSaved);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSaved));
    toast.success("Moved back to Saved");
  };

  /* ---------------- COPY ---------------- */
  const copyAllNews = () => {
    const list = activeTab === "saved" ? filteredSaved : activeTab === "later" ? filteredLater : filteredNews;

    navigator.clipboard.writeText(
      list
        .map((i) => {
          return (
            format(new Date(i.publishedAt), "dd MMM yyyy hh:mma") +
            " | " +
            i.data.title
          );
        })
        .join("\n")
    );
    toast.success("Copied");
  };

  const SortableNewsCard = ({ item }: { item: any }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: item.postId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      width: "100%" // ensure grid items stretch
    };

    return (
      <div ref={setNodeRef} style={style} className="relative">
        <NewsCard
          item={item}
          __dragHandleProps={{ ...attributes, ...listeners }}
        />
      </div>
    );
  };

  /* ================= CARD ================= */
  const NewsCard = ({
    item,
    __dragHandleProps
  }: {
    item: any;
    __dragHandleProps?: any;
  }) => {
    const cta = item.data?.cta?.[0];
    const savedSentiment = getSavedSentiment(item.postId);
    const nseCode = cta?.meta?.nseScriptCode;
    const bseCode = cta?.meta?.bseScriptCode;
    const symbol = nseCode ? `${nseCode}.NS` : bseCode ? `${bseCode}.BO` : "";
    const priceData = priceCache[symbol];
    const isHighlighted = highlightedNews.has(item.postId);

    const handleCardClick = () => {
      if (isHighlighted) {
        setHighlightedNews((prev) => {
          const updated = new Set(prev);
          updated.delete(item.postId);
          return updated;
        });
      }
    };

    // Fetch price change when card mounts
    useEffect(() => {
      if (symbol) {
        fetchPriceChange(symbol);
      }
    }, [symbol]);

    return (
      <Card 
        className={cn(
          "bg-[#0d1117] rounded-lg cursor-pointer transition-all",
          isHighlighted 
            ? "border-2 border-yellow-500 shadow-lg shadow-yellow-500/20" 
            : "border border-white/10"
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-3 flex flex-col h-full">
          {/* HEADER */}
          <div className="flex gap-2 mb-2">
            {cta?.logoUrl && (
              <img src={cta.logoUrl} className="w-8 h-8 rounded" />
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <a
                  href={cta?.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-blue-400 hover:underline"
                >
                  {cta?.ctaText || item.data.title}
                </a>
                {priceData && !priceData.loading && priceData.change !== 0 && (
                  <span
                    className={cn(
                      "text-xs font-semibold px-1.5 py-0.5 rounded",
                      priceData.change >= 0
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    )}
                  >
                    {priceData.change >= 0 ? "+" : ""}
                    {priceData.change.toFixed(2)}%
                  </span>
                )}
                {priceData?.loading && (
                  <span className="text-xs text-gray-500">...</span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {format(new Date(item.publishedAt), "dd MMM yyyy hh:mma")}
              </div>
            </div>

            {activeTab === "saved" && (
              <div className="flex gap-1">
                <span title="Save for Later">
                  <Clock
                    onClick={() => moveToLater(item)}
                    className="h-4 w-4 text-yellow-400 cursor-pointer hover:text-yellow-500"
                  />
                </span>
                <Trash2
                  onClick={() => removeSaved(item.postId)}
                  className="h-4 w-4 text-red-400 cursor-pointer hover:text-red-500"
                />
              </div>
            )}
            {activeTab === "later" && (
              <div className="flex gap-1">
                <span title="Move back to Saved">
                  <ArrowLeft
                    onClick={() => moveBackToSaved(item)}
                    className="h-4 w-4 text-blue-400 cursor-pointer hover:text-blue-500"
                  />
                </span>
                <Trash2
                  onClick={() => removeLater(item.postId)}
                  className="h-4 w-4 text-red-400 cursor-pointer hover:text-red-500"
                />
              </div>
            )}
          </div>

          {/* BODY */}
          <p className="text-sm text-gray-300 whitespace-pre-line">
            {item.data.body}
          </p>

          <div style={{
            display: "flex",
    justifyContent: "space-between"
          }}>
            {item?.from && (
            <span className="mt-2 inline-block text-xs px-2 py-[2px] rounded bg-white/10 text-gray-300 w-fit">
              {item.from}
            </span>
          )}

          {
            item?.data?.media?.length ? <a rel="noreferrer" href={`${item?.data?.media?.[0].url}`} target="_blank">
              <File
                className="h-4 w-4 text-blue-400 cursor-pointer hover:text-blue-500"
              />
            </a>: null
          }
          </div>

          {/* REMARK - For Saved and Later tabs */}
          {(activeTab === "saved" || activeTab === "later") && (
            <div className="mt-2">
              <Input
                placeholder="Add remark..."
                value={item.remark || ""}
                onChange={(e) => 
                  activeTab === "saved" 
                    ? updateSavedRemark(item.postId, e.target.value)
                    : updateRemark(item.postId, e.target.value)
                }
                className="h-7 text-xs bg-white/5 border-white/10"
              />
            </div>
          )}

          {/* FOOTER */}
          <div
            {...__dragHandleProps}
            className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 cursor-grab active:cursor-grabbing"
          >
            <span
              className={cn(
                "text-xs px-2 py-[2px] rounded",
                item.__sentiment === "bullish" &&
                  "bg-green-500/20 text-green-400",
                item.__sentiment === "bearish" && "bg-red-500/20 text-red-400",
                item.__sentiment === "neutral" &&
                  "bg-yellow-500/20 text-yellow-400"
              )}
            >
              AI: {item.__sentiment} ({(item.__confidence * 100).toFixed(0)}%)
            </span>

            <Select
              value={savedSentiment}
              onValueChange={(v) => saveNews(item, v as any)}
            >
              <SelectTrigger
                className={cn(
                  "h-7 w-24 text-xs",
                  savedSentiment === "bullish" &&
                    "bg-green-500/20 text-green-400",
                  savedSentiment === "bearish" && "bg-red-500/20 text-red-400"
                )}
              >
                <SelectValue placeholder="Save" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bullish">
                  <TrendingUp className="h-3 w-3 mr-1 inline" />
                  Bullish
                </SelectItem>
                <SelectItem value="bearish">
                  <TrendingDown className="h-3 w-3 mr-1 inline" />
                  Bearish
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  };

  const NewsGrid = ({ items }: any) => (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 auto-rows-min">
      {loading
        ? [...Array(10)].map((_, i) => <Skeleton key={i} className="h-40" />)
        : items.map((i: any) => <SortableNewsCard key={i.postId} item={i} />)}
    </div>
  );

  /* ================= UI ================= */
  return (
    <div className="h-[95vh] flex flex-col">
      {/* HEADER */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {format(fromDate, "dd MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(d) => d && setFromDate(d)}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {format(toDate, "dd MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(d) => d && setToDate(d)}
            />
          </PopoverContent>
        </Popover>

        <Button size="sm" onClick={fetchNews}>
          Fetch
        </Button>

        <div className="flex items-center gap-1.5">
          <Checkbox 
            id="auto-fetch-news" 
            checked={autoFetchNews} 
            onCheckedChange={(checked) => setAutoFetchNews(checked === true)}
          />
          <Label htmlFor="auto-fetch-news" className="text-xs cursor-pointer">
            Auto
          </Label>
        </div>

        <div className="flex flex-wrap gap-2 ml-auto items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="selected">Selected</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
              <TabsTrigger value="later">Later</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button size="sm" variant="outline" onClick={copyAllNews}>
            <Copy className="h-4 w-4" />
          </Button>

          <Button size="sm" variant="outline" onClick={fetchNews}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              const symbols = getAllSymbols();
              symbols.forEach((symbol) => fetchPriceChange(symbol, true));
              toast.success(`Fetching prices for ${symbols.length} stocks`);
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Prices
          </Button>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "time" | "change" | "sentiment")}>
            <SelectTrigger className="h-8 w-32 text-xs">
              Sort
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="change">% Change</SelectItem>
              <SelectItem value="sentiment">Sentiment %</SelectItem>
            </SelectContent>
          </Select>

          {/* Combined Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Filter className="h-4 w-4" />
                Filters
                {((timeRange[0] !== TIME_MIN || timeRange[1] !== TIME_MAX) || sentimentFilters.length > 0 || sourceFilters.length > 0) && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                    {((timeRange[0] !== TIME_MIN || timeRange[1] !== TIME_MAX) ? 1 : 0) + sentimentFilters.length + sourceFilters.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="space-y-4">
                {/* Time Range Slider */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Time: {timeRange[0]}:00 - {timeRange[1]}:00
                  </Label>
                  <Slider
                    value={timeRange}
                    onValueChange={(v) => setTimeRange(v as [number, number])}
                    min={TIME_MIN}
                    max={TIME_MAX}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0:00</span>
                    <span>6:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>24:00</span>
                  </div>
                </div>

                {/* Sentiment Checkboxes */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Sentiment</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="bullish"
                        checked={sentimentFilters.includes("bullish")}
                        onCheckedChange={() => toggleSentimentFilter("bullish")}
                      />
                      <Label htmlFor="bullish" className="text-xs cursor-pointer text-green-400">Bullish</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="bearish"
                        checked={sentimentFilters.includes("bearish")}
                        onCheckedChange={() => toggleSentimentFilter("bearish")}
                      />
                      <Label htmlFor="bearish" className="text-xs cursor-pointer text-red-400">Bearish</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="neutral"
                        checked={sentimentFilters.includes("neutral")}
                        onCheckedChange={() => toggleSentimentFilter("neutral")}
                      />
                      <Label htmlFor="neutral" className="text-xs cursor-pointer text-yellow-400">Neutral</Label>
                    </div>
                  </div>
                </div>

                {/* Source Filter Checkboxes */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Source</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableSources.map((source) => (
                      <div key={source} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`source-${source}`}
                          checked={sourceFilters.includes(source)}
                          onCheckedChange={() => {
                            setSourceFilters((prev) =>
                              prev.includes(source)
                                ? prev.filter((s) => s !== source)
                                : [...prev, source]
                            );
                          }}
                        />
                        <Label htmlFor={`source-${source}`} className="text-xs cursor-pointer">{source}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => {
                    setTimeRange([TIME_MIN, TIME_MAX]);
                    setSentimentFilters([]);
                    setSourceFilters([]);
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-40 pl-7 pr-7 text-xs"
            />
            {searchQuery && (
              <X
                className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => setSearchQuery("")}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === "saved" ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;

              setSavedNews((prev) => {
                const oldIndex = prev.findIndex((i) => i.postId === active.id);
                const newIndex = prev.findIndex((i) => i.postId === over.id);
                return arrayMove(prev, oldIndex, newIndex);
              });
            }}
          >
            <SortableContext items={savedNews.map((i) => i.postId)}>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 auto-rows-min">
                {filteredSaved.map((item) => (
                  <SortableNewsCard key={item.postId} item={item} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : activeTab === "later" ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;

              setLaterNews((prev) => {
                const oldIndex = prev.findIndex((i) => i.postId === active.id);
                const newIndex = prev.findIndex((i) => i.postId === over.id);
                return arrayMove(prev, oldIndex, newIndex);
              });
            }}
          >
            <SortableContext items={laterNews.map((i) => i.postId)}>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 auto-rows-min">
                {filteredLater.map((item) => (
                  <SortableNewsCard key={item.postId} item={item} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <NewsGrid items={filteredNews} />
        )}
      </div>
    </div>
  );
}
