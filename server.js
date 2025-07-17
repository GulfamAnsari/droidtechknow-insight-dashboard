
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import session from 'express-session';
import { google } from 'googleapis';

// Polyfill for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Session middleware
app.use(session({
  secret: 'your-session-secret', // Replace with a secure secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Google OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  "http://localhost:3000/oauth2callback"
);

// Google OAuth routes
app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code);
    
    // Get user info from Google
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const { email, name } = userInfo.data;
    
    // Store user info in session for the frontend to access
    req.session.googleAuth = {
      email,
      name,
      tokens
    };
    
    // Redirect to frontend with success parameter
    res.redirect("http://localhost:3000/login?google_auth=success");
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect("http://localhost:3000/login?google_auth=error");
  }
});

// API route to get Google auth data
app.get('/api/google-auth', (req, res) => {
  if (req.session.googleAuth) {
    const authData = req.session.googleAuth;
    // Clear the session data after sending it
    delete req.session.googleAuth;
    res.json(authData);
  } else {
    res.status(404).json({ error: 'No Google auth data found' });
  }
});

// 1. API route to proxy JioSaavn playlist details
app.get('/status', async (req, res) => {
  res.send({ status: 'success' });
});

app.get('/api/playlist', async (req, res) => {
  const { listid } = req.query;

  if (!listid) {
    return res.status(400).json({ status: 'error', message: 'Missing listid parameter' });
  }

  const url = `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&listid=${encodeURIComponent(listid)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    const text = await response.text();

    // Some JioSaavn responses include junk before JSON starts
    const jsonStart = text.indexOf('{');
    const cleanText = jsonStart !== -1 ? text.slice(jsonStart) : '{}';

    const data = JSON.parse(cleanText);
    res.json(data);
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch playlist', error: error.message });
  }
});

// 2. Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// 3. Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 4. Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
