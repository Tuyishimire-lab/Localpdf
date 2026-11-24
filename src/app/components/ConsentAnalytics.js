'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import { CONSENT_STORAGE_KEY, CONSENT_EVENT } from './CookieConsent';
import { isAirGapped, subscribeAirGap, getAirGapServerSnapshot } from '../../lib/airgap';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-96QW4FDKFV';

export default function ConsentAnalytics() {
  const [consented, setConsented] = useState(false);
  const airGapped = useSyncExternalStore(subscribeAirGap, isAirGapped, getAirGapServerSnapshot);

  useEffect(() => {
    const syncConsent = () => {
      try {
        setConsented(localStorage.getItem(CONSENT_STORAGE_KEY) === 'accepted');
      } catch {
        setConsented(false);
      }
    };

    syncConsent();

    const handleConsentChange = (e) => {
      if (e?.detail === 'accepted') setConsented(true);
      else if (e?.detail === 'declined') setConsented(false);
      else syncConsent();
    };

    const handleStorage = (e) => {
      if (e.key === CONSENT_STORAGE_KEY) syncConsent();
    };

    window.addEventListener(CONSENT_EVENT, handleConsentChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CONSENT_EVENT, handleConsentChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  if (airGapped || !consented) return null;

  return (
    <>
      <Analytics />
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}
    </>
  );
}

