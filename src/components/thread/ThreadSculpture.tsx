import { useEffect, useRef, useState } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';

interface ThreadSculptureProps {
  onReady?: (() => void) | undefined;
  progress: MotionValue<number>;
  reduced: boolean;
}

/** The story mounts beneath the loader so WebGL can prepare before the reveal. */
export function ThreadSculpture({ onReady, progress, reduced }: ThreadSculptureProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const rotate = useTransform(progress, [0, 0.5, 1], [-22, 100, 190]);
  const scale = useTransform(progress, [0, 0.5, 1], [1, 1.4, 2.4]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;
    let cancelled = false;
    let failed = false;
    let readyReported = false;
    let readyFrame = 0;
    let dispose: (() => void) | undefined;

    setStatus('loading');

    const reportReady = () => {
      if (cancelled || readyReported) return;
      readyReported = true;
      onReadyRef.current?.();
    };

    const useFallback = () => {
      if (cancelled) return;
      failed = true;
      window.cancelAnimationFrame(readyFrame);
      setStatus('fallback');
      reportReady();
    };

    void import('./createThreadScene').then(({ createThreadScene }) => {
      if (cancelled) return;
      const scene = createThreadScene(host, {
        getProgress: () => reduced ? 0 : progress.get(),
        reduced,
        onUnavailable: useFallback,
      });

      if (!scene) {
        useFallback();
        return;
      }

      dispose = scene;
      // createThreadScene schedules its first render before returning. Waiting two
      // animation frames keeps the loader up until WebGL has actually painted.
      readyFrame = window.requestAnimationFrame(() => {
        readyFrame = window.requestAnimationFrame(() => {
          if (cancelled || failed) return;
          setStatus('ready');
          reportReady();
        });
      });
    }).catch(useFallback);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(readyFrame);
      dispose?.();
    };
  }, [progress, reduced]);

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
