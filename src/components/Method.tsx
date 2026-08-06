import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useSound } from '../audio/SoundProvider';
import { ArrowRightIcon } from './Icons';

const routes = [
  { direction: 'interface', href: '#nar', index: '01', label: 'Interface', project: 'Nar Patisserie' },
  { direction: 'automation', href: '#trendyol', index: '02', label: 'Automation', project: 'Price Tracker' },
  { direction: 'runtime', href: '#blaster', index: '03', label: 'Runtime', project: 'Blaster' },
] as const;

type JunctionDirection = (typeof routes)[number]['direction'];
type JunctionMapVariant = 'desktop' | 'mobile';

interface JunctionMapGeometry {
  readonly viewBox: string;
  readonly grid: string;
  readonly hub: { readonly x: number; readonly y: number };
  readonly incoming: string;
  readonly branches: Readonly<Record<JunctionDirection, string>>;
  readonly activePaths: Readonly<Record<JunctionDirection, string>>;
  readonly endpoints: Readonly<Record<JunctionDirection, { readonly x: number; readonly y: number }>>;
}

const mapGeometry: Readonly<Record<JunctionMapVariant, JunctionMapGeometry>> = {
  desktop: {
    viewBox: '0 0 1200 760',
    grid: 'M0 430H1200 M420 0V760 M116 0V760 M0 118H1200 M0 650H1200 M0 760L760 0 M150 760L910 0',
    hub: { x: 420, y: 430 },
    incoming: 'M420 -20V104C420 190 420 320 420 430',
    branches: {
      interface: 'M420 430C506 390 526 230 665 230H1028',
      automation: 'M420 430C520 500 617 500 800 500',
      runtime: 'M420 430C382 546 448 652 592 680H1000',
    },
    activePaths: {
      interface: 'M420 -20V104C420 190 420 320 420 430C506 390 526 230 665 230H1028',
      automation: 'M420 -20V104C420 190 420 320 420 430C520 500 617 500 800 500',
      runtime: 'M420 -20V104C420 190 420 320 420 430C382 546 448 652 592 680H1000',
    },
    endpoints: {
      interface: { x: 1028, y: 230 },
      automation: { x: 800, y: 500 },
      runtime: { x: 1000, y: 680 },
    },
  },
  mobile: {
    viewBox: '0 0 390 620',
    grid: 'M195 0V620 M0 104H390 M0 259H390 M0 381H390 M0 503H390',
    hub: { x: 195, y: 104 },
    incoming: 'M195 -12V104',
    branches: {
      interface: 'M195 104C180 174 76 221 0 259',
      automation: 'M195 104C174 244 70 330 0 381',
      runtime: 'M195 104C165 316 66 449 0 503',
    },
    activePaths: {
      interface: 'M195 -12V104C180 174 76 221 0 259',
      automation: 'M195 -12V104C174 244 70 330 0 381',
      runtime: 'M195 -12V104C165 316 66 449 0 503',
    },
    endpoints: {
      interface: { x: 0, y: 259 },
      automation: { x: 0, y: 381 },
      runtime: { x: 0, y: 503 },
    },
  },
};

const materialFragments = Array.from({ length: 7 }, (_, index) => index);

interface SignalMapProps {
  readonly activeDirection: JunctionDirection;
  readonly isActivated: boolean;
  readonly reduceMotion: boolean;
  readonly variant: JunctionMapVariant;
}

function SignalMap({ activeDirection, isActivated, reduceMotion, variant }: SignalMapProps) {
  const geometry = mapGeometry[variant];
  const endpoint = geometry.endpoints[activeDirection];
  const gradientId = `junction-route-${variant}-${activeDirection}`;

  return (
    <svg
      aria-hidden="true"
      className={`junction__map junction__map--${variant}`}
      preserveAspectRatio="none"
      viewBox={geometry.viewBox}
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          x1={geometry.hub.x}
          x2={endpoint.x}
          y1="0"
          y2={endpoint.y}
        >
          <stop offset="0" stopColor="var(--blue-bright)" />
          <stop offset="0.46" stopColor="var(--blue-bright)" />
          <stop offset="0.7" stopColor="var(--junction-accent)" />
          <stop offset="1" stopColor="var(--junction-accent)" />
        </linearGradient>
      </defs>

      <path className="junction__grid" d={geometry.grid} />
      <path className="junction__incoming" d={geometry.incoming} />

      {(Object.keys(geometry.branches) as JunctionDirection[]).map((direction) => (
        <path
          className="junction__branch"
          d={geometry.branches[direction]}
          data-route={direction}
          key={direction}
        />
      ))}

      <motion.path
        animate={{ opacity: isActivated ? 1 : 0.24, pathLength: isActivated ? 1 : 0 }}
        className="junction__active-route"
        d={geometry.activePaths[activeDirection]}
        initial={reduceMotion ? false : { opacity: 0.28, pathLength: 0 }}
        key={`${variant}-${activeDirection}`}
        stroke={`url(#${gradientId})`}
        transition={{ duration: reduceMotion ? 0 : 0.72, ease: [0.22, 1, 0.36, 1] }}
      />

    </svg>
  );
}

function RouteMaterial({ direction }: { readonly direction: JunctionDirection }) {
  return (
    <span aria-hidden="true" className={`junction__material junction__material--${direction}`}>
      <span className="junction__material-shell" />
      <span className="junction__material-fragments">
        {materialFragments.map((fragment) => <i key={fragment} />)}
      </span>
    </span>
  );
}

export function Method() {
  const reduceMotion = Boolean(useReducedMotion());
  const { playSound } = useSound();
  const [activeDirection, setActiveDirection] = useState<JunctionDirection>('interface');
  const stageRef = useRef<HTMLDivElement>(null);
  const junctionInView = useInView(stageRef, { amount: 0.22, once: true });
  const activeRoute = routes.find((route) => route.direction === activeDirection) ?? routes[0];

  function cycleRoute() {
    const currentIndex = routes.findIndex((route) => route.direction === activeDirection);
    const nextRoute = routes[(currentIndex + 1) % routes.length] ?? routes[0];
    setActiveDirection(nextRoute.direction);
    playSound('signal');
  }

  return (
    <section
      aria-labelledby="junction-title"
      className="junction"
      data-active={activeDirection}
      id="method"
    >
      <div className="section-shell junction__inner">
        <motion.header
          className="junction__intro"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          transition={{ duration: reduceMotion ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ amount: 0.65, once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <h2 id="junction-title">
            <span className="junction__eyebrow">The junction</span>
            <span className="junction__statement">One signal. Three ways to build.</span>
          </h2>
          <p className="junction__lead">Route the signal.</p>
        </motion.header>

        <motion.div
          className="junction__stage"
          initial={reduceMotion ? false : { opacity: 0 }}
          ref={stageRef}
          transition={{ delay: reduceMotion ? 0 : 0.12, duration: reduceMotion ? 0 : 0.75 }}
          viewport={{ amount: 0.18, once: true }}
          whileInView={{ opacity: 1 }}
        >
          <SignalMap
            activeDirection={activeDirection}
            isActivated={reduceMotion || junctionInView}
            reduceMotion={reduceMotion}
            variant="desktop"
          />
          <SignalMap
            activeDirection={activeDirection}
            isActivated={reduceMotion || junctionInView}
            reduceMotion={reduceMotion}
            variant="mobile"
          />

          <span aria-hidden="true" className="junction__switch-field">
            <i />
            <i />
            <i />
            <i />
          </span>

          <button
            aria-label={`Route signal. Current destination: ${activeRoute.project}. Activate to choose the next route.`}
            className="junction__switch"
            onClick={cycleRoute}
            type="button"
          >
            <span aria-hidden="true" className="junction__switch-arm" />
            <span aria-hidden="true" className="junction__switch-ring" />
            <span className="junction__switch-readout">
              <small>Route</small>
              <strong>{activeRoute.index}</strong>
            </span>
            <span aria-hidden="true" className="junction__switch-bead" />
          </button>

          <nav aria-label="Project directions" className="junction__routes">
            {routes.map((route) => {
              const isActive = route.direction === activeDirection;

              return (
                <a
                  className={`junction__route junction__route--${route.direction}`}
                  data-route-active={isActive ? 'true' : 'false'}
                  href={route.href}
                  key={route.direction}
                  onClick={() => playSound('select')}
                  onFocus={() => setActiveDirection(route.direction)}
                  onPointerDown={(event) => {
                    if (event.pointerType === 'touch') setActiveDirection(route.direction);
                  }}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
                      setActiveDirection(route.direction);
                    }
                  }}
                >
                  <span className="junction__route-copy">
                    <span className="junction__route-meta">
                      <b>{route.index}</b>
                      <span>{route.label}</span>
                    </span>
                    <strong>{route.project}</strong>
                  </span>
                  <RouteMaterial direction={route.direction} />
                  <span aria-hidden="true" className="junction__route-arrow">
                    <ArrowRightIcon />
                  </span>
                </a>
              );
            })}
          </nav>

          <p aria-hidden="true" className="junction__switch-hint">Tap the core to reroute</p>
        </motion.div>
      </div>
    </section>
  );
}
