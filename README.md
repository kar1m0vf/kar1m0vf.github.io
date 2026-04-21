# Kamil Kerimov Portfolio

Personal portfolio repository for Kamil Kerimov, also known as `kar1m0vf`.
Live site: https://kar1m0vf.github.io/

Static portfolio website for GitHub Pages with a product-style homepage, TypeScript-backed logic, automated tests, and CI quality gates.

## Authorship Proof

This portfolio is designed and developed by Kamil Kerimov (`kar1m0vf`).

- Source repository: https://github.com/kar1m0vf/kar1m0vf.github.io
- Commit history: https://github.com/kar1m0vf/kar1m0vf.github.io/commits/main
- Live site: https://kar1m0vf.github.io/
- CI quality workflow: https://github.com/kar1m0vf/kar1m0vf.github.io/actions

## Stack

- HTML/CSS/JavaScript for the published site
- TypeScript for typed source modules
- Vitest for unit tests
- Playwright for end-to-end checks
- Lighthouse CI for performance and accessibility gates
- GitHub Actions for automated validation

## Local Setup

```bash
npm ci
npm run build:ts
npm run typecheck
npm run playwright:install
```

To preview the site locally:

```bash
npx http-server . -p 4173 -c-1 --silent
```

Then open `http://127.0.0.1:4173`.

## Useful Scripts

- `npm run build:ts` - compile TypeScript output into runtime assets
- `npm run typecheck` - run strict type validation
- `npm run repo:ready` - run the fast pre-push local checks (`build:ts`, `typecheck`, `test:unit`)
- `npm run test:unit` - run Vitest unit tests
- `npm run test:e2e` - run Playwright end-to-end tests
- `npm run lhci` - run Lighthouse CI assertions
- `npm run quality` - run the full local quality pipeline
- `npm run icons:generate` - rebuild favicon, PWA, Apple touch, and OG image assets

## Repository Structure

- `assets/` - published frontend assets
- `src/ts/` - typed source modules
- `tests/` - unit and end-to-end tests
- `scripts/` - local automation scripts
- `.github/workflows/quality.yml` - CI quality gate workflow

## Notes

- Playwright browsers are stored in the local ignored directory `.playwright-browsers/`.
- For a quick safe pre-push pass that stays inside the repository, use `npm run repo:ready`.
- Icon generation uses a locally installed Edge or Chrome executable and rebuilds the tracked assets in `assets/icons/`.
- The CI workflow regenerates `assets/data/quality-evidence.json` after successful quality checks on push to `main` or `master`.
