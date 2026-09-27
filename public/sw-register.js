// SportTrack service worker registration (loaded as external script to avoid
// the 'unsafe-inline' directive that an inline <script> would require under a
// strict Content-Security-Policy).
if ('serviceWorker' in navigator) {
  // Cache-busting hygiene: always revalidate /sw.js (never trust an HTTP
  // heuristic or install-time cache), and force an update check on load so a
  // deployed cache bump reaches devices on their very next visit.
  let reloadedOnControl = false;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        console.log('SportTrack SW registered:', reg.scope);
        reg.update().catch((err) => console.log('SportTrack SW update check failed:', err));
      })
      .catch((err) => console.log('SportTrack SW reg failed:', err));
  });

  // When a freshly deployed service worker takes control (it skipWaiting()s and
  // claims clients, purging old caches), reload once so the device immediately
  // swaps from the stale cached bundle to the new one instead of continuing on
  // old code until the next visit.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloadedOnControl) {
      reloadedOnControl = true;
      window.location.reload();
    }
  });
}
