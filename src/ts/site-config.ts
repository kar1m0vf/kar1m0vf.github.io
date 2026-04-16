type AmbientParticlesMode = 'auto' | 'off' | 'lite' | 'full';

interface SiteEffectsConfig {
  ambientParticles: AmbientParticlesMode;
  customCursor: boolean;
  pointerEffects: boolean;
  pageTransitions: boolean;
  perfLite: boolean;
}

interface SiteConfig {
  name: string;
  brand: string;
  initials: string;
  roleLine: string;
  email: string;
  emailHref: string;
  telegram: string;
  telegramHref: string;
  github: string;
  githubHref: string;
  linkedin: string;
  linkedinHref: string;
  projectPrimaryLabel: string;
  effects: SiteEffectsConfig;
}

const siteConfig: SiteConfig = {
  name: 'Kamil Kerimov',
  brand: 'Kamil Kerimov',
  initials: 'KK',
  roleLine: 'Full-Stack Web Developer | Python Engineer | Telegram Bot Developer',
  email: 'kamil16092006@gmail.com',
  emailHref: 'mailto:kamil16092006@gmail.com',
  telegram: '@kar1m0vf',
  telegramHref: 'https://t.me/kar1m0vf',
  github: 'github.com/kar1m0vf',
  githubHref: 'https://github.com/kar1m0vf',
  linkedin: 'linkedin.com/in/kamil-kerimov',
  linkedinHref: 'https://linkedin.com/in/kamil-kerimov',
  projectPrimaryLabel: 'Featured Projects',
  effects: {
    ambientParticles: 'auto',
    customCursor: false,
    pointerEffects: true,
    pageTransitions: false,
    perfLite: false,
  },
};

(window as Window & { siteConfig?: SiteConfig }).siteConfig = siteConfig;
