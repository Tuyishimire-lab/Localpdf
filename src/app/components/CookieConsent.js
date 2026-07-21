'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('localpdf-cookie-consent');
    if (!consent) {
      // Delay showing the banner slightly for a better entrance animation
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('localpdf-cookie-consent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('localpdf-cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="cookie-banner-overlay">
      <div className="cookie-banner">
        <div className="cookie-banner-content">
          <h4 className="cookie-banner-title">Cookie Consent & Privacy</h4>
          <p className="cookie-banner-text">
            We use cookies to personalize content and ads, analyze our traffic, and provide a secure experience. 
            All PDF processing is done 100% locally in your browser—your documents are never uploaded to our servers. 
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
