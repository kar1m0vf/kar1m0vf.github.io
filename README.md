# Kamil Kerimov — The Whole Loop

An editorial, single-page portfolio about building the whole software loop: the interface people use, the workflows behind it, and the tests and release work that keep both honest.

Live site: https://kar1m0vf.github.io/

## Stack

- React 19, TypeScript, and Vite
- Motion for accessible entrance and scroll reveals
- Three.js for a live blue glass thread, continuous shape morphs, and a scroll-directed camera
- Locally bundled Manrope and Instrument Serif fonts
- Responsive AVIF/WebP project media
- Vitest, Playwright, axe, and Lighthouse CI
- GitHub Actions deployment to GitHub Pages

## Local development

```bash
npm ci
npm run dev
```

The local site is available at `http://127.0.0.1:5173`.

## Quality commands

```bash
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
npm run lhci
```

`npm run optimize:media` rebuilds responsive AVIF and WebP variants from the curated source images in `assets/media`.

## Portfolio principles

- The opening introduces Kamil and his curiosity before selected projects.
- Every project is explained through a real product loop: user, data, or runtime.
- Real project interfaces keep their natural aspect ratio and open in a full-view lightbox.
- The Trendyol chapter presents an honest system flow until real Telegram captures are available.
- The blue thread moves from a dimensional knot into an aperture and an open strand during native scrolling. Chapter controls and “Skip intro” provide direct navigation.
- The WebGL scene loads separately from the interface. Its resolution adapts to slower rendering, and it pauses outside the viewport and when the tab is hidden.
- WebGL is decorative; all essential information remains semantic HTML. Unsupported or lost graphics contexts use an SVG fallback.
- Mobile keeps the 3D scene with a lower rendering budget. Reduced motion shows the story in normal document flow with a still sculpture.
- The resume PDF remains repository context and is intentionally not linked from the website.
