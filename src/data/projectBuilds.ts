import type { ProjectBuildStory, ProjectTheme } from '../types';

// Builder-only notes describe verified public implementation and tooling.
export const projectBuilds: Record<ProjectTheme, ProjectBuildStory> = {
  nar: {
    title: 'A shopping intent that survives the route.',
    layers: [
      {
        name: 'Discover',
        label: 'Query · Filter · Route',
        detail:
          'One product dataset feeds catalog cards, detail routes, and cart lookups. The catalog applies category, query, favourites, and sort order in one transformation, so its cards and result count stay consistent. Search matches names, descriptions, categories, tastes, and ingredients.',
        points: [
          'Price ascending, price descending, and alphabetical sorting operate on the filtered collection.',
          'Product IDs connect reusable cards with the corresponding detail route.',
          'Empty results offer a recovery path without resetting the whole browsing flow.',
        ],
        proof: 'An ingredient query and a favourites-only filter can be combined in the same result set.',
        stack: [
          { name: 'React 18 + React DOM', purpose: 'Component rendering and catalog controls.' },
          { name: 'React Router 6', purpose: 'Catalog and product-detail navigation.' },
          { name: 'JavaScript', purpose: 'Combined filtering, sorting, and product lookups.' },
        ],
        source: {
          label: 'Inspect the catalog',
          href: 'https://github.com/kar1m0vf/nar-patisserie/blob/main/src/pages/Catalog.jsx',
        },
      },
      {
        name: 'State',
        label: 'Identity · Quantity · Totals',
        detail:
          'Cart state belongs to the app above the route tree. Stored product IDs resolve against the catalog, and quantities drive the item count, line totals, and overall total. Adding an existing product increments its entry instead of creating a duplicate; changing routes leaves that shared state intact.',
        points: [
          'The detail-page quantity resets to one on product change and is bounded from 1 to 12.',
          'Cart removal, quantity changes, and clearing derive a new order summary from the same state.',
          'Recommendations are a small curated selection; checkout only confirms locally and clears the cart.',
        ],
        proof: 'Re-adding the same product produces one cart entry with an increased quantity.',
        stack: [
          { name: 'React hooks', purpose: 'Shared cart state and detail-page quantity updates.' },
          { name: 'Product data', purpose: 'Stable IDs and a single source for prices and product information.' },
          { name: 'CSS', purpose: 'Responsive cards, purchase controls, and cart layout.' },
        ],
        source: {
          label: 'Inspect product details',
          href: 'https://github.com/kar1m0vf/nar-patisserie/blob/main/src/pages/ProductDetails.jsx',
        },
      },
      {
        name: 'Persist',
        label: 'Restore · Validate · Deploy',
        detail:
          'The cart restores localStorage data at startup and writes changes back through an effect. A separate favourites hook checks for an array of finite numeric IDs and falls back to an empty selection on unreadable JSON. HashRouter keeps deep routes compatible with a static host without server rewrites.',
        points: [
          'Cart and favourites use separate stored selections in the same browser.',
          'Persistence stays above page lifecycles rather than depending on a mounted catalog.',
          'The deployment workflow installs dependencies, builds the app, and publishes the dist artifact.',
        ],
        proof: 'A page reload restores saved choices; malformed favourites data yields an empty selection.',
        stack: [
          { name: 'localStorage + JSON', purpose: 'Browser-local cart and favourites persistence.' },
          { name: 'Vite 5 + React plugin', purpose: 'Development server and production asset build.' },
          { name: 'GitHub Actions + Pages', purpose: 'Automated static-site build and hosting.' },
        ],
        source: {
          label: 'Inspect favourites persistence',
          href: 'https://github.com/kar1m0vf/nar-patisserie/blob/main/src/hooks/useFavorites.js',
        },
      },
    ],
  },
  trendyol: {
    title: 'Observation becomes useful only after a rule agrees.',
    layers: [
      {
        name: 'Observe',
        label: 'Schedule · Cache · Store',
        detail:
          'Background checks and product cards share a ProductSnapshot model. APScheduler coordinates recurring jobs, with a global lock to prevent overlapping checks. Task batches and bounded concurrency control the workload, while SQLite retains subscriptions and price history with migrations and query indexes.',
        points: [
          'Concurrent requests for one product share the same in-flight result.',
          'Successful snapshots have a longer cache lifetime than empty results.',
          'Compact product cards can read a fresh cached snapshot without starting a new request.',
        ],
        proof: 'An async test verifies that five simultaneous requests produce one shared fetch.',
        stack: [
          { name: 'Python + asyncio', purpose: 'Asynchronous tasks, locks, and bounded concurrency.' },
          { name: 'APScheduler', purpose: 'Recurring price checks and maintenance jobs.' },
          { name: 'SQLite / SQL', purpose: 'Durable watchlists, price history, migrations, and indexes.' },
        ],
        source: {
          label: 'Inspect the snapshot service',
          href: 'https://github.com/kar1m0vf/trendyol-price-tracker/blob/refactor-bot-structure/services/product_fetch_service.py',
        },
      },
      {
        name: 'Decide',
        label: 'Rules · Cards · History',
        detail:
          'Alert evaluation is separate from collecting a price. Per-product strategies cover target, drop, range, percentage, and interval rules; pause and resume preserve history. The Telegram interface uses local watchlist numbers, updates cards in place, and loads additional product information only when an expanded card is requested.',
        points: [
          'The presenter escapes HTML and bounds optional detail blocks to the Telegram caption limit.',
          'History charts, product comparisons, and CSV/JSON exports expose the stored observations.',
          'Quiet hours gate delivery; account deletion removes the profile and related local records.',
        ],
        proof: 'Compact and expanded views use one presenter with controlled, bounded detail sections.',
        stack: [
          { name: 'aiogram 3', purpose: 'Telegram handlers, callbacks, inline controls, and message updates.' },
          { name: 'Matplotlib', purpose: 'Charts generated from recorded price history.' },
          { name: 'CSV + JSON', purpose: 'Exporting records and importing supported data.' },
          { name: 'Telegram Stars', purpose: 'Optional payments for access tiers when configured.' },
        ],
        source: {
          label: 'Inspect the card presenter',
          href: 'https://github.com/kar1m0vf/trendyol-price-tracker/blob/refactor-bot-structure/presenters/product_card.py',
        },
      },
      {
        name: 'Deliver',
        label: 'Localize · Recover · Operate',
        detail:
          'Qualified changes are grouped into Telegram updates. Delivery helpers apply timeouts and fall back to text when photo delivery times out. Four locales share checked translation keys. Scheduled backups, owner controls for broken subscriptions, and readiness checks support routine operation beyond the main tracking path.',
        points: [
          'Russian, English, Azerbaijani, and Turkish are checked for matching locale keys.',
          'Rotating technical and action logs keep diagnostics separate; health counters support inspection.',
          'Behavioral tests cover caching, presenters, callbacks, notifications, and payment events.',
        ],
        proof: 'Photo-delivery timeouts have a text fallback rather than losing the entire notification.',
        stack: [
          { name: 'Python logging', purpose: 'Rotating files, configured severity levels, and structured action events.' },
          { name: 'python-dotenv + psutil', purpose: 'Environment configuration and runtime resource diagnostics.' },
          { name: 'pytest', purpose: 'Behavioral and regression checks around the service.' },
          { name: 'Locale dictionaries', purpose: 'Four-language messages with key-consistency checks.' },
        ],
        source: {
          label: 'Inspect notification delivery',
          href: 'https://github.com/kar1m0vf/trendyol-price-tracker/blob/refactor-bot-structure/services/notification_service.py',
        },
      },
    ],
  },
  blaster: {
    title: 'A playable loop backed by a release loop.',
    layers: [
      {
        name: 'Input',
        label: 'Events · Surface · Quality',
        detail:
          'The desktop game renders to a virtual 1280 × 720 surface, then scales it while preserving 16:9 proportions. Mouse and keyboard events feed the same gameplay frame. Three ship and weapon combinations change the run, while quality presets adjust backgrounds and effects independently of difficulty.',
        points: [
          'Interceptor, Vanguard, and Lancer provide twin pulse, plasma, and rail weapons.',
          'Four quality presets coexist with fullscreen, an FPS cap, and an optional FPS counter.',
          'The offline Run Mode progresses through eight waves; the portfolio game is a separate browser adaptation.',
        ],
        proof: 'One virtual surface keeps gameplay and HUD proportions consistent across desktop resolutions.',
        stack: [
          { name: 'Python', purpose: 'Game loop, configuration, and wave progression.' },
          { name: 'Pygame', purpose: 'Input events, display surfaces, rendering, audio, and frame timing.' },
        ],
        source: {
          label: 'Inspect the desktop runtime',
          href: 'https://github.com/kar1m0vf/blaster-game/blob/main/blaster/main.py',
        },
      },
      {
        name: 'Runtime',
        label: 'Collision · Feedback · Recovery',
        detail:
          'An extracted CombatSystem handles projectiles, enemy collisions, shields, and powerups. Damage paths share a brief invulnerability state, preventing overlapping hits from consuming lives immediately. Particles, sound, shake, and boss telegraphs expose combat state; a skippable five-second death replay supports the retry loop.',
        points: [
          'Enemy contact and enemy projectiles consult the same post-hit invulnerability window.',
          'Shields intercept damage, and pickups update the player’s combat state.',
          'Regression checks cover invulnerability timing, bullet consumption, and enemy defeat.',
        ],
        proof: 'A combat test checks that a second hit during invulnerability does not remove another life.',
        stack: [
          { name: 'Pygame sprites + groups', purpose: 'Entities, projectiles, pickups, and collision handling.' },
          { name: 'CombatSystem', purpose: 'Isolated damage resolution and combat feedback.' },
          { name: 'pytest', purpose: 'Combat regression checks and storage behavior tests.' },
        ],
        source: {
          label: 'Inspect the combat system',
          href: 'https://github.com/kar1m0vf/blaster-game/blob/main/blaster/combat.py',
        },
      },
      {
        name: 'Release',
        label: 'Validate · Migrate · Package',
        detail:
          'Settings and highscores live in the OS user-data directory. Loading sanitizes stored values, recovers defaults from unreadable JSON, and migrates legacy saves without replacing an existing save. The release script runs tests by default, builds a windowed executable, and packages documentation with checksums.',
        points: [
          'Persistence covers ship, difficulty, volume, display settings, and scores, not progress within a run.',
          'The Windows build uses a custom icon and a one-file PyInstaller package.',
          'The executable and ZIP receive SHA256 checksums; signing is optional when a certificate is configured.',
        ],
        proof: 'Storage tests cover malformed values, save/load behavior, and legacy migration.',
        stack: [
          { name: 'JSON + pathlib', purpose: 'Validated local saves and user-data paths.' },
          { name: 'PowerShell', purpose: 'Running checks and assembling Windows release artifacts.' },
          { name: 'PyInstaller', purpose: 'Bundling Python, game code, and assets into an executable.' },
          { name: 'SHA256', purpose: 'Integrity checksums for the executable and release ZIP.' },
        ],
        source: {
          label: 'Inspect the release script',
          href: 'https://github.com/kar1m0vf/blaster-game/blob/main/scripts/build_release.ps1',
        },
      },
    ],
  },
};
