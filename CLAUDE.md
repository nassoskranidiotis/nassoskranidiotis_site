# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static personal website for Nassos Kranidiotis, hosted on GitHub Pages at `nassoskranidiotis.com`. No build step, no package manager — edit files directly and push to deploy.

## Structure

- `index.html` — single-page application with all sections (Home, Profile, Projects, Science & Art, Follow Me)
- `style.css` — custom styles layered on top of Bootstrap 5
- `script.js` — scroll progress/navbar state, count-up stats, card cursor spotlight, the hero eclipsing-binary canvas simulation, and AOS initialization
- `assets/` — images (`.webp`, `.png`) and video (`vb1.mp4`)
- `gi/index.html` — redirect page to an external Glycemic Index app
- `CNAME` — custom domain configuration for GitHub Pages

## Key dependencies (CDN, no install needed)

- Bootstrap 5.3.3 (CSS + JS bundle; ScrollSpy drives the active nav link)
- Bootstrap Icons 1.10.5
- AOS (Animate On Scroll) 2.3.4
- Google Fonts: Inter (body), Fraunces (display/italic), JetBrains Mono (labels, data)

## Local development

Open `index.html` directly in a browser, or serve it with any static file server:

```bash
python3 -m http.server 8080
```

## Deployment

Push to the `main` branch — GitHub Pages deploys automatically. The custom domain is configured via `CNAME` and DNS A records pointing to GitHub's IPs (see `notes.txt`).

## Architecture notes

- The site is a single HTML file structured as anchor-linked sections (`#home`, `#profile`, `#projects`, `#scienceart`, `#followme`).
- The video background (`assets/vb1.mp4`) uses `position: fixed; z-index: -1` so all sections scroll over it.
- The `#scienceart` section uses a parallax-style fixed background image (`scienceart-bg.webp`) with a dark overlay via `::before` pseudo-element.
- The hero holds a `<canvas>` (`#binary-canvas`) that animates an eclipsing binary star system and traces its light curve along the bottom — a nod to the B.Sc. research. It pauses when scrolled out of view and renders a single static frame under `prefers-reduced-motion`.
- Design tokens live in `:root` in `style.css`: blue `--accent` (hot star) and amber `--accent-2` (cool star) are the only two accent colours; keep new UI within them.
- AOS is initialized once, at the bottom of `script.js`, and is disabled when the user prefers reduced motion.
