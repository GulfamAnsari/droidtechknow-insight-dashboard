import { useState, useEffect, useMemo } from "react";
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
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Copy,
  Filter,
  CalendarIcon,
  Trash2
} from "lucide-react";
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

const mapSentiment = (label?: string) => {
  if (label === "positive") return "bullish";
  if (label === "negative") return "bearish";
  return "neutral";
};

export default function StockNews() {
  const [news, setNews] = useState<any[]>([]);
  const [savedNews, setSavedNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("selected");
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());

  const [timeFilter, setTimeFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  /* ---------------- LOAD SAVED ---------------- */
  useEffect(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) setSavedNews(JSON.parse(s));
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

    if (timeFilter !== "all") {
      f = f.filter((i) => {
        const h = new Date(i.publishedAt).getHours();
        if (timeFilter === "morning") return h >= 9 && h < 12;
        if (timeFilter === "afternoon") return h >= 12 && h < 15;
        return h >= 15;
      });
    }

    if (sentimentFilter !== "all") {
      f = f.filter(
        (i) =>
          i.__sentiment === sentimentFilter || i.sentiment === sentimentFilter
      );
    }

    return f;
  };

  const filteredNews = useMemo(
    () => applyFilters(news),
    [news, timeFilter, sentimentFilter]
  );

  const filteredSaved = useMemo(
    () => applyFilters(savedNews),
    [savedNews, timeFilter, sentimentFilter]
  );

  /* ---------------- SAVE ---------------- */
  const saveNews = (item: any, sentiment: "bullish" | "bearish") => {
    const updated = [
      ...savedNews.filter((s) => s.postId !== item.postId),
      { ...item, sentiment, savedAt: new Date().toISOString() }
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

  const getSavedSentiment = (postId: string) =>
    savedNews.find((s) => s.postId === postId)?.sentiment || "";

  /* ---------------- COPY ---------------- */
  const copyAllNews = () => {
    const list = activeTab === "saved" ? filteredSaved : filteredNews;

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

    return (
      <Card className="bg-[#0d1117] border border-white/10 rounded-lg">
        <CardContent className="p-3 flex flex-col h-full">
          {/* HEADER */}
          <div className="flex gap-2 mb-2">
            {cta?.logoUrl && (
              <img src={cta.logoUrl} className="w-8 h-8 rounded" />
            )}

            <div className="flex-1">
              <a
                href={cta?.ctaUrl}
                target="_blank"
                className="text-sm font-semibold text-blue-400 hover:underline"
              >
                {cta?.ctaText || item.data.title}
              </a>
              <div className="text-xs text-gray-400">
                {format(new Date(item.publishedAt), "dd MMM yyyy hh:mma")}
              </div>
            </div>

            {activeTab === "saved" && (
              <Trash2
                onClick={() => removeSaved(item.postId)}
                className="h-4 w-4 text-red-400 cursor-pointer hover:text-red-500"
              />
            )}
          </div>

          {/* BODY */}
          <p className="text-sm text-gray-300 whitespace-pre-line">
            {item.data.body}
          </p>

          {item?.from && (
            <span className="mt-2 inline-block text-xs px-2 py-[2px] rounded bg-white/10 text-gray-300 w-fit">
              {item.from}
            </span>
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
      {/* HEADER (UNCHANGED) */}
      <div className="flex items-center gap-2 p-3 border-b">
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

        <div className="ml-auto flex gap-2">
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

          <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
            <SelectTrigger className="h-8 w-28 text-xs">
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
        ) : (
          <NewsGrid items={filteredNews} />
        )}
      </div>
    </div>
  );
}
