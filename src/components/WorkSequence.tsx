import { Fragment, useCallback, useRef, useState } from 'react';
import type { TrackerHandoffState, TrackerSignalResult } from '../types';
import { projectWorlds } from '../data/projects';
import { ProjectChapter } from './ProjectChapter';
import { ThreadPassage } from './thread/ThreadPassage';

const handoffStorageKey = 'portfolio:tracker-blaster:v1';
const idleHandoff: TrackerHandoffState = { status: 'idle' };

const isSignalOutcome = (value: unknown): value is TrackerSignalResult['outcome'] => (
  value === 'memory' || value === 'held' || value === 'released'
);

const readHandoff = (): TrackerHandoffState => {
  if (typeof window === 'undefined') return idleHandoff;

  try {
    const rawValue = window.sessionStorage.getItem(handoffStorageKey);
    if (!rawValue) return idleHandoff;

    const value = JSON.parse(rawValue) as Record<string, unknown>;
    if (
      (value.status === 'pending' || value.status === 'settled')
      && typeof value.currentPrice === 'number'
      && Number.isFinite(value.currentPrice)
      && isSignalOutcome(value.outcome)
    ) {
      return {
        status: 'settled',
        currentPrice: value.currentPrice,
        outcome: value.outcome,
      };
    }
  } catch {
    // A blocked or malformed session store should never break the portfolio.
  }

  return idleHandoff;
};

const writeHandoff = (value: TrackerHandoffState) => {
  if (typeof window === 'undefined') return;

  try {
    if (value.status === 'idle') {
      window.sessionStorage.removeItem(handoffStorageKey);
      return;
    }
    window.sessionStorage.setItem(handoffStorageKey, JSON.stringify(value));
  } catch {
    // The choreography remains usable when storage is unavailable.
  }
};

interface WorkSequenceProps {
  builderMode: boolean;
}

export function WorkSequence({ builderMode }: WorkSequenceProps) {
  const [handoff, setHandoff] = useState<TrackerHandoffState>(readHandoff);
  const handoffRef = useRef(handoff);

  const storeHandoff = useCallback((result: TrackerSignalResult) => {
    const current = handoffRef.current;
    if (
      current.status === 'settled'
      && current.currentPrice === result.currentPrice
      && current.outcome === result.outcome
    ) return;

    const next: TrackerHandoffState = { status: 'settled', ...result };
    handoffRef.current = next;
    writeHandoff(next);
    setHandoff(next);
  }, []);

  const resetHandoff = useCallback(() => {
    if (handoffRef.current.status === 'idle') return;
    handoffRef.current = idleHandoff;
    writeHandoff(idleHandoff);
    setHandoff(idleHandoff);
  }, []);

  return (
    <div className="work" id="work">
      <div className="work-intro section-shell"><p>A few things I’ve put into the world.</p><span>Selected work · 01—03</span></div>
      {projectWorlds.map((project) => (
        <Fragment key={project.id}>
        {project.id === 'trendyol' ? <ThreadPassage /> : null}
        <ProjectChapter
          builderMode={builderMode}
          handoff={project.theme === 'nar' ? null : handoff}
          onHandoffReset={project.theme === 'trendyol' ? resetHandoff : null}
          onHandoffResolved={project.theme === 'trendyol' ? storeHandoff : null}
          project={project}
        />
        </Fragment>
      ))}
    </div>
  );
}
