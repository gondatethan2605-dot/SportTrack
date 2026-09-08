import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getWorkoutSettings, resolveThemeMode, themeColorFor } from './utilsSettings';

// LOT 6 — item 16: apply the saved visual theme (<html data-theme>/data-accent)
// synchronously BEFORE the first React render so the very first paint already
// uses the right appearance (no flash). 'system' is resolved against the OS
// colour-scheme preference here; App.tsx keeps it in sync while the app runs.
function applyAppearanceBeforeRender(): void {
  const settings = getWorkoutSettings();
  const html = document.documentElement;
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)')?.matches ?? false;
  html.dataset.theme = resolveThemeMode(settings.themeMode, prefersLight);
  html.dataset.accent = settings.accentColor;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    themeColorFor(resolveThemeMode(settings.themeMode, prefersLight))
  );
}

applyAppearanceBeforeRender();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);