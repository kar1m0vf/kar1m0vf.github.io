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
    loopLabel: 'A little attention to detail',
    statement: 'Something sweet. A little easier to find.',
    description:
      'A patisserie storefront for discovering a favourite, finding the right cake, and picking up where you left off.',
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
    loopLabel: 'A little less busywork',
    statement: 'Let the price come to you.',
    description:
      'Send a product link, choose a price, and let a Telegram bot keep an eye on it. Useful updates, with quiet hours when you need them.',
    flow: ['Link', 'Normalize', 'Remember', 'Check', 'Decide', 'Deliver'],
    decision:
      'I separated observation from interruption: background checks collect data; personal rules decide when the system should speak.',
    releaseNote:
      'Persistent history, quiet hours, grouped delivery, diagnostics, backups, and four locales make it a service rather than a one-off script.',
    year: '2023—Now',
    role: 'Product engineering · Python automation · Persistence · Operations',
    stack: ['Python', 'aiogram 3', 'SQLite / SQL', 'APScheduler', 'pytest'],
    theme: 'trendyol',
    links: [
      { label: 'Open repository', href: 'https://github.com/kar1m0vf/trendyol-price-tracker', kind: 'primary' },
      { label: 'Open live bot', href: 'https://t.me/trendyolpw_bot', kind: 'secondary' },
    ],
    media: [
      responsiveMedia('trendyol/logo', [560, 960], 'Price Tracker for Trendyol project logo', 'Project identity', 960, 960),
    ],
    observatory: {
      title: 'Try a price check',
      instruction: 'Set your target. See what happens.',
      sampleLabel: 'Interactive demo · illustrative prices',
      simulation: {
        currentPrice: 1099,
        previousPrice: 1159,
        targetPrice: 1130,
        min: 1000,
        max: 1350,
        step: 1,
        time: '23:40',
      },
      gates: [
        { id: 'memory', label: 'Remember', detail: 'Save the new price.' },
        { id: 'rule', label: 'Match', detail: 'Compare it with your target.' },
        { id: 'attention', label: 'Protect', detail: 'Check quiet hours before delivery.' },
      ],
      facts: [
        { label: 'Remember', detail: 'SQLite keeps watchlists, settings, migrations, indexes, and price history durable.' },
        { label: 'Observe', detail: 'Scheduled checks use locking, batches, caching, and network limits to control external work.' },
        { label: 'Decide', detail: 'Target, drop, range, percentage, interval, pause, and quiet-hour rules control delivery.' },
      ],
    },
  },
  {
    id: 'blaster',
    index: '03',
    title: 'Blaster',
    loopLabel: 'Blaster · A little room to play',
    statement: 'I made a game. Your turn to play.',
    description:
      'Dodge, shoot, and see how long you last. This short browser version is inspired by my original desktop game.',
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
  { year: '2023—27', title: 'ASOIU · Information Technologies', detail: 'B.Sc. in progress · software, data, and systems foundation.' },
  { year: '2023', title: 'Price Tracker becomes a service', detail: 'Python automation, persistent state, scheduled jobs, and alert rules.' },
  { year: '2024', title: 'Blaster expands into runtime', detail: 'Game state, regression testing, Windows packaging, and release checks.' },
  { year: '2025', title: 'Training and recognition', detail: 'Holberton Software Engineering training · DIV Academy project winner.' },
  { year: '2025—26', title: 'IT Brains · Frontend Development', detail: 'React, product flows, and interface engineering.' },
  { year: '2026', title: 'Nar connects product and UI', detail: 'A React storefront from discovery to a persistent cart.' },
] as const;
