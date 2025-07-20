
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

// === Google OAuth Routes ===
app.get("/auth", (req, res) => {
  res.redirect("https://droidtechknow.com/admin/api/auth/google-auth.php?route=auth");
});

app.get("/oauth2callback", async (req, res) => {
  try {
    const { code } = req.query;
    
    // Forward the OAuth callback to the API
    const response = await fetch(`https://droidtechknow.com/admin/api/auth/google-auth.php?route=auth&code=${code}`, {
      method: 'GET'
    });

    const data = await response.json();
    
    if (data.success) {
      req.session.tokens = data.tokens;
      req.session.email = data.email;
      req.session.authToken = data.auth_token;
      req.session.userData = data.user_data;

      req.session.save((err) => {
        if (err) {
          console.error("Session save failed:", err);
          return res.redirect("http://localhost:4000/login?error=session_failed");
        }
        res.redirect("http://localhost:4000/?login=success");
      });
    } else {
      res.redirect("http://localhost:4000/login?error=oauth_failed");
    }
  } catch (error) {
    console.error("OAuth Callback Error:", error);
    res.redirect("http://localhost:4000/login?error=oauth_failed");
  }
});

// Check login session
app.get("/check-auth", async (req, res) => {
  try {
    const response = await fetch("https://droidtechknow.com/admin/api/auth/google-auth.php?route=check-auth", {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || ''
      }
    });

    const data = await response.json();
    
    if (data.authenticated) {
      req.session.tokens = data.tokens;
      req.session.email = data.email;
      req.session.authToken = data.auth_token;
      req.session.userData = data.user_data;
      
      res.json({
        authenticated: true,
        user: data.user_data,
        authToken: data.auth_token
      });
    } else {
      res.status(401).json({ authenticated: false });
    }
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({ authenticated: false, error: "Auth check failed" });
  }
});

app.get("/me", async (req, res) => {
  try {
    const response = await fetch("https://droidtechknow.com/admin/api/auth/google-auth.php?route=me", {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || ''
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Me endpoint error:", error);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

app.post("/logout", async (req, res) => {
  try {
    const response = await fetch("https://droidtechknow.com/admin/api/auth/google-auth.php?route=logout", {
      method: 'POST',
      headers: {
        'Cookie': req.headers.cookie || ''
      }
    });

    const data = await response.json();
    
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Failed to logout" });
      res.json({ success: true });
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
});

app.get("/transactions", async (req, res) => {
  try {
    const response = await fetch("https://droidtechknow.com/admin/api/auth/google-auth.php?route=transactions", {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || ''
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

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
