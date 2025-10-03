export interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  image?: string;
}

const RSS_FEEDS = {
  livemint: 'https://www.livemint.com/rss/markets',
  businessStandard: 'https://www.business-standard.com/rss/markets-106.rss',
  investing: 'https://in.investing.com/rss/news_1.rss',
  paisa: 'https://www.5paisa.com/rss/news.xml'
};

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const extractImageFromContent = (content: string): string | undefined => {
  // Try to extract image from HTML content
  const imgRegex = /<img[^>]+src="([^">]+)"/i;
  const match = content.match(imgRegex);
  return match ? match[1] : undefined;
};

export const fetchRSSFeed = async (feedUrl: string, sourceName: string): Promise<NewsItem[]> => {
  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(feedUrl)}`);
    let text = await response.text();

    // Strip anything before <?xml
    const xmlStart = text.indexOf("<?xml");
    if (xmlStart > 0) text = text.slice(xmlStart);

    // Add the missing media namespace if not present
    if (!text.includes('xmlns:media')) {
      text = text.replace(
        '<rss',
        '<rss xmlns:media="http://search.yahoo.com/mrss/"'
      );
    }

    // Handle proxy-wrapped JSON
    try {
      const jsonData = JSON.parse(text);
      if (jsonData.contents) {
        text = jsonData.contents;
      }
    } catch {
      // Not JSON, use raw text
    }

    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");

    // Handle parser errors
    if (xml.querySelector("parsererror")) {
      console.error(`❌ XML parsing error for ${sourceName}`, xml.querySelector("parsererror")?.textContent);
      return [];
    }

    const items = xml.querySelectorAll("item");
    const news: NewsItem[] = [];

    items.forEach((item) => {
      const title = item.querySelector("title")?.textContent?.trim() || "";
      const link = item.querySelector("link")?.textContent?.trim() || "";
      const descriptionHtml = item.querySelector("description")?.textContent || "";
      const description = descriptionHtml.replace(/<[^>]*>/g, "");
      const pubDate = item.querySelector("pubDate")?.textContent || "";

      let image: string | undefined;

      // --- Try 5Paisa <media:content>
      const mediaContent = item.querySelector("media\\:content");
      if (mediaContent) {
        image = mediaContent.getAttribute("url") || undefined;
      }

      const mediaThumbnail = item.querySelector('thumbnail, media\\:thumbnail');
      if (mediaThumbnail) {
        image = mediaThumbnail.getAttribute('url') || undefined;
      }
      
      if (!image) {
        const mediaContent = item.querySelector('content, media\\:content');
        if (mediaContent) {
          image = mediaContent.getAttribute('url') || undefined;
        }
      }


      // --- Try enclosure
      if (!image) {
        const enclosure = item.querySelector("enclosure");
        if (enclosure?.getAttribute("type")?.startsWith("image")) {
          image = enclosure.getAttribute("url") || undefined;
        }
      }

      // --- Fallback: extract from <description>
      if (!image && descriptionHtml) {
        const match = descriptionHtml.match(/<img[^>]+src="([^">]+)"/i);
        if (match) {
          image = match[1];
        }
      }

      if (title && link) {
        news.push({
          title,
          link,
          description,
          pubDate,
          source: sourceName,
          image,
        });
      }
    });

    return news;
  } catch (error) {
    console.error(`⚠️ Error fetching RSS feed from ${sourceName}:`, error);
    return [];
  }
};


export const fetchAllFeeds = async (): Promise<NewsItem[]> => {
  const feedPromises = [
    fetchRSSFeed(RSS_FEEDS.livemint, 'LiveMint'),
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
