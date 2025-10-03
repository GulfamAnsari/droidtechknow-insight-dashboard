export interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

const RSS_FEEDS = {
  livemint: 'https://www.livemint.com/rss/markets',
  businessStandard: 'https://www.business-standard.com/rss/markets-106.rss',
  investing: 'https://in.investing.com/rss/news_1.rss',
  paisa: 'https://www.5paisa.com/rss/news.xml'
};

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export const fetchRSSFeed = async (feedUrl: string, sourceName: string): Promise<NewsItem[]> => {
  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(feedUrl)}`);
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    const items = xml.querySelectorAll('item');
    const news: NewsItem[] = [];
    
    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const description = item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '') || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      
      if (title && link) {
        news.push({
          title,
          link,
          description,
          pubDate,
          source: sourceName
        });
      }
    });
    
    return news;
  } catch (error) {
    console.error(`Error fetching RSS feed from ${sourceName}:`, error);
    return [];
  }
};

export const fetchAllFeeds = async (): Promise<NewsItem[]> => {
  const feedPromises = [
    fetchRSSFeed(RSS_FEEDS.livemint, 'LiveMint'),
    fetchRSSFeed(RSS_FEEDS.businessStandard, 'Business Standard'),
    fetchRSSFeed(RSS_FEEDS.investing, 'Investing.com'),
    fetchRSSFeed(RSS_FEEDS.paisa, '5Paisa')
  ];
  
  const results = await Promise.all(feedPromises);
  const allNews = results.flat();
  
  // Sort by date (most recent first)
  return allNews.sort((a, b) => {
    const dateA = new Date(a.pubDate).getTime();
    const dateB = new Date(b.pubDate).getTime();
    return dateB - dateA;
  });
};

export const fetchFeedBySource = async (source: string): Promise<NewsItem[]> => {
  const feedMap: Record<string, { url: string; name: string }> = {
    livemint: { url: RSS_FEEDS.livemint, name: 'LiveMint' },
    businessStandard: { url: RSS_FEEDS.businessStandard, name: 'Business Standard' },
    investing: { url: RSS_FEEDS.investing, name: 'Investing.com' },
    paisa: { url: RSS_FEEDS.paisa, name: '5Paisa' }
  };
  
  const feed = feedMap[source];
  if (!feed) return [];
  
  return fetchRSSFeed(feed.url, feed.name);
};
