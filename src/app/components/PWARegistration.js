'use client';

import { useEffect } from 'react';

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Never leave a service worker active in development; stale Cache-First /_next/static chunks
    // break Next.js HMR and leave dynamic tool pages stuck loading.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});

      if (typeof caches !== 'undefined') {
        caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys.filter((k) => k.startsWith('localpdf-')).map((k) => caches.delete(k))
            )
          )
          .catch(() => {});
      }
      return;
    }

    const registerSw = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('LocalPDF Service Worker registered: ', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed: ', error);
        });
    };

    if (document.readyState === 'complete') {
      registerSw();
      return;
    }

    window.addEventListener('load', registerSw);
    return () => window.removeEventListener('load', registerSw);
  }, []);

  return null;
}
