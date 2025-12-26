import express from "express";
import dotenv from "dotenv";
import { watchNews } from "./newsFetcher.js";
import { sendTelegramNews } from "./telegram.js";
import { getSentimentLocal } from "./ml/sentiments.js";
import cors from 'cors';
import { fileURLToPath } from "url";
import path from "path";
import axios from "axios";
import { saveNews } from "./saveNews.js";
import chalk from "chalk";
import { getNextIntervalMs } from "./utils.js";


dotenv.config();
const app = express();
app.use(express.json());
// Enable CORS for all routes
app.use(cors());

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get("/news", (req, res) => {
  res.sendFile(path.join(__dirname, "/routes/news/index.html"));
});


app.get("/sentiments", async(req, res) => {
  const out = await getSentimentLocal(req.query.title);
  res.json(out);
});

app.get("/getnews", async(req, res) => {
  const e = await axios.get(process.env.NEWS_API_URL_FOR_UI);
  res.json(e.data);
});


app.post("/postnews", async(req, res) => {
  const e = await axios.post(process.env.NEWS_AGGREGATOR, req.body);
  res.json(e.data);
});


// Optional: manual notification endpoint
app.post("/notify", async (req, res) => {
  const { title, summary, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: "Invalid payload" });

  await sendTelegramNews({ title, description: summary, url });
  res.json({ status: "sent" });
});

// Start watching Groww news every timer
async function startWatch() {
  try {
    await watchNews(async (news) => {
      const sentiment = await getSentimentLocal(news.data?.title);

      const description = `${news?.data?.body}\n\nSentiment: ${sentiment?.label}\nConfidence level: ${sentiment?.confidence}`;

      sendTelegramNews({
        title: news.data?.title,
        description,
        url: news.data?.cta[0]?.ctaUrl,
        imageUrl: news.data?.cta[0]?.logoUrl,
        publishedAt: news?.publishedAt
      });

      saveNews(news);
    });
  } catch (err) {
    console.error("watchNews error:", err);
  } finally {
    const nextInterval = getNextIntervalMs();
    console.log(chalk.blackBright("Next run in", nextInterval / 60000, "minutes"));
    setTimeout(startWatch, nextInterval);
  }
}

// Start
startWatch();


// Calling for every hour to save into db
setInterval(() => {
  watchNews(async (news) => {
    news['machineLearningSentiments'] = await getSentimentLocal(news.data?.title);
    await saveNews(news);
  });
}, 1000 * 60 * 30);


app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
