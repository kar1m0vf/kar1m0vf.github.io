# Kamil Kerimov — The Whole Loop

A personal, single-page portfolio connecting Kamil's curiosity, projects, and life in Baku through one blue thread.

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

- One lazy-loaded Three.js canvas continues the opening’s blue glass cable through About, the projects, and Journey. The material factory is shared with the original hero; the cable morphs continuously between a loose loop, a product orbit, a deep helix, a spatial signal, and an open strand.
- The midpoint between Nar and Trendyol has a reversible native-scroll passage: the camera centers, enters the helix, crosses its last coil, and then reveals the price scene. Geometry and camera space change only in the dark exit interval. A direct next-project link remains available during the passage. Reduced motion and unavailable WebGL use normal flow. Keyboard-accessible About tabs remain available.
- Project introductions use everyday language; implementation notes sit inside expandable details.
- Nar places a complete, softly tilted product capture inside the glass orbit; route tabs, captions, and the persistent favourite demo are separate from the image. Trendyol distributes the live price, target/quiet-hours controls, and notification into three spatial stops. A light follows the actual simulated decision along the thread; all prices are illustrative and no real notification is sent. Engineering details stay available in disclosures.
- The original Mini Blaster remains playable in place, with keyboard and touch controls and a locally saved best score. On desktop its field uses roughly half the content width; mobile uses the available width. The rounded playfield has a detached HUD and controls; game coordinates, sprites, scoring, and inputs are unchanged. There is no fullscreen/expand mode. Escape pauses the game.
- The middle scene stops its idle animation offscreen, when the document is hidden, and while Blaster is running. Layout is measured after scroll/resize/content changes, not every rendered frame. GPU resources are released on cleanup.
- Journey introduces education, volunteer selection, music, and languages alongside the existing Baku image. The closing thread returns to its opening form beside direct contact links.
- Real project interfaces keep their natural aspect ratio and open in a full-view lightbox.
- The Trendyol chapter presents an honest system flow until real Telegram captures are available.
- The blue thread moves from a dimensional knot into an aperture and an open strand during native scrolling. Chapter controls and K Control provide direct navigation.
- The WebGL scene loads separately from the interface. Its resolution adapts to slower rendering, and it pauses outside the viewport and when the tab is hidden.
- WebGL is decorative; all essential information remains semantic HTML. Unsupported or lost graphics contexts use an SVG fallback.
- Mobile keeps the 3D scene with a lower rendering budget. Reduced motion shows the story in normal document flow with a still sculpture.
- The resume PDF remains repository context and is intentionally not linked from the website.
- Deep links settle under the loader before the requested section is revealed. Storage-dependent demos remain usable when browser storage is unavailable.
- The quiet loading screen uses the existing type and a small blue filament to show resource readiness; it keeps the media/font preparation and timeout fallback.
- K Control opens with its floating trigger or Ctrl/Cmd+K. All seven chapters are available, with direct jumps, keyboard focus restoration, Escape/outside dismissal, and an inset sheet on mobile. Builder Mode and sound preferences survive reloads, with guarded storage access.
- While K Control is open, the thread renderers rest and Blaster pauses. The scene resumes when the controls close; gameplay resumes only on the visitor’s request. Interface pictograms use the shared SVG family.
- In-page navigation uses a blue light veil: the page jumps once while covered, scroll-driven springs snap to the destination, and the new scene renders before the reveal. Browser history and destination focus are preserved; reduced motion skips the effect.
- The loading filament hands over to a small glass loop in the existing Hero canvas, which unfolds into the knot. Open thread poses continue beyond the frame without changing the original curve vertices.
