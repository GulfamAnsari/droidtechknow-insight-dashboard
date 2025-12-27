import moment from "moment-timezone";
import Parser from "rss-parser";

const sources = [
    {
        name: "CNBCNBC TV 18",
        rss: "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/market.xml"
    },
    {
        name: "The hindustan bussiness line",
        rss: "https://www.thehindubusinessline.com/markets/stock-markets/feeder/default.rss"
    },
    // {
    //     name: "livemint",
    //     rss: "https://www.livemint.com/rss/markets"
    // }
];

const parser = new Parser();

export async function fetchTodayNews() {
  const results = [];

  // Today (India timezone)
  const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

  for (const src of sources) {
    try {
      const feed = await parser.parseURL(src.rss);

      if (feed?.items) {
        feed.items.forEach(item => {
          const published = item.isoDate || item.pubDate;
          if (!published) return;

          const dateInIndia = moment(published).tz("Asia/Kolkata").format("YYYY-MM-DD");

          if (dateInIndia === today) {
            results.push({
              source: src.name,
              title: item.title,
              link: item.link,
              publishedAt: published,
              summary: item.contentSnippet || ""
            });
          }
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${src.name}`, err.message);
    }
  }

  // Sort newest first
  return results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

