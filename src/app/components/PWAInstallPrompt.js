'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const DISMISSED_KEY = 'localpdf-pwa-prompt-dismissed';
const DELAY_MS = 45_000; // show after 45 seconds

/**
 * PWAInstallPrompt — a non-intrusive toast that invites users to install
 * LocalPDF as a PWA (Progressive Web App).
 *
 * - Waits 45 seconds before appearing (user should have used the app first)
 * - Remembers dismissal in localStorage so it doesn't reappear
 * - Only shows when the browser fires 'beforeinstallprompt' (i.e. the app
 *   is actually installable — Chrome/Edge on Android/Windows)
 * - Does nothing on iOS Safari (which uses its own Add to Home Screen flow)
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if user already dismissed
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e) => {
      e.preventDefault(); // stop the browser's default mini-infobar
      setDeferredPrompt(e);

      // Wait a bit before showing — let the user actually use the app first
      setTimeout(() => setVisible(true), DELAY_MS);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
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

  if (!visible) return null;

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
