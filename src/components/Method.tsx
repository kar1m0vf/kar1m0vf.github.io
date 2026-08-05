import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from './Icons';

type JunctionDirection = 'junction' | 'interface' | 'automation' | 'runtime';

interface JunctionAnchor {
  direction: Exclude<JunctionDirection, 'junction'>;
  href: string;
  index: string;
  label: string;
  project: string;
}

const anchors: readonly JunctionAnchor[] = [
  { direction: 'interface', href: '#nar', index: '01', label: 'Interface', project: 'Nar Patisserie' },
  { direction: 'automation', href: '#trendyol', index: '02', label: 'Automation', project: 'Price Tracker' },
  { direction: 'runtime', href: '#blaster', index: '03', label: 'Runtime', project: 'Blaster' },
] as const;

const signalTargets: Record<JunctionDirection, { x: number; y: number }> = {
  junction: { x: 292, y: 326 },
  interface: { x: 646, y: 88 },
  automation: { x: 292, y: 618 },
  runtime: { x: 666, y: 590 },
};

const activePaths: Record<JunctionDirection, string> = {
  junction: 'M292 48 L292 326',
  interface: 'M292 48 L292 326 L646 88',
  automation: 'M292 48 L292 618',
  runtime: 'M292 48 L292 326 L666 590',
};

const activeLabels: Record<JunctionDirection, string> = {
  junction: 'Signal waiting at the junction.',
  interface: 'Interface leads to Nar Patisserie.',
  automation: 'Automation leads to Trendyol Price Tracker.',
  runtime: 'Runtime leads to Blaster.',
};

export function Method() {
  const reduceMotion = useReducedMotion();
  const [activeDirection, setActiveDirection] = useState<JunctionDirection>('junction');
  const signalTarget = signalTargets[activeDirection];

  return (
    <section className="junction" id="method" aria-labelledby="junction-title">
      <div className="section-shell junction__inner">
        <div className="junction__intro">
          <p className="junction__eyebrow">The junction</p>
          <h2 id="junction-title">Where the screen meets the system.</h2>
          <p className="junction__lead">One builder. Three directions. Follow the signal.</p>
        </div>

        <div className="junction__stage" data-active={activeDirection}>
          <svg
            aria-hidden="true"
            className="junction__map"
            preserveAspectRatio="xMidYMid meet"
            viewBox="0 0 760 680"
          >
            <defs>
              <filter height="200%" id="junction-glow" width="200%" x="-50%" y="-50%">
                <feGaussianBlur result="blur" stdDeviation="9" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path className="junction__trace" d="M292 48 L292 618" />
            <path className="junction__trace" d="M292 326 L646 88" />
            <path className="junction__trace" d="M292 326 L666 590" />
            <motion.path
              animate={{ opacity: 1, pathLength: 1 }}
              className="junction__active-trace"
              d={activePaths[activeDirection]}
              initial={reduceMotion ? false : { opacity: 0.35, pathLength: 0 }}
              key={activeDirection}
              transition={{ duration: reduceMotion ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
            />
            <circle className="junction__core" cx="292" cy="326" r="16" />
            <motion.g
              animate={{ x: signalTarget.x, y: signalTarget.y }}
              initial={{ x: signalTargets.junction.x, y: signalTargets.junction.y }}
              transition={{ duration: reduceMotion ? 0 : 0.56, ease: [0.22, 1, 0.36, 1] }}
            >
              <circle className="junction__signal-halo" cx="0" cy="0" r="22" />
              <circle
                className="junction__signal"
                cx="0"
                cy="0"
                filter="url(#junction-glow)"
                r="7"
              />
            </motion.g>
          </svg>

          <p className="junction__origin">Intent enters here</p>

          <nav aria-label="Project directions" className="junction__anchors">
            {anchors.map((anchor) => (
              <a
                aria-label={`${anchor.label}: ${anchor.project}`}
                className={`junction__anchor junction__anchor--${anchor.direction}`}
                href={anchor.href}
                key={anchor.direction}
                onBlur={() => setActiveDirection('junction')}
                onFocus={() => setActiveDirection(anchor.direction)}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
                    setActiveDirection(anchor.direction);
                  }
                }}
                onPointerLeave={(event) => {
                  if (document.activeElement !== event.currentTarget) setActiveDirection('junction');
                }}
              >
                <span>{anchor.index}</span>
                <strong>{anchor.label}</strong>
                <small>{anchor.project}</small>
                <ArrowRightIcon />
              </a>
            ))}
          </nav>
        </div>

        <p aria-atomic="true" aria-live="polite" className="sr-only">
          {activeLabels[activeDirection]}
        </p>
      </div>
    </section>
  );
}
