// === 1. Backend (Node.js + Express + ES Modules Compatible) ===
// File: server.mjs

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

// Polyfill for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "your_secret",
    resave: false,
    saveUninitialized: true,
  })
);

// === Serve frontend build ===
const buildPath = path.join(__dirname, "dist");
app.use(express.static(buildPath));

// Handle all other non-API routes by serving index.html
app.get(/^\/(?!auth|oauth2callback|transactions|me).*/, (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// === Google OAuth Setup ===
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "http://localhost:4000/oauth2callback"
);

app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    req.session.tokens = tokens;

    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const profile = await gmail.users.getProfile({ userId: "me" });
    req.session.email = profile.data.emailAddress;

    // Instead of redirecting, return email so FE can route
    res.json({ email: profile.data.emailAddress });
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    res.status(500).send("OAuth failed");
  }
});

app.get("/me", (req, res) => {
  if (!req.session.tokens) return res.status(401).send("Not logged in");
  res.send({ email: req.session.email });
});

app.get("/transactions", async (req, res) => {
  try {
    if (!req.session.tokens) return res.status(401).send("Not authorized");

    oauth2Client.setCredentials(req.session.tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const result = await gmail.users.messages.list({
      userId: "me",
      q: "subject:(debited OR credited) category:primary newer_than:30d",
      maxResults: 20,
    });

    const transactions = [];

    for (let msg of result.data.messages || []) {
      const msgData = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const body = Buffer.from(
        msgData.data.payload.parts?.[0]?.body?.data || "",
        "base64"
      ).toString("utf8");

      const regex =
        /Rs\.?\s?([\d,]+\.\d{2}).*?(debited|credited).*?on\s(\d+\s\w+\s\d{4}).*?Info:\s(.+)/i;
      const match = body.match(regex);

      if (match) {
        transactions.push({
          amount: parseFloat(match[1].replace(/,/g, "")),
          type: match[2].toLowerCase(),
          date: match[3],
          merchant: match[4].trim(),
        });
      }
    }

    res.json(transactions);
  } catch (error) {
    console.error("Transaction Fetch Error:", error);
    res.status(500).send("Failed to fetch transactions");
  }
});

// Error handler for any unmatched routes
app.use((req, res, next) => {
  res.status(404).send("404 - Not Found");
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});