import { useState, useEffect, useMemo } from 'react';
import { format, parse } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, RefreshCw, Copy, TrendingUp, TrendingDown, Bookmark, ExternalLink, Filter } from 'lucide-react';
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
  
  // Filters
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');

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

  // Apply filters to news
  const applyFilters = (items: (NewsItem | SavedNews)[]) => {
    let filtered = [...items];
    
    // Time filter
    if (timeFilter === 'morning') {
      filtered = filtered.filter(item => {
        const hours = new Date(item.publishedAt).getHours();
        return hours >= 9 && hours < 12;
      });
    } else if (timeFilter === 'afternoon') {
      filtered = filtered.filter(item => {
        const hours = new Date(item.publishedAt).getHours();
        return hours >= 12 && hours < 15;
      });
    } else if (timeFilter === 'evening') {
      filtered = filtered.filter(item => {
        const hours = new Date(item.publishedAt).getHours();
        return hours >= 15;
      });
    }
    
    // Sentiment filter (only for saved news)
    if (sentimentFilter !== 'all') {
      filtered = filtered.filter(item => {
        if ('sentiment' in item) {
          return item.sentiment === sentimentFilter;
        }
        const saved = getSavedSentiment(item.postId);
        return saved === sentimentFilter;
      });
    }
    
    return filtered;
  };

  const filteredNews = useMemo(() => applyFilters(news), [news, timeFilter, sentimentFilter]);
  const filteredAfter330 = useMemo(() => applyFilters(getAfter330News()), [news, timeFilter, sentimentFilter]);
  const filteredSaved = useMemo(() => applyFilters(savedNews), [savedNews, timeFilter, sentimentFilter]);

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

  // Copy all news with date and time
  const copyAllNews = () => {
    const currentNews = activeTab === 'saved' ? savedNews : 
                        activeTab === 'after330' ? getAfter330News() : news;
    const formattedNews = currentNews.map(item => {
      const date = format(new Date(item.publishedAt), 'dd-MM-yyyy');
      const time = format(new Date(item.publishedAt), 'hh:mma');
      return `${date} | ${time} | ${item.data.title}`;
    }).join('\n');
    navigator.clipboard.writeText(formattedNews);
    toast.success('Copied all news');
  };

  // Check if news is saved
  const getSavedSentiment = (postId: string): 'bullish' | 'bearish' | null => {
    const saved = savedNews.find(n => n.postId === postId);
    return saved?.sentiment || null;
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'hh:mma');
    } catch {
      return '';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return '';
    }
  };

  const NewsCard = ({ item, showSentimentBadge = false }: { item: NewsItem | SavedNews; showSentimentBadge?: boolean }) => {
    const savedSentiment = getSavedSentiment(item.postId);
    const cta = item.data.cta?.[0];
    
    return (
      <TooltipProvider>
        <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/50 bg-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {cta?.logoUrl && (
                <img 
                  src={cta.logoUrl} 
                  alt={cta.ctaText}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                {/* Stock Name - Large Blue */}
                {cta && (
                  <h2 className="text-lg font-bold text-blue-500 mb-1">
                    {cta.ctaText}
                  </h2>
                )}
                
                {/* Date and Time */}
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <span>{formatDate(item.publishedAt)}</span>
                  <span>•</span>
                  <span>{formatTime(item.publishedAt)}</span>
                  {showSentimentBadge && 'sentiment' in item && (
                    <span className={cn(
                      "font-medium px-2 py-0.5 rounded flex items-center gap-1 ml-auto",
                      item.sentiment === 'bullish' 
                        ? "bg-green-500/20 text-green-500" 
                        : "bg-red-500/20 text-red-500"
                    )}>
                      {item.sentiment === 'bullish' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {item.sentiment}
                    </span>
                  )}
                </div>
                
                {/* Title */}
                <h3 className="font-semibold text-sm leading-tight mb-2 line-clamp-2">
                  {item.data.title}
                </h3>
                
                {/* Description - 2 lines with tooltip on hover */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-2 cursor-help">
                      {item.data.body}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm">
                    <p className="text-xs whitespace-pre-line">{item.data.body}</p>
                  </TooltipContent>
                </Tooltip>
                
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
      </TooltipProvider>
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
        {/* Fetch Button - Left aligned */}
        <Button variant="default" size="sm" onClick={fetchNews}>
          Fetch
        </Button>
        
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
        <div className="flex items-center justify-between px-4 py-2 bg-background border-b border-border">
          <TabsList className="bg-transparent">
            <TabsTrigger value="selected">Selected ({filteredNews.length})</TabsTrigger>
            <TabsTrigger value="after330">After 3:30 PM ({filteredAfter330.length})</TabsTrigger>
            <TabsTrigger value="saved">Saved ({filteredSaved.length})</TabsTrigger>
          </TabsList>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="morning">Morning (9-12)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12-3)</SelectItem>
                <SelectItem value="evening">Evening (3+)</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
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
          </div>
        </div>

        <TabsContent value="selected" className="flex-1 overflow-auto p-4 mt-0">
          <NewsGrid items={filteredNews} />
        </TabsContent>

        <TabsContent value="after330" className="flex-1 overflow-auto p-4 mt-0">
          <NewsGrid items={filteredAfter330} />
        </TabsContent>

        <TabsContent value="saved" className="flex-1 overflow-auto p-4 mt-0">
          <NewsGrid items={filteredSaved} showSentimentBadge />
        </TabsContent>
      </Tabs>
    </div>
  );
}
