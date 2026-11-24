'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Download,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
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
  Type,
  X,
} from 'lucide-react';
import ShareDelight from './ShareDelight';
import { useSharedFile } from '../../context/FileContext';
import { addHistoryEntry } from '../../lib/history';

const TOOL_LABELS = {
  merge: 'Merge PDF',
  split: 'Split PDF',
  compress: 'Compress PDF',
  organize: 'Organize PDF',
  edit: 'Edit PDF',
  ocr: 'OCR PDF',
  'pdf-to-jpg': 'PDF to JPG',
  'jpg-to-pdf': 'JPG to PDF',
  sign: 'Sign PDF',
  rotate: 'Rotate PDF',
  watermark: 'Watermark PDF',
  'page-numbers': 'Page Numbers',
  protect: 'Protect PDF',
  unlock: 'Unlock PDF',
  redact: 'Redact & Sanitize',
  'ai-chat': 'AI PDF Chat',
  'word-to-pdf': 'Word/TXT to PDF',
  'pdf-to-word': 'PDF to Word',
  flatten: 'Flatten PDF',
  compare: 'Compare PDF',
  repair: 'Repair PDF',
  'pdf-to-excel': 'PDF to Excel / CSV',
  crop: 'Crop PDF',
  'extract-images': 'Extract Images',
  'fill-form': 'Fill PDF Forms',
  metadata: 'Metadata Editor',
  'bates-numbering': 'Bates Numbering',
  'split-by-size': 'Split by Size',
  grayscale: 'Grayscale PDF',
  recipes: 'PDF Recipes',
};

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
  crop: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Watermark PDF', href: '/tools/watermark', icon: Type },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
  ],
  'fill-form': [
    { title: 'Flatten PDF', href: '/tools/flatten', icon: LayersIcon },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
  ],
  metadata: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
  ],
  'bates-numbering': [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
  ],
  grayscale: [
    { title: 'Compress PDF', href: '/tools/compress', icon: Minimize2 },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
  ],
  recipes: [
    { title: 'Inspect Metadata', href: '/tools/metadata', icon: FileText },
    { title: 'AI Chat & Summary', href: '/tools/ai-chat', icon: Bot },
    { title: 'Sign Document', href: '/tools/sign', icon: PenTool },
    { title: 'Protect PDF', href: '/tools/protect', icon: Lock },
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
  title = 'Processing...',
  description = 'Please wait while we process your PDF files locally.',
  isComplete = false,
  errorMessage = '',
  onDownload,
  onClose,
  downloadLabel = 'Download PDF',
  resultBlob = null,
  resultFile = null,
  resultFileName = 'document.pdf',
  currentToolId = null,
  inputSize = null,
  toolLabel = '',
  skipHistory = false,
}) {
  const router = useRouter();
  const { setFile } = useSharedFile();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const recordedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !isComplete) {
      recordedRef.current = false;
      return;
    }
    if (skipHistory || !currentToolId || recordedRef.current) return;
    recordedRef.current = true;
    addHistoryEntry({
      tool: currentToolId,
      toolLabel: toolLabel || TOOL_LABELS[currentToolId] || currentToolId,
      fileName: resultFileName,
      inputSize,
      outputSize: resultBlob?.size ?? resultFile?.size ?? null,
    });
  }, [isOpen, isComplete, skipHistory, currentToolId, toolLabel, resultFileName, inputSize, resultBlob, resultFile]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement;
    dialogRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (isComplete || errorMessage) && onClose) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, isComplete, errorMessage, onClose]);

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
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && (isComplete || errorMessage) && onClose) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="progress-modal-title"
        tabIndex={-1}
        className="modal-content progress-modal-enhanced"
        style={{ maxWidth: '480px' }}
      >
        {(isComplete || errorMessage) && onClose && (
          <button
            type="button"
            className="modal-close-btn"
            aria-label="Close modal"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
        {errorMessage ? (
          <>
            <div className="modal-success-icon" style={{ background: 'rgba(255, 107, 129, 0.12)', color: 'var(--error-color)' }}>
              <AlertCircle size={36} aria-hidden="true" />
            </div>
            <h2 id="progress-modal-title" className="modal-title">Operation Failed</h2>
            <p className="modal-desc">{errorMessage}</p>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
              Close
            </button>
          </>
        ) : !isComplete ? (
          <>
            <div className="modal-spinner" aria-hidden="true"></div>
            <h2 id="progress-modal-title" className="modal-title">{title}</h2>
            <p className="modal-desc">{description}</p>
          </>
        ) : (
          <>
            <div className="modal-success-icon">
              <Check size={36} aria-hidden="true" />
            </div>
            <h2 id="progress-modal-title" className="modal-title">Success!</h2>
            <p className="modal-desc">
              Your file is ready to download.
            </p>

            <div className="modal-privacy-tag">
              <ShieldCheck size={15} aria-hidden="true" />
              <span>0 bytes sent to servers • 100% private</span>
            </div>

            <button type="button" className="btn-primary" onClick={onDownload} style={{ width: '100%' }}>
              <Download size={20} aria-hidden="true" />
              {downloadLabel}
            </button>

            <ShareDelight />

            {/* Workflow Chaining: Suggested Next Actions */}
            {isPdfOutput && (resultBlob || resultFile) && (
              <div className="chain-workflow-section">
                <div className="chain-workflow-title">
                  <Sparkles size={14} style={{ color: 'var(--primary-color)' }} aria-hidden="true" />
                  Next Steps (Continue without re-uploading)
                </div>
                <div className="chain-action-grid">
                  {suggestions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <button
                        type="button"
                        key={action.href}
                        className="chain-action-btn"
                        onClick={() => handleChainToTool(action.href)}
                        title={`Send output PDF directly to ${action.title}`}
                      >
                        <span className="chain-action-btn-label">
                          <ActionIcon size={14} style={{ color: 'var(--primary-color)', flexShrink: 0 }} aria-hidden="true" />
                          <span>{action.title}</span>
                        </span>
                        <ArrowRight size={13} style={{ opacity: 0.6, flexShrink: 0 }} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="button" className="btn-secondary" onClick={onClose} style={{ width: '100%', marginTop: '0.25rem' }}>
              <RotateCcw size={16} aria-hidden="true" />
              Process Another File
            </button>
          </>
        )}
      </div>
    </div>
  );
}
