# Kamil Kerimov Portfolio

Static multi-page portfolio website.

## Pages
- `index.html` - homepage
- `about.html` - personal profile
- `projects.html` - project showcase
- `contact.html` - contact and message form

## Main config
Edit personal data in:
- `assets/js/site-config.js`

Fields:
- `name`
- `brand`
- `initials`
- `email` / `emailHref`
- `telegram` / `telegramHref`
- `github` / `githubHref`
- `linkedin` / `linkedinHref`
- `resumeHref`
- `resumeLabel`

## Resume file
1. Put your resume in `assets/resume/`
2. Update `resumeHref` in `assets/js/site-config.js`

Example:
- `resumeHref: 'assets/resume/kamil-kerimov-cv.pdf'`

## Contact form
The message form currently uses `mailto` fallback from `assets/js/main.js`.

If needed, connect it later to:
- Formspree
- EmailJS
- custom backend endpoint

## Run locally
Open `index.html` directly in browser or use any static local server.

## Theme
Theme selection is stored in `localStorage` under the key `site-theme`.
