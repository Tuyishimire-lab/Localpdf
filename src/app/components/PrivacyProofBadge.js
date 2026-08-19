'use client';

import { useState } from 'react';
import { ShieldCheck, Info, WifiOff, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export default function PrivacyProofBadge({ compact = false }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`privacy-proof-card ${compact ? 'compact' : ''}`}>
      <div className="privacy-proof-header">
        <div className="privacy-badge-main">
          <div className="privacy-beacon-wrapper">
            <span className="privacy-beacon-ring"></span>
            <span className="privacy-beacon-dot"></span>
          </div>
          <div className="privacy-text-group">
            <div className="privacy-status-title">
              <ShieldCheck size={14} className="privacy-shield-icon" />
              <span>0 KB Cloud Upload</span>
            </div>
            <p className="privacy-status-subtitle">
              100% In-Browser • Zero Server Transfer
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

          <div className="privacy-verify-tip">
            💡 <em>Audit:</em> Press <code>F12</code> → <strong>Network</strong> tab. 0 bytes of document data leave your device.
          </div>
        </div>
      )}
    </div>
  );
}
