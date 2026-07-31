import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { ProjectTheme } from '../types';

type TraceVariant = 'hero' | 'method' | 'finale' | ProjectTheme;

const tracePaths: Record<TraceVariant, readonly string[]> = {
  hero: [
    'M300 920 C520 866 686 820 816 640 C924 490 940 266 1088 86',
    'M900 440 C1036 334 1132 280 1260 220',
    'M900 440 C1022 548 1112 648 1218 612 C1270 594 1270 486 1336 430 C1408 368 1508 432 1472 552 C1436 682 1276 614 1164 688 C1108 726 1268 782 1640 780',
  ],
  method: ['M-40 176 C240 80 438 232 700 168 C940 108 1190 100 1640 212'],
  nar: ['M-60 676 C234 512 454 812 760 626 C1040 456 1270 510 1660 282'],
  trendyol: ['M-80 410 C234 164 392 674 720 396 C990 170 1282 270 1670 128'],
  blaster: ['M-70 770 C276 610 402 722 678 538 C964 350 1210 510 1670 122'],
  finale: ['M-80 128 C238 320 470 112 744 328 C1010 538 812 742 1110 850 C1320 924 1450 768 1660 620'],
};

interface LoopTraceProps {
  activeStep?: number;
  className?: string;
  interactive?: boolean;
  onSignalStepChange?: (step: number) => void;
  variant: TraceVariant;
}

interface TracePoint {
  pathIndex: number;
  pathLength: number;
  x: number;
  y: number;
}

interface TraceSample extends TracePoint {
  totalLength: number;
}

interface SignalRipple {
  id: number;
  x: number;
  y: number;
}

const heroSignalSteps = [
  { pathIndex: 0, progress: 0.68 },
  { pathIndex: 1, progress: 0.72 },
  { pathIndex: 2, progress: 0.48 },
  { pathIndex: 2, progress: 0.92 },
] as const;

const heroViewBox = { height: 900, width: 1600 } as const;
const pathSampleCount = 72;

const clampSignalStep = (step: number) => Math.min(heroSignalSteps.length - 1, Math.max(0, step));

function getSignalPoint(paths: readonly SVGPathElement[], step: number): TracePoint | null {
  const signalStep = heroSignalSteps[clampSignalStep(step)];
  if (!signalStep) return null;
  const path = paths[signalStep.pathIndex];
  if (!path) return null;

  const pathLength = path.getTotalLength() * signalStep.progress;
  const point = path.getPointAtLength(pathLength);
  return { pathIndex: signalStep.pathIndex, pathLength, x: point.x, y: point.y };
}

function createTraceSamples(paths: readonly SVGPathElement[]): TraceSample[] {
  return paths.flatMap((path, pathIndex) => {
    const totalLength = path.getTotalLength();
    return Array.from({ length: pathSampleCount + 1 }, (_, index) => {
      const pathLength = (totalLength * index) / pathSampleCount;
      const point = path.getPointAtLength(pathLength);
      return { pathIndex, pathLength, totalLength, x: point.x, y: point.y };
    });
  });
}

function distanceSquared(
  a: Pick<TracePoint, 'x' | 'y'>,
  b: Pick<TracePoint, 'x' | 'y'>,
  scaleX: number,
  scaleY: number,
) {
  const x = (a.x - b.x) * scaleX;
  const y = (a.y - b.y) * scaleY;
  return x * x + y * y;
}

function findNearestTracePoint(
  paths: readonly SVGPathElement[],
  samples: readonly TraceSample[],
  pointer: Pick<TracePoint, 'x' | 'y'>,
  scaleX: number,
  scaleY: number,
): TracePoint | null {
  let nearestSample: TraceSample | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  samples.forEach((sample) => {
    const distance = distanceSquared(sample, pointer, scaleX, scaleY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestSample = sample;
    }
  });

  if (!nearestSample) return null;

  const sample = nearestSample as TraceSample;
  const path = paths[sample.pathIndex];
  if (!path) return null;

  let bestLength = sample.pathLength;
  let bestPoint = path.getPointAtLength(bestLength);
  let searchDistance = sample.totalLength / pathSampleCount;

  for (let pass = 0; pass < 7; pass += 1) {
    const candidates = [
      Math.max(0, bestLength - searchDistance),
      bestLength,
      Math.min(sample.totalLength, bestLength + searchDistance),
    ];

    candidates.forEach((candidateLength) => {
      const candidate = path.getPointAtLength(candidateLength);
      if (distanceSquared(candidate, pointer, scaleX, scaleY) < distanceSquared(bestPoint, pointer, scaleX, scaleY)) {
        bestLength = candidateLength;
        bestPoint = candidate;
      }
    });

    searchDistance *= 0.5;
  }

  return { pathIndex: sample.pathIndex, pathLength: bestLength, x: bestPoint.x, y: bestPoint.y };
}

function findNearestSignalStep(
  paths: readonly SVGPathElement[],
  point: TracePoint,
  scaleX: number,
  scaleY: number,
) {
  let nearestStep = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  heroSignalSteps.forEach((_, step) => {
    const signalPoint = getSignalPoint(paths, step);
    if (!signalPoint) return;
    const distance = distanceSquared(signalPoint, point, scaleX, scaleY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestStep = step;
    }
  });

  return nearestStep;
}

export function LoopTrace({
  activeStep = 0,
  className = '',
  interactive = false,
  onSignalStepChange,
  variant,
}: LoopTraceProps) {
  const reduceMotion = useReducedMotion();
  const filterId = `trace-glow-${useId().replaceAll(':', '')}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const beadRef = useRef<SVGCircleElement | null>(null);
  const beadPositionRef = useRef<Pick<TracePoint, 'x' | 'y'> | null>(null);
  const beadAnimationFrameRef = useRef<number | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const lastNotifiedStepRef = useRef(clampSignalStep(activeStep));
  const pointerDrivenStepRef = useRef<number | null>(null);
  const rippleIdRef = useRef(0);
  const [ripple, setRipple] = useState<SignalRipple | null>(null);
  const selectedStep = clampSignalStep(activeStep);
  const isInteractive = interactive && variant === 'hero';
  const target = { opacity: 1, pathLength: 1 };

  const setBeadPosition = useCallback((point: Pick<TracePoint, 'x' | 'y'>) => {
    beadPositionRef.current = point;
    beadRef.current?.setAttribute('cx', point.x.toFixed(2));
    beadRef.current?.setAttribute('cy', point.y.toFixed(2));
  }, []);

  const animateBeadTo = useCallback((point: Pick<TracePoint, 'x' | 'y'>) => {
    if (beadAnimationFrameRef.current !== null) cancelAnimationFrame(beadAnimationFrameRef.current);

    const start = beadPositionRef.current;
    if (reduceMotion || !start) {
      setBeadPosition(point);
      beadAnimationFrameRef.current = null;
      return;
    }

    const startedAt = performance.now();
    const duration = 520;
    const tick = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setBeadPosition({
        x: start.x + (point.x - start.x) * eased,
        y: start.y + (point.y - start.y) * eased,
      });

      if (progress < 1) beadAnimationFrameRef.current = requestAnimationFrame(tick);
      else beadAnimationFrameRef.current = null;
    };

    beadAnimationFrameRef.current = requestAnimationFrame(tick);
  }, [reduceMotion, setBeadPosition]);

  const startRipple = useCallback((point: Pick<TracePoint, 'x' | 'y'>) => {
    if (reduceMotion) return;
    rippleIdRef.current += 1;
    setRipple({ id: rippleIdRef.current, x: point.x, y: point.y });
  }, [reduceMotion]);

  useLayoutEffect(() => {
    if (!isInteractive || !svgRef.current) return;

    const paths = Array.from(svgRef.current.querySelectorAll<SVGPathElement>('.loop-trace__line'));
    const point = getSignalPoint(paths, selectedStep);
    if (!point) return;

    lastNotifiedStepRef.current = selectedStep;
    if (pointerDrivenStepRef.current === selectedStep) {
      pointerDrivenStepRef.current = null;
      return;
    }

    const hadPosition = beadPositionRef.current !== null;
    animateBeadTo(point);
    if (hadPosition) startRipple(point);
  }, [animateBeadTo, isInteractive, selectedStep, startRipple]);

  useEffect(() => {
    if (!isInteractive || reduceMotion || !svgRef.current || !window.matchMedia('(any-pointer: fine)').matches) return;

    const svg = svgRef.current;
    const conductor = svg.closest<HTMLElement>('.hero') ?? svg.parentElement;
    if (!conductor) return;

    const paths = Array.from(svg.querySelectorAll<SVGPathElement>('.loop-trace__line'));
    const samples = createTraceSamples(paths);
    let pointerPosition = { clientX: 0, clientY: 0 };

    const conductSignal = () => {
      pointerFrameRef.current = null;
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const pointer = {
        x: ((pointerPosition.clientX - bounds.left) / bounds.width) * heroViewBox.width,
        y: ((pointerPosition.clientY - bounds.top) / bounds.height) * heroViewBox.height,
      };
      const scaleX = bounds.width / heroViewBox.width;
      const scaleY = bounds.height / heroViewBox.height;
      const nearestPoint = findNearestTracePoint(paths, samples, pointer, scaleX, scaleY);
      if (!nearestPoint) return;

      if (beadAnimationFrameRef.current !== null) {
        cancelAnimationFrame(beadAnimationFrameRef.current);
        beadAnimationFrameRef.current = null;
      }
      setBeadPosition(nearestPoint);

      const nextStep = findNearestSignalStep(paths, nearestPoint, scaleX, scaleY);
      if (nextStep !== lastNotifiedStepRef.current) {
        lastNotifiedStepRef.current = nextStep;
        pointerDrivenStepRef.current = nextStep;
        startRipple(nearestPoint);
        onSignalStepChange?.(nextStep);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('a, button, input, select, textarea')) {
        if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
        pointerFrameRef.current = null;
        return;
      }

      pointerPosition = { clientX: event.clientX, clientY: event.clientY };
      if (pointerFrameRef.current === null) pointerFrameRef.current = requestAnimationFrame(conductSignal);
    };

    const stopConducting = () => {
      if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    };

    conductor.addEventListener('pointermove', handlePointerMove, { passive: true });
    conductor.addEventListener('pointerleave', stopConducting);
    return () => {
      conductor.removeEventListener('pointermove', handlePointerMove);
      conductor.removeEventListener('pointerleave', stopConducting);
      stopConducting();
    };
  }, [isInteractive, onSignalStepChange, reduceMotion, setBeadPosition, startRipple]);

  useEffect(() => () => {
    if (beadAnimationFrameRef.current !== null) cancelAnimationFrame(beadAnimationFrameRef.current);
    if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
  }, []);

  return (
    <svg
      aria-hidden="true"
      className={`loop-trace loop-trace--${variant}${isInteractive ? ' loop-trace--interactive' : ''} ${className}`}
      data-active-step={isInteractive ? selectedStep : undefined}
      data-interactive={isInteractive || undefined}
      preserveAspectRatio="none"
      ref={svgRef}
      viewBox="0 0 1600 900"
    >
      <defs>
        <filter height="180%" id={filterId} width="180%" x="-40%" y="-40%">
          <feGaussianBlur result="blur" stdDeviation="8" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {tracePaths[variant].map((path, index) => (
        <g key={path}>
          <path className="loop-trace__halo" d={path} filter={`url(#${filterId})`} />
          <motion.path
            {...(variant === 'hero'
              ? { animate: target }
              : { viewport: { amount: 0.2, once: true }, whileInView: target })}
            className="loop-trace__line"
            d={path}
            initial={reduceMotion ? false : { opacity: 0, pathLength: 0 }}
            transition={{ delay: index * 0.12, duration: 1.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </g>
      ))}
      {isInteractive ? (
        <g className="loop-trace__signal" data-active-step={selectedStep} pointerEvents="none">
          {ripple && !reduceMotion ? (
            <motion.circle
              animate={{ opacity: 0, r: 32 }}
              className="loop-trace__signal-ripple"
              cx={ripple.x}
              cy={ripple.y}
              fill="none"
              initial={{ opacity: 0.52, r: 5 }}
              key={ripple.id}
              onAnimationComplete={() => {
                setRipple((current) => current?.id === ripple.id ? null : current);
              }}
              stroke="var(--blue-bright)"
              strokeWidth="2"
              transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : null}
          <circle
            className="loop-trace__signal-bead"
            fill="var(--blue-bright)"
            filter={`url(#${filterId})`}
            r="6"
            ref={beadRef}
          />
        </g>
      ) : null}
    </svg>
  );
}
