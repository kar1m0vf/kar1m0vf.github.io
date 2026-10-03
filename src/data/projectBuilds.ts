import type { ProjectBuildStory, ProjectTheme } from '../types';

// The detailed window and Builder Mode share these repository-backed notes.
export const projectBuilds: Record<ProjectTheme, ProjectBuildStory> = {
  nar: {
    title: 'A shopping intent that survives the route.',
    overview:
      'I built a five-page React storefront prototype: home, catalog, product details, cart, and contacts. The focus was a complete browsing flow, from finding a dessert to keeping a selection for later.',
    scope:
      'This is a frontend prototype. Checkout shows a local confirmation and clears the cart; payments, order delivery, and a backend are outside the current implementation.',
    layers: [
      {
        name: 'Discover',
        label: 'Search · Filter · Route',
        title: 'Find it by more than its name.',
        summary:
          'The catalog combines category, search, sorting, and a favourites-only view. Search also checks taste and ingredients, so a customer can start with what they want rather than a product name.',
        detail:
          'One product dataset supplies the catalog, detail pages, and cart. Catalog controls work together: a category narrows the range, a query searches product information, and sorting changes the order of the remaining items. I kept this filtering in one transformation rather than separate lists, so the result count and cards describe the same selection.',
        points: [
          'Search covers names, descriptions, categories, tastes, and ingredients.',
          'Price and alphabetical sorting work alongside the favourites filter.',
          'Empty results explain how to recover by changing a query or filter.',
        ],
        proof: 'An ingredient search can find a dessert without knowing its name.',
        stack: ['React', 'React Router', 'Product data'],
        source: {
          label: 'Inspect the catalog',
          href: 'https://github.com/kar1m0vf/nar-patisserie/blob/main/src/pages/Catalog.jsx',
        },
      },
      {
        name: 'State',
        label: 'Details · Cart · Quantity',
        title: 'Keep choosing and buying connected.',
        summary:
          'Product details expose ingredients, allergens, format, and quantity before adding an item. The app owns cart state, so product pages and the cart use the same quantities and totals.',
        detail:
          'Each product has its own route with a clear purchase panel and supporting information. Quantity starts at one when the product changes and is bounded on the detail page. Adding the same item again increases its existing cart quantity. The cart resolves saved IDs against the product dataset and derives its item count, line totals, and overall total from that state.',
        points: [
          'Detail pages show taste, ingredients, allergens, price, and product format.',
          'Quantity changes, removal, and clearing the cart update the order summary.',
          'A small curated recommendation section gives the customer a next choice.',
        ],
        proof: 'Adding an existing product changes its quantity instead of creating a second cart entry.',
        stack: ['React state', 'Shared cart', 'JavaScript'],
        source: {
          label: 'Inspect product details',
          href: 'https://github.com/kar1m0vf/nar-patisserie/blob/main/src/pages/ProductDetails.jsx',
        },
      },
      {
        name: 'Persist',
        label: 'Save · Restore · Continue',
        title: 'Make returning feel continuous.',
        summary:
          'Cart IDs and quantities are restored at app startup and saved when they change. A dedicated favourites hook persists the saved selection independently of the current page.',
        detail:
          'The cart lives above the route tree rather than inside a page that disappears during navigation. Its initial state reads localStorage, and subsequent changes are written back. Favourites use a separate hook that checks stored data is an array and keeps finite numeric IDs. Hash-based routing also lets the static GitHub Pages demo open its product and catalog routes without a server rewrite.',
        points: [
          'Favourites and cart quantities survive page reloads in the same browser.',
          'Unreadable stored JSON falls back to an empty saved selection.',
          'Reusable cards, a responsive layout, and Vite support the static demo.',
        ],
        proof: 'A route change does not discard the cart, and a reload restores it.',
        stack: ['localStorage', 'HashRouter', 'Vite'],
        source: {
          label: 'Inspect state and persistence',
          href: 'https://github.com/kar1m0vf/nar-patisserie/blob/main/src/App.jsx',
        },
      },
    ],
  },
  trendyol: {
    title: 'Observation becomes useful only after a rule agrees.',
    overview:
      'I built an independent Telegram service for tracking Trendyol products. It connects personal watchlists, price history, alert strategies, and owner tools, so a product link becomes an ongoing service rather than a one-time price lookup.',
    scope:
      'The live service uses an owner-managed runtime. The public repository documents its architecture and includes handlers, data models, parsing, and tests; the production network scraper is private.',
    layers: [
      {
        name: 'Observe',
        label: 'Normalize · Schedule · Remember',
        title: 'One product, one shared observation.',
        summary:
          'Scheduled checks are locked, batched, and limited in network concurrency. A shared product fetch service caches snapshots and combines simultaneous requests for the same URL.',
        detail:
          'External product data becomes a shared ProductSnapshot used by checks and product cards. URL normalization removes harmless differences while preserving query parameters that select the seller. APScheduler runs background checks; a global lock prevents overlapping runs, and task batches plus a network semaphore bound the work. Fresh cached data can be read without starting another external request.',
        points: [
          'Concurrent requests for the same product share an in-flight fetch.',
          'Empty results expire sooner than successful product snapshots.',
          'SQLite stores watchlists and price history with migrations and query indexes.',
        ],
        proof: 'A test checks that five simultaneous requests use one fetch.',
        stack: ['Python', 'APScheduler', 'SQLite', 'Async cache'],
        source: {
          label: 'Inspect shared product fetching',
          href: 'https://github.com/kar1m0vf/trendyol-price-tracker/blob/refactor-bot-structure/services/product_fetch_service.py',
        },
      },
      {
        name: 'Decide',
        label: 'Rules · History · Quiet hours',
        title: 'Let the person decide what matters.',
        summary:
          'Personal rules separate useful alerts from routine observations. The watchlist stays compact, with in-place product cards and richer details loaded only when requested.',
        detail:
          'A user can choose discount-only, target, range, percentage, or interval-based alerts, then pause a subscription without deleting its history. Quiet hours protect attention before delivery. I kept the regular watchlist in one message with local product numbers instead of internal database IDs. Compact cards prioritize price and the next action; expanded cards request more product information on demand.',
        points: [
          'Per-product controls manage modes, targets, intervals, pause, and resume.',
          'History charts, comparisons, and CSV/JSON exports make collected data useful.',
          'The /delete_me flow removes the user’s profile and related stored data.',
        ],
        proof: 'Opening a compact card reads fresh cache without making a network request.',
        stack: ['aiogram 3', 'SQL', 'Alert rules', 'Product cards'],
        source: {
          label: 'Read the architecture',
          href: 'https://github.com/kar1m0vf/trendyol-price-tracker/blob/refactor-bot-structure/docs/ARCHITECTURE.md',
        },
      },
      {
        name: 'Deliver',
        label: 'Group · Localize · Operate',
        title: 'Build for the days after launch.',
        summary:
          'Qualified changes become grouped Telegram updates. Four locales, scheduled backups, runtime diagnostics, and admin tools support the service beyond its main tracking flow.',
        detail:
          'The bot groups updates instead of sending every qualifying change as a separate interruption. Delivery helpers apply timeouts and fall back to text when photo delivery times out. Russian, English, Azerbaijani, and Turkish share checked locale keys. Owner tools cover reports, access tiers, backups, and broken subscriptions, while readiness checks and behavioral tests cover the paths around the main user flow.',
        points: [
          'Daily SQLite backups and runtime health counters support ongoing operation.',
          'Admins can recheck, pause, or remove broken subscriptions.',
          'Tests cover product parsing, shared fetching, notifications, and payment events.',
        ],
        proof: 'Locale checks require each translation key to exist in all four languages.',
        stack: ['Telegram', 'pytest', 'Four locales', 'Diagnostics'],
        source: {
          label: 'Explore features and checks',
          href: 'https://github.com/kar1m0vf/trendyol-price-tracker/blob/refactor-bot-structure/README.md',
        },
      },
    ],
  },
  blaster: {
    title: 'A playable loop backed by a release loop.',
    overview:
      'I built the original Blaster as a Python and Pygame desktop shooter, from ship selection and wave combat to local saves and Windows packaging. The small game on this page is a separate browser adaptation of that idea.',
    scope:
      'These notes describe the desktop game. Its local Run Mode is an eight-wave offline operation; the portfolio browser version is a shorter, separate experience with a smaller feature set.',
    layers: [
      {
        name: 'Input',
        label: 'Choose · Move · Fire',
        title: 'Keep the playfield consistent.',
        summary:
          'Mouse and keyboard input feed a virtual 1280 × 720 playfield. Scaling preserves its 16:9 proportions, while ship selection and quality settings change how the run feels.',
        detail:
          'Rather than placing gameplay directly in desktop window coordinates, the game uses one virtual 16:9 surface. Borderless fullscreen and windowed presentation preserve that frame. Animated menus introduce three ship frames with different weapons, and a local Run Mode carries the player through eight waves and visual sectors. Quality presets adjust background and effects separately from difficulty.',
        points: [
          'Interceptor, Vanguard, and Lancer use twin pulse, plasma, and rail weapons.',
          'Performance, Balanced, Cinematic, and Enhanced presets control visual effects.',
          'Fullscreen, an FPS cap, difficulty, and an optional FPS counter are configurable.',
        ],
        proof: 'The same virtual playfield keeps HUD and gameplay proportions consistent across resolutions.',
        stack: ['Python', 'Pygame', '1280 × 720', 'Quality presets'],
        source: {
          label: 'Explore the desktop game',
          href: 'https://github.com/kar1m0vf/blaster-game/blob/main/README.md',
        },
      },
      {
        name: 'Runtime',
        label: 'Collide · Telegraph · Retry',
        title: 'Make a hit readable and fair.',
        summary:
          'A dedicated combat system resolves projectiles, enemy collisions, and powerups. Damage feedback includes a short invulnerability window so overlapping hits do not immediately consume more lives.',
        detail:
          'The runtime combines wave progression, special enemies, boss phases, shields, and weapon powerups. Combat handling was extracted into its own module, where hits trigger particles, sound, screen shake, and a brief invulnerability state. Boss telegraphs and HUD contrast help the player read the fight. A skippable five-second death replay provides a final look at the run before retrying.',
        points: [
          'Post-hit invulnerability is shared by enemy collisions and enemy projectiles.',
          'Shields intercept damage, and powerup pickups update the player state.',
          'Combat tests check invulnerability timing, bullet consumption, and enemy defeat.',
        ],
        proof: 'A regression test checks that another hit during invulnerability does not remove a life.',
        stack: ['Pygame sprites', 'CombatSystem', 'State', 'pytest'],
        source: {
          label: 'Inspect the combat system',
          href: 'https://github.com/kar1m0vf/blaster-game/blob/main/blaster/combat.py',
        },
      },
      {
        name: 'Release',
        label: 'Save · Test · Package',
        title: 'Let a run survive the executable.',
        summary:
          'Settings and highscores live in the OS user-data directory. A PowerShell release script runs tests, builds the Windows executable, packages documentation, and writes SHA256 checksums.',
        detail:
          'I moved saves out of the source folder into the user’s app-data directory and added migration for older JSON files. Loading sanitizes names, scores, booleans, and settings, with defaults for unreadable data. The release script invokes pytest, builds a windowed PyInstaller executable with a custom icon, and assembles a documented ZIP. Signing is optional when a certificate is configured.',
        points: [
          'Ship choice, difficulty, volume, display settings, and highscores persist locally.',
          'Storage tests cover malformed data, save/load behavior, and legacy migration.',
          'Both the executable and release ZIP receive SHA256 checksums.',
        ],
        proof: 'Legacy saves migrate to the app-data directory without replacing an existing save.',
        stack: ['JSON', 'PowerShell', 'PyInstaller', 'SHA256'],
        source: {
          label: 'Inspect the release script',
          href: 'https://github.com/kar1m0vf/blaster-game/blob/main/scripts/build_release.ps1',
        },
      },
    ],
  },
};
