import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode, RefObject } from 'react';
import type { ProjectMedia, ProjectWorld } from '../types';
import { ArrowIcon, ArrowRightIcon } from './Icons';
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
            <ResponsiveImage media={media[activeIndex]} sizes="96vw" />
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

function MediaFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="media-frame">
      <div aria-hidden="true" className="media-frame__bar">
        <span /><span /><span />
        <i>{label}</i>
      </div>
      {children}
    </div>
  );
}

interface ExplorerStage {
  detail: string;
  frameLabel: string;
  label: string;
}

interface MediaExplorerProps {
  heading: string;
  kind: 'nar' | 'blaster';
  media: readonly ProjectMedia[];
  note: string;
  stages: readonly ExplorerStage[];
}

function MediaExplorer({ heading, kind, media, note, stages }: MediaExplorerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeMedia = media[activeIndex];
  const activeStage = stages[activeIndex];

  if (!activeMedia || !activeStage || media.length !== stages.length) return null;

  const selectStage = (nextIndex: number, focus = false) => {
    const normalized = (nextIndex + stages.length) % stages.length;
    setHasInteracted(true);
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
      selectStage(stages.length - 1, true);
    }
  };

  const conductSpotlight = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
  };

  return (
    <>
      <div className={`project-media media-explorer media-explorer--${kind}`}>
        <div className="project-media__heading">
          <span>{heading}</span>
          <i>{note}</i>
        </div>

        <div className="media-explorer__stage" onPointerMove={conductSpotlight}>
          <MediaFrame label={activeStage.frameLabel}>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1, y: 0 }}
                aria-labelledby={`${kind}-tab-${activeIndex}`}
                className="media-explorer__panel"
                exit={reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0 0 100%)', opacity: 0, y: -8 }}
                id={`${kind}-panel-${activeIndex}`}
                initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)', opacity: 0, y: 8 }}
                key={activeMedia.src}
                role="tabpanel"
                transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
              >
                <MediaTrigger
                  eager={hasInteracted}
                  media={activeMedia}
                  onOpen={(trigger) => {
                    openerRef.current = trigger;
                    setLightboxIndex(activeIndex);
                  }}
                  sizes="(min-width: 900px) 72vw, 96vw"
                />
              </motion.div>
            </AnimatePresence>
          </MediaFrame>
        </div>

        <div className="media-explorer__controller">
          <div aria-label={`${kind === 'nar' ? 'Nar route' : 'Blaster runtime'} states`} className="media-explorer__tabs" role="tablist">
            {stages.map((stage, index) => (
              <button
                aria-controls={`${kind}-panel-${index}`}
                aria-selected={activeIndex === index}
                className={activeIndex === index ? 'is-active' : ''}
                id={`${kind}-tab-${index}`}
                key={stage.label}
                onClick={() => selectStage(index)}
                onFocus={() => selectStage(index)}
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
          <div aria-live="polite" className="media-explorer__readout">
            <span>{kind === 'nar' ? 'Route state' : 'Runtime state'}</span>
            <p>{activeStage.detail}</p>
            <strong>{String(activeIndex + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}</strong>
          </div>
        </div>
      </div>
      <MediaLightbox
        activeIndex={lightboxIndex}
        media={media}
        onChange={setLightboxIndex}
        returnFocusRef={openerRef}
      />
    </>
  );
}

const narStages: readonly ExplorerStage[] = [
  { label: 'Discover', detail: 'The brand and product promise land before the catalog asks for a decision.', frameLabel: 'kar1m0vf.github.io/nar-patisserie' },
  { label: 'Narrow', detail: 'Search and filters reduce a full catalog to a useful next choice.', frameLabel: 'Catalog · Search and filters' },
  { label: 'Choose', detail: 'Product detail keeps the purchase path clear without losing context.', frameLabel: 'Product detail · Purchase flow' },
] as const;

function NarVisual({ project }: { project: ProjectWorld }) {
  if (project.media.length < 3) return null;
  return (
    <MediaExplorer
      heading="Route explorer"
      kind="nar"
      media={project.media}
      note="Choose a step · open any screen"
      stages={narStages}
    />
  );
}

const signalSteps = [
  { label: 'Link', system: 'Telegram input', detail: 'A product URL enters the system.' },
  { label: 'Validate', system: 'Input guard', detail: 'The URL and product data are checked before any work persists.' },
  { label: 'Store', system: 'SQLite', detail: 'The subscription and its settings become durable state.' },
  { label: 'Schedule', system: 'APScheduler', detail: 'A background job brings the price check back at the right time.' },
  { label: 'Compare', system: 'Rule engine', detail: 'Target price, discounts, quiet hours, and anti-spam rules are evaluated.' },
  { label: 'Alert', system: 'Telegram output', detail: 'The useful change reaches the subscriber; noise stays behind.' },
] as const;

function TrendyolVisual({ project }: { project: ProjectWorld }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const reduceMotion = useReducedMotion();
  const [logo] = project.media;
  const activeStep = signalSteps[activeIndex];

  useEffect(() => {
    if (!running || reduceMotion) return;
    if (activeIndex >= signalSteps.length - 1) {
      const finishTimer = window.setTimeout(() => setRunning(false), 700);
      return () => window.clearTimeout(finishTimer);
    }
    const stepTimer = window.setTimeout(() => setActiveIndex((index) => index + 1), 560);
    return () => window.clearTimeout(stepTimer);
  }, [activeIndex, reduceMotion, running]);

  if (!logo || !activeStep) return null;

  const runSignal = () => {
    if (reduceMotion) {
      setRunning(false);
      setActiveIndex(signalSteps.length - 1);
      return;
    }
    setActiveIndex(0);
    setRunning(true);
  };

  const progress = signalSteps.length > 1 ? activeIndex / (signalSteps.length - 1) : 1;
  const progressStyle = { '--signal-progress': progress } as CSSProperties;

  return (
    <div className={`data-loop${running ? ' is-running' : ''}`}>
      <div className="data-loop__heading">
        <span>Signal lab</span>
        <i>Run the real architecture · no live request</i>
      </div>
      <div className="data-loop__canvas">
        <div className="data-loop__brand">
          <ResponsiveImage media={logo} sizes="240px" />
          <span>Price Tracker</span>
          <strong>Trendyol</strong>
          <button disabled={running} onClick={runSignal} type="button">
            {running ? 'Signal running' : activeIndex === signalSteps.length - 1 ? 'Run again' : 'Run one check'}
            <ArrowRightIcon />
          </button>
        </div>

        <div className="data-loop__system">
          <ol aria-label="Trendyol Price Tracker data flow" className="data-loop__steps" style={progressStyle}>
            {signalSteps.map((step, index) => (
              <li className={`${index === activeIndex ? 'is-active' : ''}${index < activeIndex ? ' is-complete' : ''}`} key={step.label}>
                <button
                  aria-label={`Inspect ${step.label}: ${step.system}`}
                  aria-pressed={index === activeIndex}
                  disabled={running}
                  onClick={() => {
                    setRunning(false);
                    setActiveIndex(index);
                  }}
                  type="button"
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{step.label}</strong>
                </button>
              </li>
            ))}
          </ol>

          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              aria-live="polite"
              className="data-loop__readout"
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              key={activeStep.label}
            >
              <span>{running ? 'Signal in motion' : 'Inspecting node'} · {activeStep.system}</span>
              <strong>{activeStep.label}</strong>
              <p>{activeStep.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <p className="data-loop__truth">The chat is the surface. Scheduling, validation, and delivery make it a product.</p>
    </div>
  );
}

const blasterStages: readonly ExplorerStage[] = [
  { label: 'Launch', detail: 'The menu owns entry, settings, highscores, and a clean handoff into play.', frameLabel: 'Main menu · Ready state' },
  { label: 'Wave 03', detail: 'Input, combat state, HUD, enemies, and persistence meet on one scaled 16:9 surface.', frameLabel: 'Wave 03 · Neon Belt' },
  { label: 'Boss phase', detail: 'A new runtime phase raises pressure without changing the rules of the interface.', frameLabel: 'Boss phase · Combat state' },
] as const;

function BlasterVisual({ project }: { project: ProjectWorld }) {
  const [battle, menu, boss] = project.media;
  if (!battle || !menu || !boss) return null;
  const runtimeMedia = [menu, battle, boss] as const;

  return (
    <MediaExplorer
      heading="Runtime deck"
      kind="blaster"
      media={runtimeMedia}
      note="Switch state · use arrow keys"
      stages={blasterStages}
    />
  );
}

export function ProjectVisual({ project }: { project: ProjectWorld }) {
  if (project.theme === 'nar') return <NarVisual project={project} />;
  if (project.theme === 'trendyol') return <TrendyolVisual project={project} />;
  return <BlasterVisual project={project} />;
}
