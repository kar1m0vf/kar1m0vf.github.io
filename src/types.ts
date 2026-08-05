export type ProjectTheme = 'nar' | 'trendyol' | 'blaster';

export interface ProjectLink {
  label: string;
  href: string;
  kind: 'primary' | 'secondary';
}

export interface ProjectMedia {
  alt: string;
  avifSrcSet: string;
  caption: string;
  height: number;
  src: string;
  srcSet: string;
  width: number;
}

export interface SignalGate {
  detail: string;
  id: 'memory' | 'rule' | 'attention';
  label: string;
}

export interface PriceObservatoryConfig {
  facts: readonly {
    detail: string;
    label: string;
  }[];
  gates: readonly SignalGate[];
  instruction: string;
  sampleLabel: string;
  simulation: {
    currentPrice: number;
    max: number;
    min: number;
    previousPrice: number;
    step: number;
    targetPrice: number;
    time: string;
  };
  title: string;
}

export type TrackerSignalOutcome = 'memory' | 'held' | 'released';

export interface TrackerSignalResult {
  currentPrice: number;
  outcome: TrackerSignalOutcome;
}

export type TrackerHandoffState =
  | { status: 'idle' }
  | ({ status: 'pending' } & TrackerSignalResult)
  | ({ status: 'settled' } & TrackerSignalResult);

export interface ProjectWorld {
  id: ProjectTheme;
  index: string;
  title: string;
  loopLabel: string;
  statement: string;
  description: string;
  flow: readonly string[];
  decision: string;
  year: string;
  role: string;
  stack: readonly string[];
  releaseNote?: string;
  theme: ProjectTheme;
  links: readonly ProjectLink[];
  media: readonly ProjectMedia[];
  observatory?: PriceObservatoryConfig;
}

export interface JourneyMilestone {
  year: string;
  title: string;
  detail: string;
}
