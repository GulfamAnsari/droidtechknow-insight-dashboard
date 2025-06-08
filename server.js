// server.mjs (or add "type": "module" to package.json if using .js)
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Polyfill __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from /dist
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/test', (req, res)=>{
    res.send({ status: ' success '})
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
