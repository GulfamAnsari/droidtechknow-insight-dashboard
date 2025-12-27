import axios from "axios";
import dotenv from "dotenv";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { sendError, sendTelegramNews } from "./telegram.js";
import { sleep } from "./utils.js";

dotenv.config();

const NEWS_API_URL = process.env.NEWS_API_URL;
const STORE_PATH = path.resolve("./news-store.json");

/* -------------------- Helpers -------------------- */

const getTodayKey = () => new Date().toISOString().split("T")[0]; // YYYY-MM-DD

const normalize = (str = "") => str.toLowerCase().replace(/\s+/g, " ").trim();

/* ---- SAFE READ ---- */
function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    errorSend("⚠️ Store read failed, preserving data:", err.message);
    console.error("⚠️ Store read failed, preserving data:", err.message);
    // Backup corrupted file
    const backupDir = path.resolve("./backup");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    fs.renameSync(
      STORE_PATH,
      path.join(backupDir, `news-store.json.corrupt-${Date.now()}`)
    );

    fs.writeFileSync(STORE_PATH, JSON.stringify({}));
    return {};
  }
}

/* ---- ATOMIC WRITE ---- */
function writeStore(data) {
  if (!isValidJSON(data)) {
    console.error("❌ Invalid JSON detected. Write aborted.");
    return;
  }

  const tempFile = `${STORE_PATH}.tmp`;

  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, STORE_PATH);
  } catch (err) {
    console.error("❌ Failed to write store:", err.message);
  }
}

/* -------------------- Fetch News -------------------- */

export async function fetchNews(savingToDb = false) {
  try {
    console.log(
      chalk.green.bold(
        `⏳ Fetching latest news at ${new Date().toLocaleString("en-IN", {
          hour12: true
        })} saving to ${savingToDb}`
      )
    );

    const res = await axios.get(NEWS_API_URL);
    if (!Array.isArray(res.data?.feed)) return [];

    const store = readStore();
    const today = getTodayKey();
    let remoteStore = [];
    if (savingToDb) {
      const dateRev = today.split("-").reverse().join("-")
      const data = (await axios.get(`https://droidtechknow.com/admin/api/stocks/news/save.php?from=${dateRev}&to=${dateRev}`)).data;
      remoteStore = (data.data?.[dateRev]).map((d) => {
        return {
            "postId": d?.postId,
            "title": d?.data?.title,
            "symbol": d?.data?.cta?.[0]?.meta?.nseScriptCode || d?.data?.cta?.[0]?.meta?.bseScriptCode,
            "body": d?.data?.body,
            "publishedAt": d?.publishedAt
          }
      });
    } else {
      store[today] ||= [];
    }

    const latestNews = [];
    for (const item of res.data.feed) {
      const title = item?.data?.title;
      if (!title) continue;

      const normalizedTitle = normalize(title);
      const s = savingToDb ? remoteStore: store[today];
      const isDuplicate = s.some(
        (saved) =>
          normalize(saved.title) === normalizedTitle ||
          saved.postId === item.postId
      );
      if (isDuplicate) {
        continue;
      }
      if (new Date(item?.publishedAt).toISOString().split("T")[0] !== today) {
        continue;
      }

      const symbol =
        item?.data?.cta?.[0]?.meta?.nseScriptCode ||
        item?.data?.cta?.[0]?.meta?.bseScriptCode ||
        "N/A";

      const newsObj = {
        postId: item.postId,
        title: normalizedTitle,
        symbol,
        body: item?.data?.body || "",
        publishedAt: item?.publishedAt // ✅ FIXED
      };
      if (!savingToDb) store[today].push(newsObj);
      latestNews.push(item);
    }

    if (!savingToDb) writeStore(store);
    return latestNews;
  } catch (err) {
    console.error("❌ Error fetching news:", err.message);
    errorSend("❌ Error fetching news:", err.message);
    return [];
  }
}

/* -------------------- Watcher -------------------- */

export async function watchNews(callback, savingToDb) {
    const latest = await fetchNews(savingToDb);

    async function runSequentially(latest) {
      for (const item of latest) {
        const time = new Date(item?.publishedAt).toLocaleString("en-IN", {
          hour12: true
        });

        console.log(
          "\n" +
            chalk.gray("---------------------------") +
            chalk.bgBlue.bold("\n📰 NEW NEWS ALERT 📰"),
          "\n" +
            chalk.green(
              `Symbol: ${
                item?.data?.cta?.[0]?.meta?.nseScriptCode ||
                item?.data?.cta?.[0]?.meta?.bseScriptCode ||
                "N/A"
              }`
            ),
          "\n" + chalk.yellow(`Title: ${item?.data?.title || "No title"}`),
          "\n" +
            chalk.yellowBright(
              `Fetched at: ${new Date().toLocaleString("en-IN", {
                hour12: true
              })}`
            ),
          "\n" + chalk.yellow(`Published at: ${time || "No time"}`),
          "\n" + chalk.gray("---------------------------")
        );

        await sleep(1000); // ⏱️ THIS NOW WORKS SEQUENTIALLY
        callback(item); // fires one-by-one
      }
    }
    await runSequentially(latest);
}

/* -------------------- Time Guard -------------------- */

function isBetween1AMAnd8AM_IST() {
  const ist = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const hour = ist.getHours();
  return hour >= 1 && hour < 8;
}


const errorSend = (error, errorMessage) => {
  sendError({
    title: "Error ->>>",
    description: errorMessage,
    publishedAt: new Date()
  });
};

function isValidJSON(data) {
  try {
    JSON.stringify(data);
    return true;
  } catch {
    return false;
  }
}
