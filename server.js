
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch"; // Required for Node < 18

// Polyfill __dirname
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
    saveUninitialized: false,
    cookie: {
      secure: false, // true only if HTTPS
      sameSite: "lax" // important for Chrome
    }
  })
);

// === Serve frontend build ===
const buildPath = path.join(__dirname, "dist");
app.use(express.static(buildPath));


// Serve frontend for SPA
app.get(
  /^\/(?!auth|oauth2callback|transactions|me|check-auth|logout).*/,
  (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  }
);

// Fallback 404
app.use((req, res) => {
  res.status(404).send("404 - Not Found");
});

// Error handling
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
