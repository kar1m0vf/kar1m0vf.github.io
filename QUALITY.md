# Portfolio Quality Stack

This repository now includes a full quality pipeline around the static website.

## Tooling

- `TypeScript`: typed source and strict type checks.
- `Vitest`: fast unit tests for deterministic logic.
- `Playwright`: end-to-end browser tests for real user flows (desktop + mobile).
- `Lighthouse CI`: performance, accessibility, SEO, and best-practices gates.
- `GitHub Actions`: automatic quality checks on pull requests and pushes.

## Scripts

- `npm run build:ts` - compile TypeScript build targets into runtime assets.
- `npm run typecheck` - strict static type validation.
- `npm run playwright:install` - install Chromium for Playwright inside this repository.
- `npm run test:unit` - run unit tests.
- `npm run test:unit:ci` - run unit tests with JSON summary output.
- `npm run test:e2e` - run end-to-end browser tests.
- `npm run test:e2e:ci` - run end-to-end tests with CI reporting artifacts.
- `npm run lhci` - run Lighthouse CI assertions.
- `npm run quality:evidence` - generate `assets/data/quality-evidence.json` from quality artifacts.
- `npm run quality` - execute the full quality gate locally.

## Workflow Expectations

1. Make code changes.
2. Run `npm run quality`.
3. Open PR.
4. Ensure the `Quality Gate` workflow passes before merge.

## Homepage Evidence Surface

- `index.html` includes a `CI Evidence` section that reads `assets/data/quality-evidence.json`.
- The CI workflow regenerates this JSON after successful checks.
- On pushes to `main/master`, CI commits refreshed evidence snapshot back to the repository.
- Playwright is configured with `PLAYWRIGHT_BROWSERS_PATH=0` to keep browser binaries in-repo.
- Playwright artifacts are written to `test-results/playwright-artifacts` so `vitest-report.json` is not overwritten.
