import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

export function MiddleThread({ children, prepare = false, onReady }: { children: ReactNode; prepare?: boolean; onReady?: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('loading');
  const reduced = Boolean(useReducedMotion());
  const gradient = useId();
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  useEffect(() => {
    const element = root.current;
    const canvasHost = host.current;
    if (!element || !canvasHost) return;
    let cancelled = false;
    let dispose: (() => void) | null = null;
    setStatus('loading');
    let started = false;
    const settled = (state: 'ready' | 'fallback') => {
      if (cancelled) return;
      setStatus(state);
      onReadyRef.current?.();
    };
    const start = () => {
      if (started) return;
      started = true;
      observer?.disconnect();
      void import('./createMiddleScene').then(({ createMiddleScene }) => {
        if (cancelled) return;
        dispose = createMiddleScene(canvasHost, element, {
          reduced,
          onReady: () => settled('ready'),
          onUnavailable: () => settled('fallback'),
        });
        if (!dispose) settled('fallback');
      }).catch(() => settled('fallback'));
    };
    const observer = prepare ? null : new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && document.documentElement.dataset.siteLoading !== 'true') start();
    }, { rootMargin: '600px' });
    if (prepare) start(); else observer?.observe(element);
    return () => { cancelled = true; observer?.disconnect(); dispose?.(); };
  }, [reduced, prepare]);

  return (
    <div className="continuous-story" data-renderer={status} ref={root}>
      <div aria-hidden="true" className="continuity-layer">
        <div className="continuity-stage">
          <svg className="continuity-fallback" fill="none" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice">
            <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="color-mix(in srgb, var(--experience-accent) 30%, white)" /><stop offset=".38" stopColor="var(--experience-accent)" /><stop offset=".65" stopColor="color-mix(in srgb, var(--experience-accent) 45%, white)" /><stop offset="1" stopColor="color-mix(in srgb, var(--experience-accent) 75%, #050709)" /></linearGradient></defs>
            <path d="M1050-150C590 140 740 360 1160 215C1550 70 1390 680 1070 615C780 550 810 340 1150 430C1540 535 1000 960 1500 1120" stroke={`url(#${gradient})`} strokeWidth="24.3" />
          </svg>
          <div className="continuity-canvas" ref={host} />
        </div>
      </div>
      {children}
    </div>
  );
}
