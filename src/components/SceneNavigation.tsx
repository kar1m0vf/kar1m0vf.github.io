import { useEffect, useRef } from 'react';
import { controlOverlayEvent } from '../utils/controlOverlay';
import { destinationTop, focusScene, jumpToScene, sceneFrameEvent, sceneNavigationEvent, type SceneDestination } from '../utils/sceneNavigation';
import './SceneNavigation.css';

/** Only the veil animates during a chapter jump; scrolling itself is instantaneous. */
export function SceneNavigation() {
  const veilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const veil = veilRef.current;
    const site = document.querySelector<HTMLElement>('.site');
    if (!veil || !site) return;
    const root = document.documentElement;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    let active = false;
    let disposed = false;
    let pending: SceneDestination | null = null;
    let previousInert = false;
    let watchdog = 0;
    let visitId = 0;
    let frameListener: ((event: Event) => void) | null = null;
    const animations = new Set<Animation>();
    const timers = new Set<number>();

    const later = (callback: () => void, delay: number) => {
      const id = window.setTimeout(() => { timers.delete(id); callback(); }, delay);
      timers.add(id);
      return id;
    };
    const phase = (value?: string) => {
      if (value) root.dataset.sceneTransition = value;
      else delete root.dataset.sceneTransition;
      window.dispatchEvent(new Event(controlOverlayEvent));
    };
    const animateVeil = (from: number, to: number, duration: number) => new Promise<void>((resolve) => {
      const animation = veil.animate([{ opacity: from }, { opacity: to }], {
        duration, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards',
      });
      animations.add(animation);
      void animation.finished.catch(() => undefined).then(() => resolve());
      later(resolve, duration + 150);
    });
    const prepareDestination = (destination: SceneDestination) => new Promise<void>((resolve) => {
      const scene = destination.element.closest('.continuous-story')
        ?? destination.element.querySelector('.thread-sculpture');
      const complete = () => {
        window.removeEventListener(sceneFrameEvent, onFrame);
        if (frameListener === onFrame) frameListener = null;
        resolve();
      };
      const onFrame = (event: Event) => {
        if (scene?.contains((event as CustomEvent<HTMLElement>).detail)) complete();
      };
      window.addEventListener(sceneFrameEvent, onFrame);
      frameListener = onFrame;
      // A missing WebGL context uses the existing SVG. A slow lazy import never
      // turns navigation into a second loading screen.
      later(complete, scene && scene.getAttribute('data-renderer') !== 'fallback' ? 450 : 60);
      phase('settling');
    });
    const release = () => {
      window.clearTimeout(watchdog);
      site.inert = previousInert;
      site.setAttribute('aria-busy', 'false');
      veil.hidden = true;
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      phase();
      active = false;
    };
    const visit = async (initial: SceneDestination) => {
      if (disposed || root.dataset.siteLoading === 'true') return;
      if (active) { pending = initial; return; }
      active = true;
      const token = ++visitId;
      let destination = initial;
      let committed = false;
      const commit = () => {
        if (committed) return;
        if (pending) { destination = pending; pending = null; }
        if (destination.history !== 'none' && destination.hash && location.hash !== destination.hash) {
          history.replaceState({ ...history.state, portfolioScroll: window.scrollY }, '');
          history.pushState(null, '', destination.hash);
        }
        jumpToScene(destination);
        committed = true;
      };
      previousInert = site.inert;
      const immediate = initial.immediate || typeof veil.animate !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches
        || Math.abs(destinationTop(initial) - window.scrollY) < 2;
      try {
        site.inert = true;
        site.setAttribute('aria-busy', 'true');
        phase('covering');
        // Keep the page recoverable if a browser suspends an animation or frame.
        watchdog = later(() => { if (!disposed && active) { commit(); release(); focusScene(destination); } }, 1800);
        if (!immediate) {
          veil.hidden = false;
          await animateVeil(0, 1, 210);
        }
        if (disposed || !active || token !== visitId) return;
        phase('jumping');
        commit();
        await prepareDestination(destination);
        if (disposed || !active || token !== visitId) return;
        // A nearby lazy component can change the chapter's offset while the veil
        // is closed. Align once more before exposing the destination.
        const limit = Math.max(0, document.documentElement.scrollHeight - innerHeight);
        if (Math.abs(window.scrollY - Math.max(0, Math.min(limit, destinationTop(destination)))) > 1) {
          phase('jumping');
          jumpToScene(destination);
          await prepareDestination(destination);
        }
        if (disposed || !active || token !== visitId) return;
        phase('revealing');
        if (!immediate) await animateVeil(1, 0, 420);
      } finally {
        if (!disposed && active && token === visitId) {
          release();
          focusScene(destination);
          const next = pending;
          pending = null;
          if (next) void visit(next);
        }
      }
    };
    const onRequest = (event: Event) => {
      event.preventDefault();
      void visit((event as CustomEvent<SceneDestination>).detail);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
      let id: string;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
      const element = document.getElementById(id);
      if (!element) return;
      event.preventDefault();
      void visit({ element, hash: url.hash, immediate: link.classList.contains('skip-link') });
    };
    const onPopState = (event: PopStateEvent) => {
      let id = 'top';
      try { id = decodeURIComponent(location.hash.slice(1)) || 'top'; } catch { /* Fall back to Start. */ }
      const element = document.getElementById(id);
      if (element) void visit({ element, history: 'none',
        ...(typeof event.state?.portfolioScroll === 'number' ? { top: event.state.portfolioScroll } : {}) });
    };
    document.addEventListener('click', onClick);
    window.addEventListener(sceneNavigationEvent, onRequest);
    window.addEventListener('popstate', onPopState);
    return () => {
      disposed = true;
      document.removeEventListener('click', onClick);
      window.removeEventListener(sceneNavigationEvent, onRequest);
      window.removeEventListener('popstate', onPopState);
      timers.forEach((id) => window.clearTimeout(id));
      if (frameListener) window.removeEventListener(sceneFrameEvent, frameListener);
      if (active) release();
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  return <div aria-hidden="true" className="scene-transition" hidden ref={veilRef}>
    <div className="scene-transition__haze" />
    <div className="scene-transition__thread">
      <svg fill="none" viewBox="0 0 300 90"><path d="M207 18C118 9 12 24 12 45S137 82 250 63S234 17 207 18" /></svg>
    </div>
  </div>;
}
