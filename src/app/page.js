'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSharedFile } from '../context/FileContext';
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
  Upload
} from 'lucide-react';

const tools = [
  {
    id: 'organize',
    title: 'Organize PDF',
    description: 'Delete, reorder, duplicate, rotate, or insert blank pages into your PDF visually.',
    icon: Grid,
    href: '/tools/organize',
  },
  {
    id: 'merge',
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into a single document in any order you choose.',
    icon: Layers,
    href: '/tools/merge',
  },
  {
    id: 'split',
    title: 'Split PDF',
    description: 'Extract specific pages or page ranges from a PDF, or split all pages into separate files.',
    icon: Scissors,
    href: '/tools/split',
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    description: 'Reduce the file size of your PDF documents by optimizing and scaling images client-side.',
    icon: Minimize2,
    href: '/tools/compress',
  },
  {
    id: 'pdf-to-jpg',
    title: 'PDF to JPG',
    description: 'Extract all pages in a PDF file into separate high-quality JPG/PNG images.',
    icon: Image,
    href: '/tools/pdf-to-jpg',
  },
  {
    id: 'jpg-to-pdf',
    title: 'JPG to PDF',
    description: 'Convert JPG, PNG, and WebP images into PDF format with custom sizes and page layouts.',
    icon: FileUp,
    href: '/tools/jpg-to-pdf',
  },
  {
    id: 'sign',
    title: 'Sign PDF',
    description: 'E-Sign documents client-side: draw, type, or load an image signature onto pages.',
    icon: PenTool,
    href: '/tools/sign',
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    description: 'Rotate individual pages or all pages of a PDF visually and save the changes.',
    icon: RotateCw,
    href: '/tools/rotate',
  },
  {
    id: 'watermark',
    title: 'Watermark',
    description: 'Stamp custom text or images onto your PDF pages with adjustable opacity, angle, and position.',
    icon: Type,
    href: '/tools/watermark',
  },
  {
    id: 'page-numbers',
    title: 'Page Numbers',
    description: 'Add page numbers to your PDF documents with customizable placement, size, and fonts.',
    icon: Hash,
    href: '/tools/page-numbers',
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    description: 'Encrypt your PDF documents with owner and user passwords to restrict unauthorized access.',
    icon: Lock,
    href: '/tools/protect',
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    description: 'Decrypt and remove password protection from PDFs so you can access them without prompt.',
    icon: Unlock,
    href: '/tools/unlock',
  },
];

export default function Home() {
  const router = useRouter();
  const { setFile } = useSharedFile();

  const [dragOver, setDragOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Drag and drop listeners on window
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set false if leaving window boundary
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
        if (file.type === 'application/pdf') {
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            'name': 'LocalPDF',
            'operatingSystem': 'All',
            'applicationCategory': 'UtilitiesApplication',
            'description': 'Free and secure client-side PDF tools operating 100% in your browser. No files uploaded to servers.',
            'offers': {
              '@type': 'Offer',
              'price': '0',
              'priceCurrency': 'USD'
            }
          })
        }}
      />

      <section className="dashboard-title-section">
        <h1 className="dashboard-title">
          Every tool you need to work with <span>PDFs</span>
        </h1>
        <p className="dashboard-subtitle">
          100% secure, private, and client-side. Your files never leave your computer everything is processed instantly in your web browser.
        </p>
      </section>

      <div className="tools-grid">
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Link key={tool.id} href={tool.href} className="tool-card">
              <div className="tool-card-icon-container">
                <IconComponent size={24} />
              </div>
              <h2 className="tool-card-title">{tool.title}</h2>
              <p className="tool-card-description">{tool.description}</p>
            </Link>
          );
        })}
      </div>

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
