import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, TrendingUp } from 'lucide-react';
import { fetchAllFeeds, fetchFeedBySource, NewsItem } from '@/services/rssApi';

const NewsCard = ({ item }: { item: NewsItem }) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
          <a 
            href={item.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="shrink-0 p-2 hover:bg-accent rounded-md transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <CardDescription className="flex items-center gap-2 text-xs">
          <span className="font-medium">{item.source}</span>
          <span>•</span>
          <span>{formatDate(item.pubDate)}</span>
        </CardDescription>
      </CardHeader>
      {item.description && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {item.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
};

const NewsGrid = ({ news, isLoading }: { news: NewsItem[]; isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No news available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {news.map((item, index) => (
        <NewsCard key={`${item.link}-${index}`} item={item} />
      ))}
    </div>
  );
};

export default function StockNews() {
  const [activeTab, setActiveTab] = useState('all');

  const { data: allNews = [], isLoading: loadingAll } = useQuery({
    queryKey: ['stock-news', 'all'],
    queryFn: fetchAllFeeds,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  const { data: livemintNews = [], isLoading: loadingLivemint } = useQuery({
    queryKey: ['stock-news', 'livemint'],
    queryFn: () => fetchFeedBySource('livemint'),
    enabled: activeTab === 'livemint',
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const { data: bsNews = [], isLoading: loadingBS } = useQuery({
    queryKey: ['stock-news', 'businessStandard'],
    queryFn: () => fetchFeedBySource('businessStandard'),
    enabled: activeTab === 'businessStandard',
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const { data: investingNews = [], isLoading: loadingInvesting } = useQuery({
    queryKey: ['stock-news', 'investing'],
    queryFn: () => fetchFeedBySource('investing'),
    enabled: activeTab === 'investing',
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  const { data: paisaNews = [], isLoading: loadingPaisa } = useQuery({
    queryKey: ['stock-news', 'paisa'],
    queryFn: () => fetchFeedBySource('paisa'),
    enabled: activeTab === 'paisa',
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Indian Stock Market News</h1>
        </div>
        <p className="text-muted-foreground">
          Latest market updates from leading financial news sources
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All News</TabsTrigger>
          <TabsTrigger value="livemint">LiveMint</TabsTrigger>
          <TabsTrigger value="businessStandard">Business Standard</TabsTrigger>
          <TabsTrigger value="investing">Investing.com</TabsTrigger>
          <TabsTrigger value="paisa">5Paisa</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <NewsGrid news={allNews} isLoading={loadingAll} />
        </TabsContent>

        <TabsContent value="livemint" className="mt-6">
          <NewsGrid news={livemintNews} isLoading={loadingLivemint} />
        </TabsContent>

        <TabsContent value="businessStandard" className="mt-6">
          <NewsGrid news={bsNews} isLoading={loadingBS} />
        </TabsContent>

        <TabsContent value="investing" className="mt-6">
          <NewsGrid news={investingNews} isLoading={loadingInvesting} />
        </TabsContent>

        <TabsContent value="paisa" className="mt-6">
          <NewsGrid news={paisaNews} isLoading={loadingPaisa} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
