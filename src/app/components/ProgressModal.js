'use client';

import { Check, Download, RotateCcw } from 'lucide-react';

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
      <div className="modal-content">
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
            <p className="modal-desc">Your file is ready to download. All processing was done privately in your browser.</p>
            
            <button className="btn-primary" onClick={onDownload}>
              <Download size={20} />
              {downloadLabel}
            </button>
            
            <button className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
              <RotateCcw size={16} />
              Start Over
            </button>
          </>
        )}
      </div>
    </div>
  );
}
