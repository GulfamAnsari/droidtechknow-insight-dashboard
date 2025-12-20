import express from "express";
import dotenv from "dotenv";
import { watchNews } from "./newsFetcher.js";
import { sendTelegramNews } from "./telegram.js";

dotenv.config();
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Telegram Stock News Bot Running ✅");
});

// Optional: manual notification endpoint
app.post("/notify", async (req, res) => {
  const { title, summary, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: "Invalid payload" });

  await sendTelegramNews({ title, description: summary, url });
  res.json({ status: "sent" });
});

// Start watching Groww news every 10 sec
watchNews((news) => {
  sendTelegramNews({
    title: news.data?.title,
    description: news?.data?.body,
    url: news.data?.cta[0]?.ctaUrl,
    imageUrl: news.data?.cta[0]?.logoUrl,
    publishedAt: news?.publishedAt
  });
}, process.env.TIMER);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
