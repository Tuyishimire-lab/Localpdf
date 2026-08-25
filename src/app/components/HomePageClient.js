'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSharedFile } from '../../context/FileContext';
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
  FolderSync
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Tools (21)' },
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
    badge: { label: 'AES-128', type: 'privacy' },
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
];

export default function HomePageClient() {
  const router = useRouter();
  const { setFile } = useSharedFile();
  const [dragOver, setDragOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

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

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          setDroppedFile(file);
          setModalOpen(true);
        } else {
          alert('Please drop a valid PDF document to start.');
        }
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
  }, []);

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
            placeholder="Search all 21 tools (e.g. compress, merge, ocr, word, redact)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search PDF Tools"
          />
          {searchQuery && (
            <button
              className="tools-search-clear"
              onClick={() => setSearchQuery('')}
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
            className="btn-secondary"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
          >
            Show All 21 Tools
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
              Drop PDF File to Begin!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', marginTop: '0.5rem' }}>
              We will load the document and ask you which tool to launch.
            </p>
          </div>
        </div>
      )}

      {/* Select tool modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ pointerEvents: 'auto' }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }}>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={24} style={{ color: 'var(--primary-color)' }} />
              PDF Document Detected
            </h2>
            <p className="modal-desc" style={{ marginBottom: '1.25rem' }}>
              Choose a tool to process <strong>{droppedFile?.name}</strong>:
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '0.75rem', 
              width: '100%',
              marginBottom: '1rem' 
            }}>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/compress')}>Compress PDF</button>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/split')}>Split PDF</button>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/edit')}>Edit PDF</button>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/ocr')}>OCR PDF</button>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/protect')}>Protect PDF</button>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/sign')}>Sign PDF</button>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/organize')}>Organize PDF</button>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/watermark')}>Watermark</button>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/page-numbers')}>Page Numbers</button>
              <button className="btn-secondary" onClick={() => handleSelectTool('/tools/rotate')}>Rotate PDF</button>
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
