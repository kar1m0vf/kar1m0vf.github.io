import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

export function MiddleThread({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('loading');
  const reduced = Boolean(useReducedMotion());
  const gradient = useId();

  useEffect(() => {
    const element = root.current;
    const canvasHost = host.current;
    if (!element || !canvasHost) return;
    let cancelled = false;
    let dispose: (() => void) | null = null;
    setStatus('loading');
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      void import('./createMiddleScene').then(({ createMiddleScene }) => {
        if (cancelled) return;
        dispose = createMiddleScene(canvasHost, element, {
          reduced,
          onReady: () => { if (!cancelled) setStatus('ready'); },
          onUnavailable: () => { if (!cancelled) setStatus('fallback'); },
        });
        if (!dispose) setStatus('fallback');
      }).catch(() => { if (!cancelled) setStatus('fallback'); });
    }, { rootMargin: '600px' });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); dispose?.(); };
  }, [reduced]);

  return (
    <div className="continuous-story" data-renderer={status} ref={root}>
      <div aria-hidden="true" className="continuity-layer">
        <div className="continuity-stage">
          <svg className="continuity-fallback" fill="none" viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice">
            <defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c1e7ff" /><stop offset=".38" stopColor="#2772df" /><stop offset=".65" stopColor="#92d2ff" /><stop offset="1" stopColor="#1255ad" /></linearGradient></defs>
            <path d="M1050-150C590 140 740 360 1160 215C1550 70 1390 680 1070 615C780 550 810 340 1150 430C1540 535 1000 960 1500 1120" stroke={`url(#${gradient})`} strokeWidth="24.3" />
          </svg>
          <div className="continuity-canvas" ref={host} />
        </div>
      </div>
      {children}
    </div>
  );
}
