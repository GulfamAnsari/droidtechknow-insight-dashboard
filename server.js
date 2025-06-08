import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch'; // If using Node 18+, native fetch works

// Polyfill for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 1. API route to proxy JioSaavn playlist details
app.get('/status', async (req, res) => {
  res.send({ status: 'success' });
});
app.get('/api/playlist', async (req, res) => {
  const { listid } = req.query;

  if (!listid) {
    return res.status(400).json({ status: 'error', message: 'Missing listid parameter' });
  }

  const url = `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&cc=in&_marker=0&api_version=4&listid=${encodeURIComponent(listid)}`;

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
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });

// 4. Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
