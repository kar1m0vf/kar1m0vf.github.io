import '@fontsource-variable/manrope/wght.css';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './components/SiteLoader.css';
import './components/KControl.css';
import './components/MethodJunction.css';
import './components/NarWorld.css';
import './components/NarTrackerHandoff.css';
import './components/PriceObservatory.css';
import './components/BlasterWorld.css';
import './components/SignalIdentity.css';
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
