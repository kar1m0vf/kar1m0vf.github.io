import '@fontsource-variable/manrope/wght.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { cleanupLegacyRuntime } from './utils/legacyRuntime';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

const runCleanup = () => {
  void cleanupLegacyRuntime().catch(() => {
    // Legacy cache cleanup should never block the portfolio.
  });
};

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(runCleanup, { timeout: 2500 });
} else {
  globalThis.setTimeout(runCleanup, 1200);
}
