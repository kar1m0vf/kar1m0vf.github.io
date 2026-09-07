import { controlOverlayEvent } from './controlOverlay';

interface EntryHandoff { x: number; y: number; width: number; started: number }
let entry: EntryHandoff | null = null;

export function beginEntryHandoff(bounds: DOMRect) {
  entry = { x: (bounds.left + bounds.width / 2) / innerWidth,
    y: (bounds.top + bounds.height / 2) / innerHeight, width: bounds.width / innerWidth,
    started: performance.now() + 100 };
  document.documentElement.dataset.entryHandoff = 'revealing';
  window.dispatchEvent(new Event(controlOverlayEvent));
}

export function readEntryHandoff(time: number) {
  if (!entry) return null;
  const t = Math.max(0, Math.min(1, (time - entry.started) / 800));
  return { ...entry, progress: t * t * (3 - 2 * t) };
}

export function finishEntryHandoff() {
  entry = null;
  delete document.documentElement.dataset.entryHandoff;
  window.dispatchEvent(new Event(controlOverlayEvent));
}
