import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, RefreshCw, Copy, TrendingUp, TrendingDown, Bookmark, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NewsItem {
  name: string;
  postId: string;
  category: string | null;
  publisher: string;
  publisherId: string;
  publishedAt: string;
  expireAt: string;
  campaignType: string;
  data: {
    cta: Array<{
      type: string;
      ctaText: string;
      ctaUrl: string;
      logoUrl: string;
      meta: {
        bseScriptCode: string;
        nseScriptCode: string;
      };
    }>;
    title: string;
    body: string;
    media: any[];
    reactions: Array<{
      type: string;
      count: number;
      active: boolean;
    }>;
  };
}

interface SavedNews extends NewsItem {
  sentiment: 'bullish' | 'bearish';
  savedAt: string;
}

const STORAGE_KEY = 'stock-news-saved';

export default function StockNews() {
  const [activeTab, setActiveTab] = useState('selected');
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedNews, setSavedNews] = useState<SavedNews[]>([]);

  // Load saved news from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSavedNews(JSON.parse(saved));
    }
  }, []);

  // Fetch news from API
  const fetchNews = async () => {
    setLoading(true);
    try {
      const fromStr = format(fromDate, 'dd-MM-yyyy');
      const toStr = format(toDate, 'dd-MM-yyyy');
      const response = await fetch(
        `https://droidtechknow.com/admin/api/stocks/news/save.php?from=${fromStr}&to=${toStr}`
      );
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        const allNews: NewsItem[] = [];
        Object.values(result.data).forEach((dateNews: any) => {
          if (Array.isArray(dateNews)) {
            allNews.push(...dateNews);
          }
        });
        setNews(allNews);
      } else {
        setNews([]);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Failed to fetch news');
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Filter news after 3:30 PM
  const getAfter330News = () => {
    return news.filter(item => {
      const publishedDate = new Date(item.publishedAt);
      const hours = publishedDate.getHours();
      const minutes = publishedDate.getMinutes();
      return hours > 15 || (hours === 15 && minutes >= 30);
    });
  };

  // Save news with sentiment
  const saveNewsItem = (item: NewsItem, sentiment: 'bullish' | 'bearish') => {
    const newSavedItem: SavedNews = {
      ...item,
      sentiment,
      savedAt: new Date().toISOString()
    };
    
    const existingIndex = savedNews.findIndex(n => n.postId === item.postId);
    let updatedSaved: SavedNews[];
    
    if (existingIndex >= 0) {
      updatedSaved = [...savedNews];
      updatedSaved[existingIndex] = newSavedItem;
    } else {
      updatedSaved = [...savedNews, newSavedItem];
    }
    
    setSavedNews(updatedSaved);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSaved));
    toast.success(`Saved as ${sentiment}`);
  };

  // Remove saved news
  const removeSavedNews = (postId: string) => {
    const updatedSaved = savedNews.filter(n => n.postId !== postId);
    setSavedNews(updatedSaved);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSaved));
    toast.success('Removed from saved');
  };

  // Copy all news titles
  const copyAllNews = () => {
    const currentNews = activeTab === 'saved' ? savedNews : 
                        activeTab === 'after330' ? getAfter330News() : news;
    const titles = currentNews.map(item => item.data.title).join('\n\n');
    navigator.clipboard.writeText(titles);
    toast.success('Copied all news titles');
  };

  // Check if news is saved
  const getSavedSentiment = (postId: string): 'bullish' | 'bearish' | null => {
    const saved = savedNews.find(n => n.postId === postId);
    return saved?.sentiment || null;
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'hh:mm a');
    } catch {
      return '';
    }
  };

  const NewsCard = ({ item, showSentimentBadge = false }: { item: NewsItem | SavedNews; showSentimentBadge?: boolean }) => {
    const savedSentiment = getSavedSentiment(item.postId);
    const cta = item.data.cta?.[0];
    
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/50 bg-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {cta?.logoUrl && (
              <img 
                src={cta.logoUrl} 
                alt={cta.ctaText}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {cta && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {cta.ctaText}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatTime(item.publishedAt)}
                </span>
                {showSentimentBadge && 'sentiment' in item && (
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1",
                    item.sentiment === 'bullish' 
                      ? "bg-green-500/20 text-green-500" 
                      : "bg-red-500/20 text-red-500"
                  )}>
                    {item.sentiment === 'bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {item.sentiment}
                  </span>
                )}
              </div>
              
              <h3 className="font-semibold text-sm leading-tight mb-2 line-clamp-2">
                {item.data.title}
              </h3>
              
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                {item.data.body}
              </p>
              
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  {item.publisher}
                </span>
                
                <div className="flex items-center gap-1">
                  {cta?.ctaUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => window.open(cta.ctaUrl, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  
                  {activeTab === 'saved' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeSavedNews(item.postId)}
                    >
                      <Bookmark className="h-3.5 w-3.5 fill-current" />
                    </Button>
                  ) : (
                    <Select
                      value={savedSentiment || ''}
                      onValueChange={(value) => saveNewsItem(item, value as 'bullish' | 'bearish')}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue placeholder="Save as" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bullish">
                          <span className="flex items-center gap-1 text-green-500">
                            <TrendingUp className="h-3 w-3" /> Bullish
                          </span>
                        </SelectItem>
                        <SelectItem value="bearish">
                          <span className="flex items-center gap-1 text-red-500">
                            <TrendingDown className="h-3 w-3" /> Bearish
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const NewsGrid = ({ items, showSentimentBadge = false }: { items: (NewsItem | SavedNews)[]; showSentimentBadge?: boolean }) => {
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No news available</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <NewsCard key={item.postId} item={item} showSentimentBadge={showSentimentBadge} />
        ))}
      </div>
    );
  };

  return (
    <div className="h-[95vh] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border bg-background/95 backdrop-blur">
        {/* Date Pickers */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(fromDate, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={(date) => date && setFromDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <span className="text-muted-foreground">to</span>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(toDate, 'dd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={(date) => date && setToDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={fetchNews}>
            Fetch
          </Button>
          <Button variant="outline" size="sm" onClick={copyAllNews}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={fetchNews}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start px-4 py-2 bg-background border-b border-border rounded-none">
          <TabsTrigger value="selected">Selected</TabsTrigger>
          <TabsTrigger value="after330">After 3:30 PM</TabsTrigger>
          <TabsTrigger value="saved">
            Saved ({savedNews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="selected" className="flex-1 overflow-auto p-4 mt-0">
          <NewsGrid items={news} />
        </TabsContent>

        <TabsContent value="after330" className="flex-1 overflow-auto p-4 mt-0">
          <NewsGrid items={getAfter330News()} />
        </TabsContent>

        <TabsContent value="saved" className="flex-1 overflow-auto p-4 mt-0">
          <NewsGrid items={savedNews} showSentimentBadge />
        </TabsContent>
      </Tabs>
    </div>
  );
}
