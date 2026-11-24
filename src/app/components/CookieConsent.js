'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export const CONSENT_STORAGE_KEY = 'localpdf-cookie-consent';
export const CONSENT_EVENT = 'localpdf-consent-change';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!consent) {
      // Delay showing the banner slightly for a better entrance animation
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: 'accepted' }));
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'declined');
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: 'declined' }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="cookie-banner-overlay">
      <div className="cookie-banner">
        <div className="cookie-banner-content">
          <h4 className="cookie-banner-title">Cookie Consent &amp; Privacy</h4>
          <p className="cookie-banner-text">
            We use optional analytics cookies only with your consent to measure site traffic and performance. If you decline, no analytics scripts are loaded.
            All PDF processing runs 100% locally in your browser &mdash; your documents are never uploaded to any server.
            Learn more in our <Link href="/privacy" className="cookie-banner-link">Privacy Policy</Link>.
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button onClick={handleDecline} className="cookie-btn cookie-btn-secondary">
            Decline
          </button>
          <button onClick={handleAccept} className="cookie-btn cookie-btn-primary">
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
