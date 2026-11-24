'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { CONSENT_STORAGE_KEY, CONSENT_EVENT } from './CookieConsent';

const DISMISSED_KEY = 'localpdf-pwa-prompt-dismissed';
const DELAY_MS = 45_000; // show after 45 seconds

/**
 * PWAInstallPrompt — a non-intrusive toast that invites users to install
 * LocalPDF as a PWA (Progressive Web App).
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || localStorage.getItem(DISMISSED_KEY)) return;

    const scheduleVisible = () => {
      if (timerRef.current) return;
      timerRef.current = setTimeout(() => {
        // Avoid overlapping CookieConsent if still unanswered
        if (localStorage.getItem(CONSENT_STORAGE_KEY)) {
          setVisible(true);
        }
      }, DELAY_MS);
    };

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (localStorage.getItem(CONSENT_STORAGE_KEY)) {
        scheduleVisible();
      }
    };

    const handleConsentResolved = () => {
      if (localStorage.getItem(CONSENT_STORAGE_KEY)) {
        scheduleVisible();
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener(CONSENT_EVENT, handleConsentResolved);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener(CONSENT_EVENT, handleConsentResolved);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="pwa-prompt" role="dialog" aria-label="Install LocalPDF app">
      <div className="pwa-prompt-icon">
        <Smartphone size={22} />
      </div>
      <div className="pwa-prompt-body">
        <p className="pwa-prompt-title">Install LocalPDF</p>
        <p className="pwa-prompt-sub">Use PDF tools offline, right from your home screen.</p>
      </div>
      <div className="pwa-prompt-actions">
        <button
          onClick={handleInstall}
          disabled={installing}
          className="pwa-prompt-install"
          aria-label="Install app"
        >
          <Download size={14} />
          {installing ? 'Installing…' : 'Install'}
        </button>
        <button
          onClick={handleDismiss}
          className="pwa-prompt-dismiss"
          aria-label="Dismiss install prompt"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
