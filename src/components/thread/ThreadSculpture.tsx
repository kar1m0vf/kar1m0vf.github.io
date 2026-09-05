import { useEffect, useRef, useState } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';

interface ThreadSculptureProps {
  enabled: boolean;
  progress: MotionValue<number>;
  reduced: boolean;
}

/** The HTML story never waits for, or depends on, its WebGL layer. */
export function ThreadSculpture({ enabled, progress, reduced }: ThreadSculptureProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const rotate = useTransform(progress, [0, 0.5, 1], [-22, 100, 190]);
  const scale = useTransform(progress, [0, 0.5, 1], [1, 1.4, 2.4]);

  useEffect(() => {
    if (!enabled || !hostRef.current) return;
    const host = hostRef.current;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import('./createThreadScene').then(({ createThreadScene }) => {
      if (cancelled) return;
      const scene = createThreadScene(host, {
        getProgress: () => reduced ? 0 : progress.get(), reduced,
        onUnavailable: () => { if (!cancelled) setStatus('fallback'); },
      });
      if (scene) { dispose = scene; setStatus('ready'); }
      else setStatus('fallback');
    }).catch(() => { if (!cancelled) setStatus('fallback'); });
    return () => { cancelled = true; dispose?.(); };
  }, [enabled, progress, reduced]);

  return (
    <div aria-hidden="true" className="thread-sculpture" data-renderer={status}>
      <motion.svg className="thread-sculpture__fallback" fill="none" style={reduced ? {} : { rotate, scale }} viewBox="0 0 700 700">
        <defs>
          <linearGradient id="thread-fallback-light" x1="90" y1="80" x2="560" y2="650" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c6e8ff" /><stop offset=".27" stopColor="#439cff" /><stop offset=".55" stopColor="#0c45a2" /><stop offset=".8" stopColor="#63b9ff" /><stop offset="1" stopColor="#c5efff" />
          </linearGradient>
          <filter id="thread-fallback-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>
        <path d="M350 98C560 20 646 280 480 411C304 551 128 535 134 358C141 161 331 152 451 309C584 483 447 676 292 550C107 400 148 173 350 98Z" stroke="#167cff" strokeWidth="22" opacity=".48" filter="url(#thread-fallback-glow)" />
        <path d="M350 98C560 20 646 280 480 411C304 551 128 535 134 358C141 161 331 152 451 309C584 483 447 676 292 550C107 400 148 173 350 98Z" stroke="url(#thread-fallback-light)" strokeWidth="8" />
        <path d="M350 98C560 20 646 280 480 411C304 551 128 535 134 358C141 161 331 152 451 309C584 483 447 676 292 550C107 400 148 173 350 98Z" stroke="#b8e9ff" strokeWidth="1" opacity=".7" />
      </motion.svg>
      <div className="thread-sculpture__canvas" ref={hostRef} />
    </div>
  );
}
