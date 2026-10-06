import { useEffect } from 'react';
import { jumpToScene } from '../utils/sceneNavigation';

const sectionIds = ['top', 'method', 'work', 'nar', 'connections', 'trendyol', 'blaster', 'journey', 'contact'] as const;
interface OrientationAnchor { element: HTMLElement; progress: number }

/** Preserve the current chapter when rotation replaces the viewport's layout. */
export function useOrientationAnchor(disabled = false) {
  useEffect(() => {
    if (disabled) return;
    const elements = sectionIds.map(id => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    let landscape = window.innerWidth > window.innerHeight;
    let anchor: OrientationAnchor | null = null;
    let retainedAnchor: OrientationAnchor | null = null;
    let cacheFrame = 0;
    let restoreFrame = 0;

    const cacheAnchor = () => {
      cacheFrame = 0;
      // Rotation can dispatch scroll before resize. Keep the previous layout's
      // anchor until the new layout has settled and its position is restored.
      if (retainedAnchor || (window.innerWidth > window.innerHeight) !== landscape) return;
      let selected: { element: HTMLElement; top: number } | null = null;
      let upcoming: { element: HTMLElement; top: number } | null = null;
      for (const element of elements) {
        if (!element.isConnected) continue;
        const top = element.getBoundingClientRect().top;
        if (top <= 1 && (!selected || top >= selected.top)) selected = { element, top };
        else if (top > 1 && (!upcoming || top < upcoming.top)) upcoming = { element, top };
      }
      const current = selected ?? upcoming;
      if (!current) return;
      const travel = Math.max(1, current.element.offsetHeight - window.innerHeight);
      anchor = { element: current.element, progress: Math.max(0, Math.min(1, -current.top / travel)) };
    };

    const queueCache = () => {
      if (!cacheFrame && !retainedAnchor) cacheFrame = requestAnimationFrame(cacheAnchor);
    };

    const queueRestore = () => {
      cancelAnimationFrame(restoreFrame);
      restoreFrame = requestAnimationFrame(() => {
        restoreFrame = requestAnimationFrame(() => {
          restoreFrame = 0;
          const destination = retainedAnchor;
          if (destination?.element.isConnected) {
            jumpToScene({ element: destination.element, progress: destination.progress, history: 'none' });
          }
          retainedAnchor = null;
          queueCache();
        });
      });
    };

    const resize = () => {
      const nextLandscape = window.innerWidth > window.innerHeight;
      if (nextLandscape !== landscape && !retainedAnchor) retainedAnchor = anchor;
      landscape = nextLandscape;
      if (retainedAnchor) {
        cancelAnimationFrame(cacheFrame);
        cacheFrame = 0;
        queueRestore();
      } else queueCache();
    };

    cacheAnchor();
    window.addEventListener('scroll', queueCache, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    return () => {
      window.removeEventListener('scroll', queueCache);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(cacheFrame);
      cancelAnimationFrame(restoreFrame);
    };
  }, [disabled]);
}
