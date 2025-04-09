
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register the service worker for PWA
if ('serviceWorker' in navigator) {
  // Use the vite-plugin-pwa registration
  const updateSW = registerSW({
    onNeedRefresh() {
      console.log('New content available, click on reload button to update.');
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
