# SportTrack — Base44 Dev Environment

## Overview
Pure client-side PWA (Vite + React 19 + TypeScript + Tailwind v4). No backend, no
database server, no external API keys. All data is stored locally in IndexedDB.

## Running the app
```sh
docker compose -f docker-compose.base44.yml up -d --build
```
- Vite dev server on port 3000 (host 0.0.0.0).
- Dependencies installed via `npm ci` on container startup.
- `node_modules` lives in a named volume (not bind-mounted from host).
- Live reload via Vite HMR; if edits don't appear, call `reload_preview`.

## No secrets required
The `.env.example` references `GEMINI_API_KEY` and `APP_URL`, but neither is used
in the source code. The app is 100% local — no credentials needed.

## Notes
- `X-Frame-Options` was removed from the dev server headers so the app can render
  inside the Base44 preview iframe. The production `preview` config still sends it.
- `vite.config.ts` reads `GITHUB_REPOSITORY` for the base path on GitHub Pages;
  locally it falls back to `/`.
- Package manager is **npm** (`package-lock.json`). `bun.lock` exists but is empty.
