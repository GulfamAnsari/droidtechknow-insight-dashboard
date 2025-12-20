import crypto from "crypto";
import { sendTelegramNews } from "./telegram.js";

const sent = new Set();

export async function processNews(news) {
  const id = crypto
    .createHash("sha1")
    .update(news.title)
    .digest("hex");

  if (sent.has(id)) return;
  sent.add(id);

  await sendTelegramNews({
    title: news.title,
    description: news.summary,
    url: news.url,
    imageUrl: news.data?.cta[0]?.logoUrl
  });
}
