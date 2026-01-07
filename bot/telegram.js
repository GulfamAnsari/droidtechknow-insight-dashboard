import axios from "axios";

export async function sendTelegramNews({
  title,
  description,
  url,
  imageUrl,
  publishedAt
}) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error("Telegram config missing");
  }

  // Create caption with title, description and Read More link
  const time = new Date(publishedAt).toLocaleString("en-IN", { hour12: true });
  const caption = `*${escape(title)}*\n\n${escape(
    description || ""
  )} \n\nPublished at: ${time}\n\n[Read more](${url})`;

  try {
    await axios.post(`${TELEGRAM_API}/sendPhoto`, {
      chat_id: CHAT_ID,
      photo: !imageUrl?.includes("placeholder.com") ? imageUrl : "https://droidtechknow.com/admin/api/files/uploads/23/thumbnail/demo.png", // Image URL
      caption: caption, // Title + description + link
      parse_mode: "MarkdownV2",
      disable_web_page_preview: false
    });
  } catch (err) {
    console.error(
      "Telegram sendPhoto error:",
      err.response?.data || err.message
    );
  }
}

export async function sendError({
  title,
  description,
  publishedAt
}) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error("Telegram config missing");
  }

  // Create caption with title, description and Read More link
  const time = new Date(publishedAt).toLocaleString("en-IN", { hour12: true });
  const caption = `*${escape(title)}*\n\n${escape(
    description || ""
  )} \n\nPublished at: ${time}`;

  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: caption,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: false
    });
  } catch (err) {
    console.error(
      "Telegram sendMessage error:",
      err.response?.data || err.message
    );
  }
}

// Escape MarkdownV2 characters
function escape(text = "") {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
