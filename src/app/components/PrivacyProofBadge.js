'use client';

import { useState, useSyncExternalStore } from 'react';
import { ShieldCheck, WifiOff, CheckCircle2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { isAirGapped, setAirGapped, subscribeAirGap, getAirGapServerSnapshot } from '../../lib/airgap';
import { toast } from '../../context/ToastContext';

export default function PrivacyProofBadge({ compact = false }) {
  const [showDetails, setShowDetails] = useState(false);
  const airGapped = useSyncExternalStore(subscribeAirGap, isAirGapped, getAirGapServerSnapshot);

  const handleToggleAirGap = () => {
    const next = setAirGapped(!airGapped);
    if (next) {
      toast.info('Strict Air-Gapped Mode enabled: optional analytics & external OCR CDN packs are blocked.');
    } else {
      toast.info('Strict Air-Gapped Mode disabled (documents remain 100% local).');
    }
  };

  return (
    <div className={`privacy-proof-card ${compact ? 'compact' : ''}`}>
      <div className="privacy-proof-header">
        <div className="privacy-badge-main">
          <div className="privacy-beacon-wrapper">
            <span className="privacy-beacon-ring"></span>
            <span className="privacy-beacon-dot"></span>
          </div>
          <div className="privacy-text-group">
            <div className="privacy-status-title" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
              <ShieldCheck size={14} className="privacy-shield-icon" />
              <span>0 KB Cloud Upload</span>
              {airGapped && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    background: 'rgba(16, 185, 129, 0.16)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <Lock size={10} aria-hidden="true" /> Air-Gapped ON
                </span>
              )}
            </div>
            <p className="privacy-status-subtitle">
              {airGapped
                ? 'Strict Air-Gapped • Analytics & CDN Fallbacks Off'
                : '100% In-Browser • Zero Server Transfer'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="privacy-toggle-btn"
          aria-expanded={showDetails}
          title="Verify how your files stay private"
        >
          <span>Verify</span>
          {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {showDetails && (
        <div className="privacy-proof-details">
          <div className="privacy-detail-item">
            <CheckCircle2 size={14} className="privacy-detail-icon" />
            <div>
              <strong>Client-Side Processing:</strong> Your PDF is processed entirely inside your browser engine.
            </div>
          </div>

          <div className="privacy-detail-item">
            <WifiOff size={14} className="privacy-detail-icon" />
            <div>
              <strong>Offline Capable:</strong> Turn on Airplane mode — this tool still works without internet.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '8px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.78rem', lineHeight: 1.35 }}>
              <strong style={{ color: 'var(--text-main)', display: 'block' }}>Strict Air-Gapped Mode</strong>
              <span style={{ color: 'var(--text-muted)' }}>
                Blocks optional analytics &amp; external OCR language CDN fetches.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={airGapped}
              aria-label="Toggle Strict Air-Gapped Mode"
              onClick={handleToggleAirGap}
              style={{
                flexShrink: 0,
                padding: '0.32rem 0.65rem',
                borderRadius: '999px',
                border: airGapped ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)',
                background: airGapped ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                color: airGapped ? '#10b981' : 'var(--text-main)',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {airGapped ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="privacy-verify-tip">
            💡 <em>Audit:</em> Press <code>F12</code> → <strong>Network</strong> tab. 0 bytes of document data leave your device.
          </div>
        </div>
      )}
    </div>
  );
}
