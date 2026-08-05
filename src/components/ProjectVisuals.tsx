import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { CSSProperties, KeyboardEvent, RefObject } from 'react';
import type {
  ProjectMedia,
  ProjectWorld,
  TrackerHandoffState,
  TrackerSignalResult,
} from '../types';
import { ArrowIcon } from './Icons';
import { PriceObservatory } from './PriceObservatory';
import { ResponsiveImage } from './ResponsiveImage';

interface MediaTriggerProps {
  className?: string;
  eager?: boolean;
  media: ProjectMedia;
  onOpen: (trigger: HTMLButtonElement) => void;
  sizes: string;
}

function MediaTrigger({ className = '', eager = false, media, onOpen, sizes }: MediaTriggerProps) {
  return (
    <button
      aria-label={`Open full view: ${media.alt}`}
      className={`media-shot ${className}`}
      onClick={(event) => onOpen(event.currentTarget)}
      type="button"
    >
      <ResponsiveImage eager={eager} media={media} sizes={sizes} />
      <span className="media-shot__caption">{media.caption}</span>
      <span aria-hidden="true" className="media-shot__open">
        Full view <ArrowIcon />
      </span>
    </button>
  );
}

interface MediaLightboxProps {
  activeIndex: number | null;
  media: readonly ProjectMedia[];
  onChange: (index: number | null) => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

function MediaLightbox({ activeIndex, media, onChange, returnFocusRef }: MediaLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(activeIndex);
  const isOpen = activeIndex !== null;

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const inerted = Array.from(document.body.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== dialog)
      .map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }));

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const currentIndex = activeIndexRef.current;
      if (currentIndex === null) return;
      if (event.key === 'Escape') onChange(null);
      if (event.key === 'ArrowLeft') onChange((currentIndex - 1 + media.length) % media.length);
      if (event.key === 'ArrowRight') onChange((currentIndex + 1) % media.length);

      if (event.key === 'Tab' && dialog) {
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
        ).filter((element) => !element.hasAttribute('hidden'));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    inerted.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      inerted.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
      });
      returnFocusRef.current?.focus();
    };
  }, [isOpen, media.length, onChange, returnFocusRef]);

  return createPortal(
    <AnimatePresence>
      {activeIndex !== null && media[activeIndex] ? (
        <motion.div
          animate={{ opacity: 1 }}
          aria-label={`${media[activeIndex].caption} image viewer`}
          aria-modal="true"
          className="media-lightbox"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) onChange(null);
          }}
          ref={dialogRef}
          role="dialog"
        >
          <button autoFocus className="media-lightbox__close" onClick={() => onChange(null)} type="button">
            Close
          </button>
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="media-lightbox__image"
            initial={{ opacity: 0, scale: 0.985 }}
            key={media[activeIndex].src}
          >
            <ResponsiveImage
              eager
              media={media[activeIndex]}
              sizes="(min-width: 1100px) 68vw, 94vw"
            />
          </motion.div>
          <div className="media-lightbox__footer">
            <span>{String(activeIndex + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}</span>
            <strong>{media[activeIndex].caption}</strong>
            {media.length > 1 ? (
              <div>
                <button onClick={() => onChange((activeIndex - 1 + media.length) % media.length)} type="button">Previous</button>
                <button onClick={() => onChange((activeIndex + 1) % media.length)} type="button">Next</button>
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

const narStages = [
  {
    label: 'Discover',
    headline: 'Let appetite lead.',
    detail: 'The first screen establishes the brand before asking the visitor to make a decision.',
  },
  {
    label: 'Narrow',
    headline: 'Reduce the noise.',
    detail: 'Search and filters turn a full catalog into a smaller, more useful set of choices.',
  },
  {
    label: 'Choose',
    headline: 'Keep the choice.',
    detail: 'Product detail completes the route while favourites and cart state remain available.',
  },
] as const;

const narSignalPoints = [
  { x: 116, y: 88 },
  { x: 500, y: 74 },
  { x: 884, y: 88 },
] as const;

function NarVisual({ project }: { project: ProjectWorld }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeMedia = project.media[activeIndex];
  const activeStage = narStages[activeIndex];
  const signalPoint = narSignalPoints[activeIndex];

  if (!activeMedia || !activeStage || !signalPoint || project.media.length < narStages.length) return null;

  const selectStage = (nextIndex: number, focus = false) => {
    const normalized = (nextIndex + narStages.length) % narStages.length;
    setActiveIndex(normalized);
    if (focus) tabRefs.current[normalized]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectStage(index - 1, true);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectStage(index + 1, true);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      selectStage(0, true);
    }
    if (event.key === 'End') {
      event.preventDefault();
      selectStage(narStages.length - 1, true);
    }
  };

  return (
    <>
      <div className="nar-world" data-step={activeIndex}>
        <div className="nar-world__heading">
          <span>The returning choice</span>
          <i>Move through one real shopping flow</i>
        </div>

        <div className="nar-world__stage">
          <svg aria-hidden="true" className="nar-world__ribbon" preserveAspectRatio="none" viewBox="0 0 1000 180">
            <path d="M-24 126 C154 18 286 154 480 80 C666 8 798 34 1024 126" pathLength="1" />
            <motion.g
              animate={{ x: signalPoint.x, y: signalPoint.y }}
              initial={{ x: narSignalPoints[0].x, y: narSignalPoints[0].y }}
              transition={{ duration: reduceMotion ? 0 : 0.58, ease: [0.22, 1, 0.36, 1] }}
            >
              <circle cx="0" cy="0" r="7" />
            </motion.g>
          </svg>

          <div className="nar-world__story" aria-live="polite">
            <span>Route {String(activeIndex + 1).padStart(2, '0')}</span>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                key={activeStage.label}
              >
                <strong>{activeStage.headline}</strong>
                <p>{activeStage.detail}</p>
              </motion.div>
            </AnimatePresence>
            <div className="nar-world__memory" aria-label="State retained across routes">
              <span><i aria-hidden="true">♥</i> Favourites kept</span>
              <span><i aria-hidden="true">＋</i> Cart kept</span>
            </div>
          </div>

          <div className="nar-world__screen">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ clipPath: 'inset(0 0 0 0)', opacity: 1, x: 0 }}
                aria-labelledby={`nar-route-tab-${activeIndex}`}
                exit={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0 0 100%)', opacity: 0, x: 18 }}
                id="nar-route-panel"
                initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)', opacity: 0, x: -18 }}
                key={activeMedia.src}
                role="tabpanel"
                transition={{ duration: reduceMotion ? 0 : 0.52, ease: [0.22, 1, 0.36, 1] }}
              >
                <MediaTrigger
                  className="nar-world__media"
                  eager={activeIndex > 0}
                  media={activeMedia}
                  onOpen={(trigger) => {
                    openerRef.current = trigger;
                    setLightboxIndex(activeIndex);
                  }}
                  sizes="(min-width: 1100px) 68vw, 94vw"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div aria-label="Nar shopping route" className="nar-world__route" role="tablist">
            {narStages.map((stage, index) => (
              <button
                aria-controls="nar-route-panel"
                aria-selected={activeIndex === index}
                className={activeIndex === index ? 'is-active' : ''}
                id={`nar-route-tab-${index}`}
                key={stage.label}
                onClick={() => selectStage(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                ref={(element) => { tabRefs.current[index] = element; }}
                role="tab"
                tabIndex={activeIndex === index ? 0 : -1}
                type="button"
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{stage.label}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="nar-world__truth">
          <strong>A choice should survive the route.</strong>
          <p>The interface changes. The visitor’s intent does not.</p>
        </div>
      </div>

      <MediaLightbox
        activeIndex={lightboxIndex}
        media={project.media}
        onChange={setLightboxIndex}
        returnFocusRef={openerRef}
      />
    </>
  );
}

const blasterStages = [
  {
    id: 'input',
    label: 'Input',
    cue: 'Runtime entry',
    headline: 'One action enters the loop.',
    detail: 'The menu owns the entry point, settings, highscores, and the handoff into play.',
    mediaIndex: 0,
  },
  {
    id: 'state',
    label: 'State',
    cue: 'Clean handoff',
    headline: 'The menu yields to the runtime.',
    detail: 'A deliberate state boundary moves the application from navigation into the live game loop.',
    mediaIndex: 0,
  },
  {
    id: 'wave',
    label: 'Wave',
    cue: 'Systems update together',
    headline: 'Combat is a coordinated update.',
    detail: 'Input, enemies, projectiles, HUD, timing, and collisions stay coherent on one scaled 16:9 surface.',
    mediaIndex: 1,
  },
  {
    id: 'boss',
    label: 'Boss',
    cue: 'Pressure changes',
    headline: 'The rules hold under pressure.',
    detail: 'Boss phases raise the intensity without breaking the same controls, state model, or interface logic.',
    mediaIndex: 2,
  },
  {
    id: 'persist',
    label: 'Persist',
    cue: 'The loop closes',
    headline: 'State survives the run.',
    detail: 'Settings and highscores return with the player, ready for the next launch instead of disappearing on exit.',
    mediaIndex: 0,
  },
] as const;

const inboundOutcomeLabels = {
  memory: 'Stored decision received',
  held: 'Quiet-hours decision received',
  released: 'Released alert received',
} as const;

function BlasterVisual({
  project,
  trackerHandoff,
}: {
  project: ProjectWorld;
  trackerHandoff: TrackerHandoffState | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [battle, menu, boss] = project.media;
  if (!battle || !menu || !boss) return null;
  const runtimeMedia = [menu, battle, boss] as const;
  const activeStage = blasterStages[activeIndex];
  const activeMedia = activeStage ? runtimeMedia[activeStage.mediaIndex] : undefined;
  const inboundLabel = trackerHandoff && trackerHandoff.status !== 'idle'
    ? inboundOutcomeLabels[trackerHandoff.outcome]
    : null;

  if (!activeStage || !activeMedia) return null;

  const runtimeStyle = {
    '--runtime-progress': activeIndex / (blasterStages.length - 1),
  } as CSSProperties;

  return (
    <>
      <div
        className="blaster-chamber"
        data-inbound={inboundLabel ? 'received' : 'idle'}
        data-stage={activeStage.id}
        style={runtimeStyle}
      >
        <div className="blaster-chamber__heading">
          <div>
            <span>Interactive runtime model</span>
            <strong>Flight recorder</strong>
          </div>
          <p>Scrub one input through the system.</p>
        </div>

        <div className="blaster-chamber__stage">
          <div className="blaster-chamber__screen" id="blaster-runtime-panel">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ clipPath: 'inset(0 0 0 0)', opacity: 1 }}
                className="blaster-chamber__frame"
                exit={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0 0 100%)', opacity: 0.45 }}
                initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)', opacity: 0.45 }}
                key={activeStage.id}
                transition={{ duration: reduceMotion ? 0 : 0.44, ease: [0.22, 1, 0.36, 1] }}
              >
                <MediaTrigger
                  className="blaster-chamber__media"
                  eager={activeIndex > 0}
                  media={activeMedia}
                  onOpen={(trigger) => {
                    openerRef.current = trigger;
                    setLightboxIndex(activeStage.mediaIndex);
                  }}
                  sizes="(min-width: 901px) min(78rem, 108vw), 94vw"
                />
              </motion.div>
            </AnimatePresence>

            <span aria-hidden="true" className="blaster-chamber__scanline" key={`scan-${activeStage.id}`} />
            <div aria-hidden="true" className="blaster-chamber__frame-count">
              Frame {String(activeIndex + 1).padStart(2, '0')} / {String(blasterStages.length).padStart(2, '0')}
            </div>

            {activeStage.id === 'input' ? (
              <div aria-hidden="true" className="blaster-chamber__awaiting">
                <span /> {inboundLabel ?? 'Awaiting input'}
              </div>
            ) : null}

            {activeStage.id === 'state' ? (
              <div aria-hidden="true" className="blaster-chamber__handoff">
                <span>Menu</span><i>→</i><strong>Playing</strong>
              </div>
            ) : null}

            {activeStage.id === 'boss' ? <span aria-hidden="true" className="blaster-chamber__boss-ring" /> : null}

            {activeStage.id === 'persist' ? (
              <div className="blaster-chamber__receipt">
                <span>State handoff</span>
                <div><strong>Settings</strong><i>JSON</i></div>
                <div><strong>Highscores</strong><i>JSON</i></div>
                <div><strong>Next run</strong><i>Ready</i></div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="blaster-chamber__console">
          <div aria-live="polite" className="blaster-chamber__readout">
            <span>{activeStage.cue}</span>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                key={activeStage.id}
                transition={{ duration: reduceMotion ? 0 : 0.28 }}
              >
                <strong>{activeStage.headline}</strong>
                <p>{activeStage.detail}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="blaster-chamber__control">
            <label htmlFor="blaster-runtime-range">Move the ship through the runtime</label>
            <div className="blaster-chamber__rail">
              <input
                aria-controls="blaster-runtime-panel"
                aria-describedby="blaster-runtime-hint"
                aria-label="Explore the Blaster runtime"
                aria-valuetext={`${activeStage.label}: ${activeStage.headline}`}
                id="blaster-runtime-range"
                max={blasterStages.length - 1}
                min="0"
                onChange={(event) => setActiveIndex(Number(event.currentTarget.value))}
                step="1"
                type="range"
                value={activeIndex}
              />
            </div>
            <ol aria-hidden="true" className="blaster-chamber__labels">
              {blasterStages.map((stage, index) => (
                <li className={index === activeIndex ? 'is-active' : ''} key={stage.id}>{stage.label}</li>
              ))}
            </ol>
            <p id="blaster-runtime-hint">Drag the ship or focus it and use the arrow keys.</p>
          </div>
        </div>
      </div>

      <MediaLightbox
        activeIndex={lightboxIndex}
        media={runtimeMedia}
        onChange={setLightboxIndex}
        returnFocusRef={openerRef}
      />
    </>
  );
}

const noopHandoffReset = () => undefined;
const noopHandoffResolved = (_result: TrackerSignalResult) => undefined;

interface ProjectVisualProps {
  onHandoffReset: (() => void) | null;
  onHandoffResolved: ((result: TrackerSignalResult) => void) | null;
  project: ProjectWorld;
  trackerHandoff: TrackerHandoffState | null;
}

export function ProjectVisual({
  onHandoffReset,
  onHandoffResolved,
  project,
  trackerHandoff,
}: ProjectVisualProps) {
  if (project.theme === 'nar') return <NarVisual project={project} />;
  if (project.theme === 'trendyol' && project.observatory) {
    return (
      <PriceObservatory
        config={project.observatory}
        handoffStatus={trackerHandoff?.status ?? 'idle'}
        onHandoffReset={onHandoffReset ?? noopHandoffReset}
        onHandoffResolved={onHandoffResolved ?? noopHandoffResolved}
      />
    );
  }
  return <BlasterVisual project={project} trackerHandoff={trackerHandoff} />;
}
