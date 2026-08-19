'use client';

import { Check, Download, RotateCcw, ShieldCheck } from 'lucide-react';
import ShareDelight from './ShareDelight';

export default function ProgressModal({ 
  isOpen, 
  title = "Processing...", 
  description = "Please wait while we process your PDF files locally.", 
  isComplete = false, 
  onDownload, 
  onClose,
  downloadLabel = "Download PDF"
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content progress-modal-enhanced">
        {!isComplete ? (
          <>
            <div className="modal-spinner"></div>
            <h2 className="modal-title">{title}</h2>
            <p className="modal-desc">{description}</p>
          </>
        ) : (
          <>
            <div className="modal-success-icon">
              <Check size={36} />
            </div>
            <h2 className="modal-title">Success!</h2>
            <p className="modal-desc">
              Your file is ready to download.
            </p>

            <div className="modal-privacy-tag">
              <ShieldCheck size={15} />
              <span>0 bytes sent to servers • 100% private</span>
            </div>
            
            <button className="btn-primary" onClick={onDownload} style={{ width: '100%', marginBottom: '0.5rem' }}>
              <Download size={20} />
              {downloadLabel}
            </button>
            
            <ShareDelight />

            <button className="btn-secondary" onClick={onClose} style={{ width: '100%', marginTop: '0.75rem' }}>
              <RotateCcw size={16} />
              Process Another File
            </button>
          </>
        )}
      </div>
    </div>
  );
}
