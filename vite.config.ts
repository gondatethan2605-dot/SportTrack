import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// LOT 10 — GitHub Pages support.
//
// The app is deployed under `https://<account>.github.io/<repo>/`, NOT at the
// domain root, so Vite needs a base path. The repo slug is read GLOBALLY at
// build time from GITHUB_REPOSITORY (set by GitHub Actions to "owner/repo") —
// no account or repo name is hard-coded here. Locally (no GITHUB_REPOSITORY)
// the base falls back to `/`, so `npm run dev`, `npm run preview` and the
// default `npm run build` behave exactly as before.
const base = (() => {
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo && repo.includes('/')) {
    const slug = repo.split('/')[1];
    return `/${slug}/`;
  }
  return '/';
})();

export default defineConfig(() => {
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      },
    },
    preview: {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
    },
  };
});
