'use client';

import { useState, useEffect } from 'react';
import { FileSearch, ChevronLeft, ChevronRight, Copy, Download, Sparkles } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf, renderPageToDataUrl } from '../../../lib/pdfEngine';
import Tesseract from 'tesseract.js';

export default function OcrTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [pageImg, setPageImg] = useState(null);
  const [loadingPage, setLoadingPage] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressVal, setProgressVal] = useState(0);
  const [extractedText, setExtractedText] = useState('');

  // Render active page thumbnail at 1.5x scale for high-res OCR input
  useEffect(() => {
    async function renderViewport() {
      if (!pdfDoc) return;
      try {
        setLoadingPage(true);
        const url = await renderPageToDataUrl(pdfDoc, activePage + 1, 1.5);
        setPageImg(url);
        setLoadingPage(false);
      } catch (err) {
        console.error("Error rendering page viewport:", err);
        setLoadingPage(false);
      }
    }
    renderViewport();
  }, [pdfDoc, activePage]);

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setActivePage(0);
    setExtractedText('');
    setProgressVal(0);
    setProgressStatus('');

    try {
      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.error("Error loading PDF", err);
      alert("Failed to load PDF file.");
      setFiles([]);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setActivePage(0);
    setPageImg(null);
    setExtractedText('');
    setProgressVal(0);
    setProgressStatus('');
  };

  const handleProcess = async () => {
    if (!pageImg) return;
    setProcessing(true);
    setProgressVal(0);
    setProgressStatus('Initializing OCR engine...');

    try {
      const result = await Tesseract.recognize(
        pageImg,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgressStatus(`Recognizing text...`);
              setProgressVal(Math.round(m.progress * 100));
            } else {
              setProgressStatus(`${m.status.charAt(0).toUpperCase() + m.status.slice(1)}...`);
            }
          }
        }
      );

      setExtractedText(result.data.text || 'No text could be recognized on this page.');
      setProcessing(false);
    } catch (err) {
      console.error("OCR recognition error:", err);
      alert("Failed to perform text recognition on this page.");
      setProcessing(false);
    }
  };

  const handleCopyText = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    alert("Text copied to clipboard!");
  };

  const handleDownloadText = () => {
    if (!extractedText) return;
    
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const name = files[0].name.replace('.pdf', '');
    
    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_page_${activePage + 1}_text.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const leftPane = files.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem' }}>
      
      {/* Top page navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(7,7,20,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-md)' }}>
        <button 
          className="rotate-card-btn" 
          disabled={activePage === 0} 
          onClick={() => {
            setActivePage(prev => prev - 1);
            setExtractedText('');
            setProgressVal(0);
          }}
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
          Page {activePage + 1} of {totalPages}
        </span>
        <button 
          className="rotate-card-btn" 
          disabled={activePage === totalPages - 1} 
          onClick={() => {
            setActivePage(prev => prev + 1);
            setExtractedText('');
            setProgressVal(0);
          }}
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* High-res page rendering viewport */}
      <div 
        style={{
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          borderRadius: '4px',
          border: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: '#ffffff',
          lineHeight: 0
        }}
      >
        {loadingPage ? (
          <div style={{ width: '400px', height: '560px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#151529' }}>
            <div className="modal-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
          </div>
        ) : (
          <img 
            src={pageImg} 
            alt={`Page ${activePage + 1}`} 
            style={{ display: 'block', maxWidth: '100%', height: 'auto', maxHeight: '600px', pointerEvents: 'none' }} 
          />
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <Workspace
        title="OCR PDF"
        icon={FileSearch}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Extract Text from Page"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <div>
          <h3 className="options-title">OCR Text Extraction</h3>

          {/* Loader and progress status indicator */}
          {processing && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                {progressStatus}
              </span>
              
              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progressVal}%`,
                  height: '100%',
                  background: 'var(--accent-gradient)',
                  transition: 'width 0.2s ease'
                }}></div>
              </div>
              <span style={{ fontSize: '0.75rem', alignSelf: 'flex-end', color: 'var(--text-muted)' }}>
                {progressVal}% Complete
              </span>
            </div>
          )}

          {/* Output text box */}
          {extractedText ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                <Sparkles size={16} style={{ color: 'var(--secondary-color)' }} />
                Extracted Text Output
              </div>

              <textarea
                value={extractedText}
                readOnly
                style={{
                  width: '100%',
                  height: '240px',
                  padding: '0.75rem',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(7,7,20,0.8)',
                  color: 'var(--text-main)',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  resize: 'vertical',
                  lineHeight: '1.4'
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCopyText}
                  style={{ flex: 1, padding: '0.5rem' }}
                >
                  <Copy size={14} />
                  Copy Text
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDownloadText}
                  style={{ flex: 1, padding: '0.5rem' }}
                >
                  <Download size={14} />
                  Download .txt
                </button>
              </div>
            </div>
          ) : (
            !processing && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Click the <strong>Extract Text</strong> button below to run optical character recognition on Page {activePage + 1}. All scanning runs completely client-side in your browser.
              </p>
            )
          )}
        </div>
      </Workspace>
    </>
  );
}
