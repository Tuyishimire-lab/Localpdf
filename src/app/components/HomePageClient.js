'use client';

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSharedFile } from '../../context/FileContext';
import { toast } from '../../context/ToastContext';
import { 
  Layers, 
  Scissors, 
  Minimize2, 
  Image, 
  FileUp, 
  RotateCw, 
  Type, 
  Hash, 
  Lock, 
  Unlock,
  Grid, 
  PenTool, 
  Upload, 
  FileSearch, 
  Edit3, 
  FileText, 
  GitCompare, 
  Wrench, 
  EyeOff, 
  Bot, 
  Sparkles,
  Search,
  X,
  ShieldCheck,
  Zap,
  FolderSync,
  Table,
  Crop,
  FileCheck2,
  FileCode,
  Contrast,
  Workflow,
  ArrowRight,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Tools (29)' },
  { id: 'organize', label: 'Organize & Merge' },
  { id: 'convert', label: 'Convert' },
  { id: 'optimize', label: 'Optimize & Edit' },
  { id: 'security', label: 'Security & Privacy' },
  { id: 'ai', label: 'AI & Smart Tools' },
];

const tools = [
  {
    id: 'organize',
    title: 'Organize PDF',
    description: 'Delete, reorder, duplicate, rotate, or insert blank pages into your PDF visually.',
    icon: Grid,
    href: '/tools/organize',
    category: 'organize',
    keywords: ['reorder', 'delete pages', 'sort', 'arrange', 'duplicate', 'blank page'],
    badge: null,
  },
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into a single document in any order you choose.',
    icon: Layers,
    href: '/tools/merge',
    category: 'organize',
    keywords: ['combine', 'join', 'append', 'bind', 'collate', 'concat'],
    badge: { label: 'Popular', type: 'popular' },
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract specific pages or page ranges from a PDF, or split all pages into separate files.',
    icon: Scissors,
    href: '/tools/split',
    category: 'organize',
    keywords: ['extract', 'separate', 'cut', 'pages', 'slice'],
    badge: null,
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce the file size of your PDF documents by optimizing and scaling images client-side.',
    icon: Minimize2,
    href: '/tools/compress',
    category: 'optimize',
    keywords: ['shrink', 'reduce size', 'optimize', 'smaller', 'email size', 'downscale'],
    badge: { label: 'Popular', type: 'popular' },
  },
  {
    id: 'edit',
    title: 'Edit PDF',
    description: 'Add custom text overlays to document pages, drag, size, and stamp them.',
    icon: Edit3,
    href: '/tools/edit',
    category: 'optimize',
    keywords: ['add text', 'type', 'annotate', 'modify', 'stamp'],
    badge: null,
  },
  {
    id: 'ocr',
    title: 'OCR PDF',
    description: 'Extract text from scanned PDF documents locally using built-in OCR.',
    icon: FileSearch,
    href: '/tools/ocr',
    category: 'convert',
    keywords: ['optical character recognition', 'scanned', 'image to text', 'extract text', 'tesseract'],
    badge: { label: 'Wasm OCR', type: 'new' },
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    description: 'Extract all pages in a PDF file into separate high-quality JPG/PNG images.',
    icon: Image,
    href: '/tools/pdf-to-jpg',
    category: 'convert',
    keywords: ['image', 'export png', 'photos', 'render pages', 'jpeg'],
    badge: null,
  },
  {
    id: 'jpg-to-pdf',
    title: 'JPG to PDF',
    description: 'Convert JPG, PNG, and WebP images into PDF format with custom sizes and page layouts.',
    icon: FileUp,
    href: '/tools/jpg-to-pdf',
    category: 'convert',
    keywords: ['photo to pdf', 'images to pdf', 'png to pdf', 'webp'],
    badge: null,
  },
  {
    id: 'sign',
    title: 'Sign PDF',
    description: 'E-Sign documents client-side: draw, type, or load an image signature onto pages.',
    icon: PenTool,
    href: '/tools/sign',
    category: 'security',
    keywords: ['e-sign', 'signature', 'draw signature', 'contract', 'autograph'],
    badge: { label: 'E-Sign', type: 'privacy' },
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Rotate individual pages or all pages of a PDF visually and save the changes.',
    icon: RotateCw,
    href: '/tools/rotate',
    category: 'organize',
    keywords: ['turn', 'upside down', 'orientation', 'landscape', 'portrait', '90 degrees'],
    badge: null,
  },
  {
    id: 'watermark',
    title: 'Watermark',
    description: 'Stamp custom text or images onto your PDF pages with adjustable opacity, angle, and position.',
    icon: Type,
    href: '/tools/watermark',
    category: 'optimize',
    keywords: ['stamp', 'brand', 'copyright', 'draft', 'confidential', 'logo'],
    badge: null,
  },
  {
    id: 'page-numbers',
    title: 'Page Numbers',
    description: 'Add page numbers to your PDF documents with customizable placement, size, and fonts.',
    icon: Hash,
    href: '/tools/page-numbers',
    category: 'optimize',
    keywords: ['paginate', 'footer', 'header', 'numbering', 'bates'],
    badge: null,
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    description: 'Encrypt your PDF documents with owner and user passwords to restrict unauthorized access.',
    icon: Lock,
    href: '/tools/protect',
    category: 'security',
    keywords: ['encrypt', 'password', 'secure', 'aes', 'lock', 'restrict'],
    badge: { label: 'AES-256', type: 'privacy' },
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    description: 'Decrypt and remove password protection from PDFs so you can access them without prompt.',
    icon: Unlock,
    href: '/tools/unlock',
    category: 'security',
    keywords: ['decrypt', 'remove password', 'unprotect', 'permission'],
    badge: null,
  },
  {
    id: 'redact',
    title: 'Redact & Sanitize',
    description: 'Permanently black out sensitive text/data and strip document metadata for complete privacy.',
    icon: EyeOff,
    href: '/tools/redact',
    category: 'security',
    keywords: ['blackout', 'censor', 'hide', 'pii', 'strip metadata', 'confidential', 'sanitize'],
    badge: { label: 'Sanitize', type: 'privacy' },
  },
  {
    id: 'ai-chat',
    title: 'AI PDF Summarizer & Chat',
    description: 'Summarize PDFs and ask questions in natural language 100% locally in your browser.',
    icon: Bot,
    href: '/tools/ai-chat',
    category: 'ai',
    keywords: ['ai', 'summarize', 'ask question', 'nlp', 'local ai', 'chatgpt', 'bot', 'tldr'],
    badge: { label: '✨ Local AI', type: 'ai' },
  },
  {
    id: 'word-to-pdf',
    title: 'Word/TXT to PDF',
    description: 'Convert Microsoft Word (.docx) and plain text (.txt) files into high-quality PDFs client-side.',
    icon: FileText,
    href: '/tools/word-to-pdf',
    category: 'convert',
    keywords: ['doc', 'docx', 'text', 'txt', 'document conversion'],
    badge: null,
  },
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    description: 'Convert PDF files to editable Microsoft Word (.docx) documents entirely in your browser.',
    icon: FileText,
    href: '/tools/pdf-to-word',
    category: 'convert',
    keywords: ['docx', 'export doc', 'editable', 'text export'],
    badge: null,
  },
  {
    id: 'flatten',
    title: 'Flatten PDF',
    description: 'Remove interactive form fields and annotations, converting them to static content.',
    icon: Layers,
    href: '/tools/flatten',
    category: 'optimize',
    keywords: ['forms', 'interactive', 'static', 'lock fields', 'annotations'],
    badge: null,
  },
  {
    id: 'compare',
    title: 'Compare PDF',
    description: 'Compare two PDF documents side by side and visually highlight all differences.',
    icon: GitCompare,
    href: '/tools/compare',
    category: 'ai',
    keywords: ['diff', 'side by side', 'differences', 'visual compare', 'changes'],
    badge: { label: 'Pixel Diff', type: 'new' },
  },
  {
    id: 'repair',
    title: 'Repair PDF',
    description: 'Attempt to recover and rebuild corrupted or damaged PDF files in your browser.',
    icon: Wrench,
    href: '/tools/repair',
    category: 'organize',
    keywords: ['fix', 'corrupt', 'recovery', 'damaged', 'broken'],
    badge: null,
  },
  {
    id: 'pdf-to-excel',
    title: 'PDF to Excel / CSV',
    description: 'Extract tabular PDF data into multi-sheet .xlsx workbooks or .csv files locally.',
    icon: Table,
    href: '/tools/pdf-to-excel',
    category: 'convert',
    keywords: ['excel', 'xlsx', 'csv', 'table', 'spreadsheet', 'financial'],
    badge: { label: 'New', type: 'new' },
  },
  {
    id: 'crop',
    title: 'Crop PDF',
    description: 'Trim white margins and resize PDF pages visually using lossless CropBox settings.',
    icon: Crop,
    href: '/tools/crop',
    category: 'organize',
    keywords: ['trim', 'margins', 'cut margins', 'cropbox', 'resize'],
    badge: { label: 'New', type: 'new' },
  },
  {
    id: 'extract-images',
    title: 'Extract Images',
    description: 'Pull all embedded photos and graphics out of any PDF as lossless PNGs or ZIP.',
    icon: Image,
    href: '/tools/extract-images',
    category: 'convert',
    keywords: ['photos', 'rip images', 'save pictures', 'embedded images', 'png'],
    badge: { label: 'New', type: 'new' },
  },
  {
    id: 'fill-form',
    title: 'Fill PDF Forms',
    description: 'Complete interactive AcroForm fields, checkboxes, and dropdowns, plus optional flatten.',
    icon: FileCheck2,
    href: '/tools/fill-form',
    category: 'optimize',
    keywords: ['form', 'acroform', 'checkbox', 'fillable', 'questionnaire'],
    badge: { label: 'New', type: 'new' },
  },
  {
    id: 'metadata',
    title: 'Metadata Editor & Scrubber',
    description: 'Inspect, edit, or completely scrub Title, Author, Creator, and Producer metadata.',
    icon: FileCode,
    href: '/tools/metadata',
    category: 'security',
    keywords: ['exif', 'properties', 'author', 'scrub', 'privacy', 'metadata'],
    badge: { label: 'Privacy', type: 'privacy' },
  },
  {
    id: 'bates-numbering',
    title: 'Bates Numbering',
    description: 'Apply continuous legal Bates prefixes, padded IDs, and headers/footers across PDFs.',
    icon: Hash,
    href: '/tools/bates-numbering',
    category: 'optimize',
    keywords: ['legal', 'discovery', 'bates', 'header', 'footer', 'stamp'],
    badge: { label: 'Legal', type: 'new' },
  },
  {
    id: 'split-by-size',
    title: 'Split by Size / Bookmarks',
    description: 'Chunk large PDFs into MB limits for email or split automatically by bookmark chapters.',
    icon: Scissors,
    href: '/tools/split-by-size',
    category: 'organize',
    keywords: ['mb limit', 'email size', 'chapters', 'bookmarks', 'chunk'],
    badge: { label: 'New', type: 'new' },
  },
  {
    id: 'grayscale',
    title: 'Grayscale PDF',
    description: 'Convert color PDFs into calibrated black-and-white pages for economical printing.',
    icon: Contrast,
    href: '/tools/grayscale',
    category: 'optimize',
    keywords: ['black and white', 'monochrome', 'print', 'save ink', 'bw'],
    badge: { label: 'New', type: 'new' },
  },
];

const SINGLE_PDF_DROP_TOOLS = [
  { label: 'Run Multi-Step Recipe', href: '/recipes' },
  { label: 'Compress PDF', href: '/tools/compress' },
  { label: 'Merge PDF (Add More)', href: '/tools/merge' },
  { label: 'Split PDF', href: '/tools/split' },
  { label: 'Split by Size / Bookmarks', href: '/tools/split-by-size' },
  { label: 'Organize PDF', href: '/tools/organize' },
  { label: 'Crop PDF', href: '/tools/crop' },
  { label: 'AI Chat & Summary', href: '/tools/ai-chat' },
  { label: 'OCR PDF', href: '/tools/ocr' },
  { label: 'PDF to Word', href: '/tools/pdf-to-word' },
  { label: 'PDF to Excel / CSV', href: '/tools/pdf-to-excel' },
  { label: 'PDF to JPG / PNG', href: '/tools/pdf-to-jpg' },
  { label: 'Extract Images', href: '/tools/extract-images' },
  { label: 'Fill PDF Forms', href: '/tools/fill-form' },
  { label: 'Edit PDF', href: '/tools/edit' },
  { label: 'Sign PDF', href: '/tools/sign' },
  { label: 'Watermark', href: '/tools/watermark' },
  { label: 'Page Numbers', href: '/tools/page-numbers' },
  { label: 'Bates Numbering', href: '/tools/bates-numbering' },
  { label: 'Rotate PDF', href: '/tools/rotate' },
  { label: 'Grayscale PDF', href: '/tools/grayscale' },
  { label: 'Metadata & Scrub', href: '/tools/metadata' },
  { label: 'Protect PDF (AES-256)', href: '/tools/protect' },
  { label: 'Unlock PDF', href: '/tools/unlock' },
  { label: 'Redact & Sanitize', href: '/tools/redact' },
  { label: 'Flatten PDF', href: '/tools/flatten' },
  { label: 'Repair PDF', href: '/tools/repair' },
];

function subscribeUrlQuery(callback) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getUrlQuerySnapshot() {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('q') || '';
}

function getUrlQueryServerSnapshot() {
  return '';
}

export default function HomePageClient() {
  const router = useRouter();
  const { setFile, setFiles } = useSharedFile();
  const [dragOver, setDragOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const urlQuery = useSyncExternalStore(
    subscribeUrlQuery,
    getUrlQuerySnapshot,
    getUrlQueryServerSnapshot
  );
  const [userSearchQuery, setUserSearchQuery] = useState(null);
  const searchQuery = userSearchQuery !== null ? userSearchQuery : urlQuery;
  const [selectedCategory, setSelectedCategory] = useState('all');

  const clearSearch = () => {
    setUserSearchQuery('');
    if (typeof window !== 'undefined' && window.location.search.includes('q=')) {
      window.history.replaceState({}, '', window.location.pathname);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  // Filter tools based on search query and category
  const filteredTools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!query) return true;

      const titleMatch = tool.title.toLowerCase().includes(query);
      const descMatch = tool.description.toLowerCase().includes(query);
      const keywordMatch = tool.keywords?.some((kw) => kw.toLowerCase().includes(query));

      return titleMatch || descMatch || keywordMatch;
    });
  }, [searchQuery, selectedCategory]);

  // Global Drag and Drop Catch-all
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.clientX === 0 && e.clientY === 0) {
        setDragOver(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      const dropped = Array.from(e.dataTransfer?.files || []);
      if (dropped.length === 0) return;

      const isPdf = (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      const isImage = (f) =>
        f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name);
      const isDoc = (f) =>
        /\.(docx|txt|md)$/i.test(f.name) ||
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        f.type === 'text/plain';

      const pdfs = dropped.filter(isPdf);
      const images = dropped.filter(isImage);
      const docs = dropped.filter(isDoc);

      if (pdfs.length > 1) {
        setFiles(pdfs);
        toast.info(`Loaded ${pdfs.length} PDFs into Merge PDF.`);
        router.push('/tools/merge');
      } else if (pdfs.length === 1) {
        setDroppedFile(pdfs[0]);
        setModalOpen(true);
      } else if (images.length > 0) {
        setFiles(images);
        toast.info(`Loaded ${images.length} image${images.length > 1 ? 's' : ''} into JPG to PDF.`);
        router.push('/tools/jpg-to-pdf');
      } else if (docs.length > 0) {
        setFiles([docs[0]]);
        toast.info('Loaded document into Word/TXT to PDF.');
        router.push('/tools/word-to-pdf');
      } else {
        toast.error('Please drop a PDF, image (JPG/PNG/WebP), or document (.docx, .txt, .md) to start.');
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [router, setFiles]);

  useEffect(() => {
    if (!modalOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalOpen]);

  const handleSelectTool = (route) => {
    if (droppedFile) {
      setFile(droppedFile);
      setModalOpen(false);
      router.push(route);
    }
  };

  return (
    <>
      <section className="dashboard-title-section">
        <h1 className="dashboard-title">
          Every tool you need to work with <span>PDFs</span>
        </h1>
        <p className="dashboard-subtitle">
          100% secure, private, and client-side. Your files never leave your computer. Everything is processed instantly in your web browser.
        </p>
      </section>

      {/* Discovery Layer: Instant Search & Category Filters */}
      <div className="tools-discovery-container">
        <div className="tools-search-wrapper">
          <Search size={18} className="tools-search-icon" />
          <input
            type="text"
            className="tools-search-input"
            placeholder="Search all 29 tools (e.g. compress, excel, crop, bates, form)..."
            value={searchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            aria-label="Search PDF Tools"
          />
          {searchQuery && (
            <button
              type="button"
              className="tools-search-clear"
              onClick={clearSearch}
              aria-label="Clear Search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="tools-category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`tools-category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <Link
          href="/recipes"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            marginTop: '1rem',
            padding: '0.85rem 1.15rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.12), rgba(99, 102, 241, 0.12))',
            border: '1px solid rgba(255, 71, 87, 0.28)',
            textDecoration: 'none',
            color: 'var(--text-main)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Workflow size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} aria-hidden="true" />
            <div>
              <strong style={{ fontSize: '0.92rem', display: 'block' }}>
                New: Multi-Step PDF Recipes
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Chain Merge → Bates Numbering → Watermark → Compress → AES-256 Encrypt in a single local pass.
              </span>
            </div>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--primary-color)',
            }}
          >
            Build Recipe <ArrowRight size={14} aria-hidden="true" />
          </span>
        </Link>
      </div>

      {/* Tools Grid */}
      {filteredTools.length > 0 ? (
        <div className="tools-grid" suppressHydrationWarning>
          {filteredTools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <Link key={tool.id} href={tool.href} className="tool-card" suppressHydrationWarning>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '0.25rem' }}>
                  <div className="tool-card-icon-container">
                    <IconComponent size={24} />
                  </div>
                  {tool.badge && (
                    <span className={`tool-badge-tag tool-badge-${tool.badge.type}`}>
                      {tool.badge.label}
                    </span>
                  )}
                </div>
                <h2 className="tool-card-title">{tool.title}</h2>
                <p className="tool-card-description">{tool.description}</p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="tools-empty-state">
          <Search size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No tools matching &quot;{searchQuery}&quot;</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Try searching for another keyword or reset the category filter.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              clearSearch();
              setSelectedCategory('all');
            }}
          >
            Show All 29 Tools
          </button>
        </div>
      )}

      {/* Fullscreen dragover overlay */}
      {dragOver && (
        <div 
          className="modal-overlay" 
          style={{ 
            pointerEvents: 'none', 
            background: 'rgba(7, 7, 20, 0.92)',
            border: '4px dashed var(--primary-color)',
            margin: '8px',
            borderRadius: 'var(--border-radius-lg)',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
            <Upload size={80} style={{ color: 'var(--primary-color)', animation: 'float 2s ease-in-out infinite' }} />
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '1.5rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Drop PDF, Images, or Docs!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginTop: '0.5rem' }}>
              Multiple PDFs auto-open Merge, images open JPG to PDF, or pick a single-PDF tool.
            </p>
          </div>
        </div>
      )}

      {/* Select tool modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ pointerEvents: 'auto' }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="drop-modal-title"
            className="modal-content"
            style={{ maxWidth: '620px', width: '92%' }}
          >
            <h2 id="drop-modal-title" className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={24} style={{ color: 'var(--primary-color)' }} aria-hidden="true" />
              PDF Document Detected
            </h2>
            <p className="modal-desc" style={{ marginBottom: '1rem' }}>
              Choose a tool to process <strong>{droppedFile?.name}</strong>:
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', 
              gap: '0.6rem', 
              width: '100%',
              maxHeight: '52vh',
              overflowY: 'auto',
              paddingRight: '0.25rem',
              marginBottom: '1rem' 
            }}>
              {SINGLE_PDF_DROP_TOOLS.map((tool) => (
                <button
                  key={tool.href}
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.84rem', padding: '0.6rem 0.75rem' }}
                  onClick={() => handleSelectTool(tool.href)}
                >
                  {tool.label}
                </button>
              ))}
            </div>
            
            <button 
              className="btn-secondary" 
              onClick={() => setModalOpen(false)} 
              style={{ width: '100%', borderColor: 'transparent', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
