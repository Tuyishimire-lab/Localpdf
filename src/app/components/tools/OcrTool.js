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
  const [ocrResultData, setOcrResultData] = useState(null);

  // New configuration options
  const [language, setLanguage] = useState('eng');
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [binarize, setBinarize] = useState(false);
  const [layoutFormat, setLayoutFormat] = useState('preserve');

  // Canvas contrast boosting and optional binarization preprocessing helper
  const preprocessImage = (imageSrc, options) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (options.enhanceContrast) {
          ctx.filter = 'grayscale(1) contrast(2.2) brightness(0.95)';
        }
        
        ctx.drawImage(img, 0, 0);
        
        if (options.binarize) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= 128) ? 255 : 0;
            data[i] = v;
            data[i+1] = v;
            data[i+2] = v;
          }
          ctx.putImageData(imgData, 0, 0);
        }
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageSrc;
    });
  };

  // Structured OCR formatting engine
  const formatRecognizedData = (data, format) => {
    if (!data) return '';
    
    if (format === 'preserve') {
      const blocks = data.blocks || [];
      let structuredText = "";
      blocks.forEach((block) => {
        if (block.paragraphs) {
          block.paragraphs.forEach((p) => {
            const paragraphText = p.lines.map(line => line.text.trim()).join('\n');
            structuredText += paragraphText + "\n\n";
          });
        }
      });
      return structuredText.trim() || data.text || '';
    }
    
    if (format === 'flow') {
      const blocks = data.blocks || [];
      let flowText = "";
      blocks.forEach((block) => {
        if (block.paragraphs) {
          block.paragraphs.forEach((p) => {
            let paragraphText = p.lines.map(line => line.text.trim()).join(' ');
            paragraphText = paragraphText.replace(/-\s+/g, '');
            flowText += paragraphText + "\n\n";
          });
        }
      });
      return flowText.trim() || data.text || '';
    }
    
    if (format === 'table') {
      const lines = data.lines || [];
      if (lines.length === 0) return data.text || '';
      
      const sortedLines = [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0);
      const rows = [];
      sortedLines.forEach((line) => {
        const midY = (line.bbox.y0 + line.bbox.y1) / 2;
        let matchedRow = rows.find(row => {
          const rowY0 = Math.min(...row.map(l => l.bbox.y0));
          const rowY1 = Math.max(...row.map(l => l.bbox.y1));
          return midY >= rowY0 && midY <= rowY1;
        });
        
        if (matchedRow) {
          matchedRow.push(line);
        } else {
          rows.push([line]);
        }
      });
      
      let tableOutput = "";
      rows.forEach((row) => {
        row.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        const rowText = row.map(item => item.text.trim()).join('\t');
        tableOutput += rowText + '\n';
      });
      
      return tableOutput.trim();
    }
    
    return data.text || '';
  };

  const displayedText = ocrResultData ? formatRecognizedData(ocrResultData, layoutFormat) : '';

  // Render active page thumbnail at 2.5x scale for high-res OCR input
  useEffect(() => {
    async function renderViewport() {
      if (!pdfDoc) return;
      try {
        setLoadingPage(true);
        const url = await renderPageToDataUrl(pdfDoc, activePage + 1, 2.5);
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
    setOcrResultData(null);
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
    setOcrResultData(null);
    setProgressVal(0);
    setProgressStatus('');
  };

  const handleProcess = async () => {
    if (!pageImg) return;
    setProcessing(true);
    setProgressVal(0);
    setProgressStatus('Initializing OCR engine...');

    try {
      setProgressStatus('Preprocessing image for high accuracy...');
      const processedUrl = await preprocessImage(pageImg, { enhanceContrast, binarize });

      const result = await Tesseract.recognize(
        processedUrl,
        language,
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgressStatus(`Recognizing text (${language.toUpperCase()})...`);
              setProgressVal(Math.round(m.progress * 100));
            } else {
              setProgressStatus(`${m.status.charAt(0).toUpperCase() + m.status.slice(1)}...`);
            }
          }
        }
      );

      setOcrResultData(result.data);
      setProcessing(false);
    } catch (err) {
      console.error("OCR recognition error:", err);
      alert("Failed to perform text recognition on this page.");
      setProcessing(false);
    }
  };

  const handleCopyText = () => {
    if (!displayedText) return;
    navigator.clipboard.writeText(displayedText);
    alert("Text copied to clipboard!");
  };

  const handleDownloadText = () => {
    if (!displayedText) return;
    
    const blob = new Blob([displayedText], { type: 'text/plain;charset=utf-8' });
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
            setOcrResultData(null);
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
            setOcrResultData(null);
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
          <h3 className="options-title">OCR Configurations</h3>

          {/* Configuration Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '1.5rem' }}>
            
            {/* Language Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                Document Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="options-select"
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(7,7,20,0.8)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem'
                }}
              >
                <option value="eng">English</option>
                <option value="spa">Spanish (Español)</option>
                <option value="fra">French (Français)</option>
                <option value="deu">German (Deutsch)</option>
                <option value="ita">Italian (Italiano)</option>
                <option value="por">Portuguese (Português)</option>
                <option value="nld">Dutch (Nederlands)</option>
                <option value="chi_sim">Chinese (Simplified)</option>
                <option value="jpn">Japanese (日本語)</option>
              </select>
            </div>

            {/* Preprocessing Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Image Preprocessing
              </span>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={enhanceContrast}
                  onChange={(e) => setEnhanceContrast(e.target.checked)}
                  style={{ accentColor: 'var(--primary-color)' }}
                />
                Enhance Contrast (Auto Grayscale)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={binarize}
                  onChange={(e) => setBinarize(e.target.checked)}
                  style={{ accentColor: 'var(--primary-color)' }}
                />
                Binarize Image (Max Threshold)
              </label>
            </div>

            {/* Layout Reconstructor */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Layout Organization
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { id: 'preserve', label: 'Preserve Layout', desc: 'Maintains multi-column blocks and paragraphs' },
                  { id: 'flow', label: 'Single Text Flow', desc: 'Clean sentences, ideal for copying into Word' },
                  { id: 'table', label: 'Reconstruct Tables', desc: 'CSV/Tab aligned grid (paste to Excel)' }
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLayoutFormat(option.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '6px',
                      border: layoutFormat === option.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      backgroundColor: layoutFormat === option.id ? 'rgba(78,93,234,0.1)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: layoutFormat === option.id ? 'var(--primary-color)' : 'var(--text-main)' }}>
                      {option.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {option.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

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
          {displayedText ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                <Sparkles size={16} style={{ color: 'var(--secondary-color)' }} />
                Extracted Text Output
              </div>

              <textarea
                value={displayedText}
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
