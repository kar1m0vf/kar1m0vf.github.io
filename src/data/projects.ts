import type { JourneyMilestone, ProjectMedia, ProjectWorld } from '../types';

const responsiveMedia = (
  family: string,
  widths: readonly number[],
  alt: string,
  caption: string,
  width: number,
  height: number,
): ProjectMedia => ({
  alt,
  avifSrcSet: widths.map((size) => `/media/${family}-${size}.avif ${size}w`).join(', '),
  caption,
  height,
  src: `/media/${family}-${widths.at(-1)}.webp`,
  srcSet: widths.map((size) => `/media/${family}-${size}.webp ${size}w`).join(', '),
  width,
});

export const projectWorlds: readonly ProjectWorld[] = [
  {
    id: 'nar',
    index: '01',
    title: 'Nar Patisserie',
    loopLabel: 'THE USER LOOP',
    statement: 'From “I want cake” to a cart that survives refresh.',
    description:
      'A responsive React storefront built around one continuous shopping flow: discovery, search, filtering, product detail, favourites, and cart.',
    flow: ['Discover', 'Narrow', 'Choose', 'Save', 'Return'],
    decision:
      'State should follow intent. Favourites and cart quantities persist, so route changes and reloads do not erase the customer’s choices.',
    year: '2026',
    role: 'Frontend development · Component structure · Routing · State',
    stack: ['React', 'React Router', 'Vite', 'JavaScript', 'CSS', 'localStorage'],
    theme: 'nar',
    links: [
      { label: 'View live demo', href: 'https://kar1m0vf.github.io/nar-patisserie/', kind: 'primary' },
      { label: 'Open repository', href: 'https://github.com/kar1m0vf/nar-patisserie', kind: 'secondary' },
    ],
    media: [
      responsiveMedia('nar/home', [720, 960, 1440], 'Nar Patisserie home page', 'Home · Brand introduction', 1440, 1000),
      responsiveMedia('nar/catalog', [720, 960, 1440], 'Nar Patisserie product catalog', 'Catalog · Search and filters', 1440, 1000),
      responsiveMedia('nar/product', [720, 960, 1440], 'Nar Patisserie product details page', 'Product · Detail and purchase flow', 1440, 1000),
    ],
  },
  {
    id: 'trendyol',
    index: '02',
    title: 'Trendyol Price Tracker',
    loopLabel: 'THE DATA LOOP',
    statement: 'A bot that keeps watching after the chat goes quiet.',
    description:
      'The Telegram chat is the surface. Behind it, a Python system validates links, stores subscriptions, checks prices on a schedule, and decides when to alert.',
    flow: ['Link', 'Validate', 'Store', 'Schedule', 'Compare', 'Alert'],
    decision:
      'Notification logic respects target prices, discount rules, quiet hours, grouping, and anti-spam controls. The aim is a useful alert, not another noisy bot.',
    year: '2023—Now',
    role: 'Product development · Automation · Data workflows',
    stack: ['Python', 'Aiogram 3', 'SQLite / SQL', 'APScheduler', 'pytest'],
    theme: 'trendyol',
    links: [
      { label: 'Open repository', href: 'https://github.com/kar1m0vf/trendyol-price-tracker', kind: 'primary' },
      { label: 'Open live bot', href: 'https://t.me/trendyolpw_bot', kind: 'secondary' },
    ],
    media: [
      responsiveMedia('trendyol/logo', [560, 960], 'Price Tracker for Trendyol project logo', 'Project identity', 960, 960),
    ],
  },
  {
    id: 'blaster',
    index: '03',
    title: 'Blaster',
    loopLabel: 'THE RUNTIME LOOP',
    statement: 'The game was the fun part. Shipping it like software was the challenge.',
    description:
      'A Python/Pygame desktop application with menus, gameplay state, waves, boss phases, settings, persistence, tests, and a Windows release.',
    flow: ['Input', 'State', 'Wave', 'Boss', 'Retry', 'Persist'],
    decision:
      'One scaled 16:9 game surface keeps controls and layout consistent across desktop resolutions, while settings and highscores survive between runs.',
    releaseNote:
      'A PowerShell release flow runs checks, packages the executable with PyInstaller, assembles a ZIP, and generates SHA256 checksums.',
    year: '2024—Now',
    role: 'Desktop application · Runtime logic · Testing · Packaging',
    stack: ['Python 3.11', 'Pygame', 'JSON', 'pytest', 'PyInstaller', 'PowerShell'],
    theme: 'blaster',
    links: [
      { label: 'Open repository', href: 'https://github.com/kar1m0vf/blaster-game', kind: 'primary' },
    ],
    media: [
      responsiveMedia('blaster/battle', [640, 1280], 'Blaster wave gameplay', 'Gameplay · Neon Belt', 1280, 720),
      responsiveMedia('blaster/menu', [640, 1280], 'Blaster main menu', 'Launch · Main menu', 1280, 720),
      responsiveMedia('blaster/boss', [640, 1280], 'Blaster boss battle', 'Combat · Boss phase', 1280, 720),
    ],
  },
] as const;

export const journeyMilestones: readonly JourneyMilestone[] = [
  { year: '2023', title: 'Tracker begins', detail: 'Background jobs, persistent data, and notification rules.' },
  { year: '2024', title: 'Blaster teaches runtime and state', detail: 'Testing, packaging, and release discipline.' },
  { year: '2025', title: 'DIV Academy winner', detail: '#GeleceyiYazanlar / #GələcəyiYazanlar.' },
  { year: '2025—26', title: 'IT Brains', detail: 'Frontend Development.' },
  { year: '2026', title: 'Nar joins UI and product flow', detail: 'React final project.' },
  { year: '2023—27', title: 'ASOIU · B.Sc.', detail: 'Information Technologies · in progress.' },
] as const;
