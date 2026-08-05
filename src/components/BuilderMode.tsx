import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import './BuilderMode.css';

export type BuilderProjectId = 'nar' | 'trendyol' | 'blaster';

export interface BuilderModeHudProps {
  enabled: boolean;
  onDisable: () => void;
  activeSection?: string | null;
}

export interface BuilderLayerPanelProps {
  projectId: BuilderProjectId;
}

interface BuilderLayer {
  detail: string;
  index: string;
  label: string;
  name: string;
  stack: readonly string[];
}

interface BuilderProject {
  eyebrow: string;
  title: string;
  layers: readonly BuilderLayer[];
}

const projects: Record<BuilderProjectId, BuilderProject> = {
  nar: {
    eyebrow: 'Nar Patisserie',
    title: 'A shopping intent that survives the route.',
    layers: [
      {
        detail: 'Search, filters, catalog routes, and product detail turn a broad craving into one clear choice.',
        index: '01',
        label: 'Search · Filter · Route',
        name: 'Discover',
        stack: ['React', 'React Router', 'CSS'],
      },
      {
        detail: 'Favourites, cart quantities, and interface state stay coherent while the customer moves between views.',
        index: '02',
        label: 'Favourite · Cart · Quantity',
        name: 'State',
        stack: ['React state', 'JavaScript', 'Components'],
      },
      {
        detail: 'The cart and favourites return after a reload, so a route change never erases the customer’s decision.',
        index: '03',
        label: 'Save · Restore · Continue',
        name: 'Persist',
        stack: ['localStorage', 'Vite', 'Responsive UI'],
      },
    ],
  },
  trendyol: {
    eyebrow: 'Trendyol Price Tracker',
    title: 'Observation becomes useful only after a rule agrees.',
    layers: [
      {
        detail: 'Scheduled checks use batches, locking, caching, and network limits to collect price history without uncontrolled work.',
        index: '01',
        label: 'Schedule · Check · Remember',
        name: 'Observe',
        stack: ['Python', 'APScheduler', 'SQLite'],
      },
      {
        detail: 'Targets, drops, ranges, percentages, intervals, pauses, and quiet hours decide whether a change deserves attention.',
        index: '02',
        label: 'Rules · Target · Quiet hours',
        name: 'Decide',
        stack: ['Python', 'SQL', 'Rule engine'],
      },
      {
        detail: 'Qualified changes become grouped Telegram alerts; diagnostics and four locales keep delivery reliable in use.',
        index: '03',
        label: 'Group · Localize · Alert',
        name: 'Deliver',
        stack: ['aiogram 3', 'Telegram', 'Diagnostics'],
      },
    ],
  },
  blaster: {
    eyebrow: 'Blaster',
    title: 'A playable loop backed by a release loop.',
    layers: [
      {
        detail: 'Player input, menus, and game controls enter one consistently scaled 16:9 play surface.',
        index: '01',
        label: 'Move · Fire · Navigate',
        name: 'Input',
        stack: ['Python 3.11', 'Pygame', '16:9 surface'],
      },
      {
        detail: 'Gameplay state coordinates waves, projectiles, collisions, boss phases, retry, settings, and highscores.',
        index: '02',
        label: 'State · Collision · Boss',
        name: 'Runtime',
        stack: ['Pygame', 'JSON', 'pytest'],
      },
      {
        detail: 'A checked PowerShell flow packages the Windows build, assembles the ZIP, and produces SHA256 checksums.',
        index: '03',
        label: 'Test · Package · Verify',
        name: 'Release',
        stack: ['PowerShell', 'PyInstaller', 'SHA256'],
      },
    ],
  },
};

const sectionLabels: Record<string, string> = {
  top: 'Entry signal',
  work: 'Project index',
  method: 'System junction',
  nar: 'Nar · Interface',
  trendyol: 'Tracker · Automation',
  blaster: 'Blaster · Runtime',
  journey: 'Builder journey',
  contact: 'Open channel',
};

function getSectionLabel(section?: string | null) {
  if (!section) return 'Scanning page';
  return sectionLabels[section] ?? section.replace(/[-_]/g, ' ');
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 5 14 14M19 5 5 19" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16">
      <path d="M1 8h25M19 1l7 7-7 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

export function BuilderModeHud({ enabled, onDisable, activeSection }: BuilderModeHudProps) {
  const reduceMotion = useReducedMotion();
  const sectionKey = activeSection?.toLowerCase() ?? '';
  const accent = sectionKey === 'nar' || sectionKey === 'trendyol' || sectionKey === 'blaster'
    ? sectionKey
    : 'system';

  return (
    <AnimatePresence>
      {enabled ? (
        <motion.aside
          animate={{ opacity: 1, y: 0 }}
          aria-label="Builder mode controls"
          className="builder-hud"
          data-accent={accent}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <span aria-hidden="true" className="builder-hud__rail" />
          <div className="builder-hud__mode">
            <span className="builder-hud__signal" />
            <span>Builder mode</span>
            <strong>On</strong>
          </div>
          <div aria-live="polite" className="builder-hud__context">
            <span>Inspecting</span>
            <strong>{getSectionLabel(activeSection)}</strong>
          </div>
          <button aria-label="Turn off Builder mode" className="builder-hud__exit" onClick={onDisable} type="button">
            <span>Exit</span>
            <CloseIcon />
          </button>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

export function BuilderLayerPanel({ projectId }: BuilderLayerPanelProps) {
  const reduceMotion = useReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const detailsId = useId();
  const project = projects[projectId];
  const selectedLayer = project.layers[selectedIndex] ?? project.layers[0];

  useEffect(() => setSelectedIndex(0), [projectId]);

  const selectRelativeLayer = (index: number, direction: -1 | 1) => {
    const nextIndex = (index + direction + project.layers.length) % project.layers.length;
    setSelectedIndex(nextIndex);
    document.getElementById(`${detailsId}-tab-${nextIndex}`)?.focus();
  };

  const handleLayerKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    selectRelativeLayer(index, event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1);
  };

  const inspectNext = () => setSelectedIndex((current) => (current + 1) % project.layers.length);

  if (!selectedLayer) return null;

  return (
    <section className="builder-layer-panel" data-project={projectId} aria-labelledby={`${detailsId}-title`}>
      <header className="builder-layer-panel__heading">
        <p>Builder inspection · {project.eyebrow}</p>
        <h3 id={`${detailsId}-title`}>{project.title}</h3>
      </header>

      <div aria-label={`${project.eyebrow} system layers`} className="builder-layer-panel__layers" role="tablist" aria-orientation="vertical">
        <span aria-hidden="true" className="builder-layer-panel__spine" />
        {project.layers.map((layer, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              aria-controls={`${detailsId}-detail`}
              aria-selected={selected}
              className="builder-layer-panel__layer"
              data-active={selected ? 'true' : 'false'}
              id={`${detailsId}-tab-${index}`}
              key={layer.name}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={(event) => handleLayerKeyDown(event, index)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <span aria-hidden="true" className="builder-layer-panel__node" />
              <span className="builder-layer-panel__index">{layer.index}</span>
              <span className="builder-layer-panel__layer-copy">
                <strong>{layer.name}</strong>
                <small>{layer.label}</small>
              </span>
              <span aria-hidden="true" className="builder-layer-panel__wave" />
            </button>
          );
        })}
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        aria-live="polite"
        aria-labelledby={`${detailsId}-tab-${selectedIndex}`}
        className="builder-layer-panel__detail"
        id={`${detailsId}-detail`}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        key={`${projectId}-${selectedLayer.name}`}
        role="tabpanel"
        transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="builder-layer-panel__detail-copy">
          <span>{selectedLayer.name} layer</span>
          <p>{selectedLayer.detail}</p>
        </div>
        <ul aria-label="Technologies and system concerns">
          {selectedLayer.stack.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <button className="builder-layer-panel__next" onClick={inspectNext} type="button">
          <span>Inspect next layer</span>
          <ArrowIcon />
        </button>
      </motion.div>
    </section>
  );
}
