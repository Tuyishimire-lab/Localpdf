'use client';

import { useRouter } from 'next/navigation';
import { 
  Check, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  Minimize2, 
  Lock, 
  PenTool, 
  Hash, 
  Layers, 
  Grid, 
  LayersIcon, 
  Bot, 
  FileText, 
  FileSearch, 
  Edit3, 
  Type 
} from 'lucide-react';
import ShareDelight from './ShareDelight';
import { useSharedFile } from '../../context/FileContext';

const WORKFLOW_CHAINS = {
  merge: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Add Page Numbers', href: '/tools/page-numbers', icon: Hash },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
  ],
  split: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Merge with Other', href: '/tools/merge', icon: Layers },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'AI Chat & Summary', href: '/tools/ai-chat', icon: Bot },
  ],
  compress: [
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
    { title: 'Add Page Numbers', href: '/tools/page-numbers', icon: Hash },
    { title: 'AI Chat & Summary', href: '/tools/ai-chat', icon: Bot },
  ],
  organize: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Add Page Numbers', href: '/tools/page-numbers', icon: Hash },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Flatten PDF', href: '/tools/flatten', icon: LayersIcon },
  ],
  edit: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Flatten PDF', href: '/tools/flatten', icon: LayersIcon },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
  ],
  watermark: [
    { title: 'Flatten PDF', href: '/tools/flatten', icon: LayersIcon },
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
  ],
  'page-numbers': [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
    { title: 'Watermark PDF', href: '/tools/watermark', icon: Type },
  ],
  redact: [
    { title: 'Flatten PDF', href: '/tools/flatten', icon: LayersIcon },
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
  ],
  flatten: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'OCR Text', href: '/tools/ocr', icon: FileSearch },
    { title: 'AI Chat & Summary', href: '/tools/ai-chat', icon: Bot },
  ],
  repair: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Organize Pages', href: '/tools/organize', icon: Grid },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'AI Chat & Summary', href: '/tools/ai-chat', icon: Bot },
  ],
  unlock: [
    { title: 'Edit PDF', href: '/tools/edit', icon: Edit3 },
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Organize Pages', href: '/tools/organize', icon: Grid },
    { title: 'Convert to Word', href: '/tools/pdf-to-word', icon: FileText },
  ],
  protect: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'AI Chat & Summary', href: '/tools/ai-chat', icon: Bot },
  ],
  sign: [
    { title: 'Flatten PDF', href: '/tools/flatten', icon: LayersIcon },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
  ],
  'word-to-pdf': [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Add Page Numbers', href: '/tools/page-numbers', icon: Hash },
  ],
  'jpg-to-pdf': [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Organize Pages', href: '/tools/organize', icon: Grid },
    { title: 'OCR Text', href: '/tools/ocr', icon: FileSearch },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
  ],
  rotate: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Organize PDF', href: '/tools/organize', icon: Grid },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
  ],
};

const DEFAULT_CHAINS = [
  { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
  { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
  { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
  { title: 'AI Chat & Summary', href: '/tools/ai-chat', icon: Bot },
];

function createChainedFile(blob, fileName) {
  return new File([blob], fileName, { 
    type: blob?.type || 'application/pdf',
  });
}

export default function ProgressModal({ 
  isOpen, 
  title = "Processing...", 
  description = "Please wait while we process your PDF files locally.", 
  isComplete = false, 
  onDownload, 
  onClose,
  downloadLabel = "Download PDF",
  resultBlob = null,
  resultFile = null,
  resultFileName = "document.pdf",
  currentToolId = null,
}) {
  const router = useRouter();
  const { setFile } = useSharedFile();

  if (!isOpen) return null;

  const suggestions = (currentToolId && WORKFLOW_CHAINS[currentToolId]) || DEFAULT_CHAINS;
  const isPdfOutput = resultFileName.toLowerCase().endsWith('.pdf') || (resultBlob && resultBlob.type === 'application/pdf');

  const handleChainToTool = (toolHref) => {
    if (resultFile) {
      setFile(resultFile);
    } else if (resultBlob) {
      const chainedFile = createChainedFile(resultBlob, resultFileName);
      setFile(chainedFile);
    }
    if (onClose) onClose();
    router.push(toolHref);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content progress-modal-enhanced" style={{ maxWidth: '480px' }}>
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

            {/* Workflow Chaining: Suggested Next Actions */}
            {isPdfOutput && (resultBlob || resultFile) && (
              <div className="chain-workflow-section">
                <div className="chain-workflow-title">
                  <Sparkles size={14} style={{ color: 'var(--primary-color)' }} />
                  Next Steps (Continue without re-uploading)
                </div>
                <div className="chain-action-grid">
                  {suggestions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <button
                        key={action.href}
                        className="chain-action-btn"
                        onClick={() => handleChainToTool(action.href)}
                        title={`Send output PDF directly to ${action.title}`}
                      >
                        <span className="chain-action-btn-label">
                          <ActionIcon size={14} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                          <span>{action.title}</span>
                        </span>
                        <ArrowRight size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
