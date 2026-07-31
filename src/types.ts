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
}

export interface JourneyMilestone {
  year: string;
  title: string;
  detail: string;
}
