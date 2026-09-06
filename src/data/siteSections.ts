export type SiteSectionId =
  | 'top'
  | 'method'
  | 'nar'
  | 'trendyol'
  | 'blaster'
  | 'journey'
  | 'contact';

export type SiteSectionTheme = 'blue' | 'nar' | 'trendyol' | 'blaster';
export type KControlAccent = 'neutral' | 'nar' | 'tracker' | 'blaster';

export interface KControlSectionMeta {
  accent: KControlAccent;
  index: string;
  label: string;
}

export interface SiteSection {
  control?: KControlSectionMeta;
  href: `#${SiteSectionId}`;
  id: SiteSectionId;
  index: string;
  keywords: readonly string[];
  label: string;
  theme: SiteSectionTheme;
}

export const siteSections = [
  {
    control: { accent: 'neutral', index: '01', label: 'Start' },
    href: '#top',
    id: 'top',
    index: '01',
    keywords: ['home', 'intro', 'kamil'],
    label: 'Start',
    theme: 'blue',
  },
  {
    href: '#method',
    id: 'method',
    index: '02',
    keywords: ['about', 'method', 'curiosity', 'kamil'],
    label: 'About',
    theme: 'blue',
  },
  {
    control: { accent: 'nar', index: '02', label: 'Nar Patisserie' },
    href: '#nar',
    id: 'nar',
    index: '03',
    keywords: ['frontend', 'react', 'storefront', 'interface'],
    label: 'Nar',
    theme: 'nar',
  },
  {
    control: { accent: 'tracker', index: '03', label: 'Price Tracker' },
    href: '#trendyol',
    id: 'trendyol',
    index: '04',
    keywords: ['python', 'automation', 'telegram', 'signal'],
    label: 'Trendyol',
    theme: 'trendyol',
  },
  {
    control: { accent: 'blaster', index: '04', label: 'Blaster' },
    href: '#blaster',
    id: 'blaster',
    index: '05',
    keywords: ['pygame', 'runtime', 'game', 'testing'],
    label: 'Blaster',
    theme: 'blaster',
  },
  {
    control: { accent: 'neutral', index: '05', label: 'Journey' },
    href: '#journey',
    id: 'journey',
    index: '06',
    keywords: ['education', 'experience', 'timeline', 'baku'],
    label: 'Journey',
    theme: 'blue',
  },
  {
    href: '#contact',
    id: 'contact',
    index: '07',
    keywords: ['email', 'telegram', 'github', 'linkedin'],
    label: 'Contact',
    theme: 'blue',
  },
] as const satisfies readonly SiteSection[];

export type KControlSection = SiteSection & { control: KControlSectionMeta };

export const kControlSections = siteSections.filter(
  (section): section is (typeof siteSections)[number] & KControlSection => 'control' in section,
);

export function resolveKControlSection(activeSection: SiteSectionId): SiteSectionId {
  if (activeSection === 'method') return 'top';
  if (activeSection === 'contact') return 'journey';
  return activeSection;
}
