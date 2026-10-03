import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useSound } from '../audio/SoundProvider';
import { projectBuilds } from '../data/projectBuilds';
import type { ProjectWorld } from '../types';
import './BuilderMode.css';

export interface BuilderModeHudProps {
  enabled: boolean;
  onDisable: () => void;
  activeSection?: string | null;
}

export interface BuilderLayerPanelProps {
  project: ProjectWorld;
}

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
  const { playSound } = useSound();
  const reduceMotion = useReducedMotion();
  const sectionKey = activeSection?.toLowerCase() ?? '';
  const isProjectSection = sectionKey === 'nar' || sectionKey === 'trendyol' || sectionKey === 'blaster';
  const accent = isProjectSection
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
            <span>{isProjectSection ? 'Inspecting' : 'Lens ready'}</span>
            <strong>{isProjectSection ? getSectionLabel(activeSection) : 'Three project systems'}</strong>
          </div>
          <button
            aria-label="Turn off Builder mode"
            className="builder-hud__exit"
            onClick={() => {
              playSound('toggle-off');
              onDisable();
            }}
            type="button"
          >
            <span>Exit</span>
            <CloseIcon />
          </button>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

export function BuilderLayerPanel({ project }: BuilderLayerPanelProps) {
  const { playSound } = useSound();
  const reduceMotion = useReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const detailsId = useId();
  const projectId = project.id;
  const build = projectBuilds[projectId];
  const selectedLayer = build.layers[selectedIndex] ?? build.layers[0];
  const nextIndex = (selectedIndex + 1) % build.layers.length;
  const nextLayer = build.layers[nextIndex] ?? build.layers[0];

  useEffect(() => setSelectedIndex(0), [projectId]);

  const selectRelativeLayer = (index: number, direction: -1 | 1) => {
    const nextIndex = (index + direction + build.layers.length) % build.layers.length;
    playSound('select');
    setSelectedIndex(nextIndex);
    document.getElementById(`${detailsId}-tab-${nextIndex}`)?.focus();
  };

  const handleLayerKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    selectRelativeLayer(index, event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1);
  };

  const inspectNext = () => {
    playSound('select');
    setSelectedIndex(nextIndex);
  };

  if (!selectedLayer || !nextLayer) return null;

  return (
    <section className="builder-layer-panel" data-project={projectId} aria-labelledby={`${detailsId}-title`}>
      <header className="builder-layer-panel__heading">
        <p>Builder inspection · {project.title}</p>
        <h3 id={`${detailsId}-title`}>{build.title}</h3>
      </header>

      <div aria-label={`${project.title} system layers`} className="builder-layer-panel__layers" role="tablist">
        <span aria-hidden="true" className="builder-layer-panel__spine" />
        {build.layers.map((layer, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              aria-controls={`${detailsId}-detail`}
              aria-selected={selected}
              className="builder-layer-panel__layer"
              data-active={selected ? 'true' : 'false'}
              id={`${detailsId}-tab-${index}`}
              key={layer.name}
              onClick={() => {
                if (index !== selectedIndex) playSound('select');
                setSelectedIndex(index);
              }}
              onKeyDown={(event) => handleLayerKeyDown(event, index)}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <span aria-hidden="true" className="builder-layer-panel__node" />
              <span className="builder-layer-panel__index">{String(index + 1).padStart(2, '0')}</span>
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
          <span>{selectedLayer.name} layer · {String(selectedIndex + 1).padStart(2, '0')} / {String(build.layers.length).padStart(2, '0')}</span>
          <p>{selectedLayer.detail}</p>
        </div>
        <ul className="builder-layer-panel__notes">
          {selectedLayer.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
        <p className="builder-layer-panel__proof">
          <span>In practice</span>
          <strong>{selectedLayer.proof}</strong>
        </p>
        <dl aria-label={`${selectedLayer.name} technologies and roles`} className="builder-layer-panel__stack">
          {selectedLayer.stack.map((technology) => (
            <div key={technology.name}><dt>{technology.name}</dt><dd>{technology.purpose}</dd></div>
          ))}
        </dl>
        <a className="builder-layer-panel__source" href={selectedLayer.source.href} rel="noreferrer" target="_blank">
          {selectedLayer.source.label}<ArrowIcon />
        </a>
        <button className="builder-layer-panel__next" onClick={inspectNext} type="button">
          <span>Next · {nextLayer.name}</span>
          <small>{String(nextIndex + 1).padStart(2, '0')} / {String(build.layers.length).padStart(2, '0')}</small>
          <ArrowIcon />
        </button>
      </motion.div>
    </section>
  );
}
