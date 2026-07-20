'use client';

import { useState, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function MetadataViewer({ file }) {
  const [isOpen, setIsOpen] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);

  // Helper to parse PDF date strings D:YYYYMMDDHHmmss...
  const parsePdfDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    try {
      let clean = dateStr;
      if (clean.startsWith('D:')) clean = clean.slice(2);
      
      const year = clean.substring(0, 4);
      const month = clean.substring(4, 6);
      const day = clean.substring(6, 8);
      const hour = clean.substring(8, 10);
      const min = clean.substring(10, 12);
      
      if (!year) return dateStr;
      return `${year}-${month || '01'}-${day || '01'} ${hour || '00'}:${min || '00'}`;
    } catch (e) {
      return dateStr;
    }
  };

  useEffect(() => {
    async function loadMetadata() {
      if (!file) return;
      try {
        setLoading(true);
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        
        setMetadata({
          title: pdfDoc.getTitle() || 'Untitled',
          author: pdfDoc.getAuthor() || 'Unknown',
          subject: pdfDoc.getSubject() || 'None',
          creator: pdfDoc.getCreator() || 'Unknown',
          producer: pdfDoc.getProducer() || 'Unknown',
          creationDate: parsePdfDate(pdfDoc.getCreationDate()?.toString()),
          modificationDate: parsePdfDate(pdfDoc.getModificationDate()?.toString()),
          pageCount: pdfDoc.getPageCount()
        });
        setLoading(false);
      } catch (err) {
        console.error("Error reading PDF metadata:", err);
        setMetadata(null);
        setLoading(false);
      }
    }

    loadMetadata();
  }, [file]);

  if (!file) return null;

  return (
    <div style={{
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--border-radius-md)',
      backgroundColor: 'rgba(7, 7, 20, 0.4)',
      overflow: 'hidden',
      marginTop: '0.75rem'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          color: 'var(--text-main)',
          fontFamily: 'var(--font-sans)',
          fontWeight: '700',
          fontSize: '0.85rem',
          cursor: 'pointer'
        }}
        type="button"
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={16} style={{ color: 'var(--primary-color)' }} />
          Document Metadata
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}>
              <div className="modal-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
            </div>
          ) : metadata ? (
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.5rem 0.75rem' }}>
              <strong>Title:</strong> <span style={{ color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{metadata.title}</span>
              <strong>Author:</strong> <span style={{ color: 'var(--text-main)' }}>{metadata.author}</span>
              <strong>Subject:</strong> <span style={{ color: 'var(--text-main)' }}>{metadata.subject}</span>
              <strong>Pages:</strong> <span style={{ color: 'var(--text-main)' }}>{metadata.pageCount}</span>
              <strong>Creator:</strong> <span style={{ color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{metadata.creator}</span>
              <strong>Producer:</strong> <span style={{ color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{metadata.producer}</span>
              <strong>Created:</strong> <span style={{ color: 'var(--text-main)' }}>{metadata.creationDate}</span>
              <strong>Modified:</strong> <span style={{ color: 'var(--text-main)' }}>{metadata.modificationDate}</span>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>Could not load metadata</div>
          )}
        </div>
      )}
    </div>
  );
}
