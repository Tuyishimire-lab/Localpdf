'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { EyeOff, ShieldCheck, Trash2, Search, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { addHistoryEntry } from '../../../lib/history';
import { PDFDocument } from 'pdf-lib';

export default function RedactTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // Redaction state: pageNum (1-based) => array of boxes [{ id, x, y, width, height }] (percentages)
  const [redactions, setRedactions] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentBox, setCurrentBox] = useState(null);

  // Keyword search auto-redaction
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState('');

  // Metadata sanitization toggle
  const [sanitizeMetadata, setSanitizeMetadata] = useState(true);

  // Export progress modal
  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setRedactions({});
    setCurrentPage(1);
    setSearchKeyword('');
    setSearchFeedback('');
    setProcessedBlob(null);
    setIsLoadingPdf(true);

    try {
      const buffer = await targetFile.arrayBuffer();
      setPdfArrayBuffer(buffer);

      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.error('Error loading PDF', err);
      alert('Failed to load PDF file.');
      setFiles([]);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setPdfDoc(null);
    setPdfArrayBuffer(null);
    setTotalPages(0);
    setCurrentPage(1);
    setRedactions({});
    setSearchKeyword('');
    setSearchFeedback('');
    setProcessedBlob(null);
    setIsLoadingPdf(false);
  };

  // Render current page onto canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current ? Math.min(containerRef.current.clientWidth || 650, 700) : 600;
      const desiredScale = Math.min(1.5, Math.max(0.8, containerWidth / unscaledViewport.width));

      const viewport = page.getViewport({ scale: desiredScale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      renderCurrentPage();
    }
  }, [pdfDoc, currentPage, renderCurrentPage]);

  // Handle canvas ref mounting callback
  const setCanvasRef = useCallback(
    (node) => {
      canvasRef.current = node;
      if (node && pdfDoc) {
        renderCurrentPage();
      }
    },
    [pdfDoc, renderCurrentPage]
  );

  // Mouse coordinate calculation (percentage 0-100%)
  const getCanvasCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const handleMouseDown = (e) => {
    if (!pdfDoc) return;
    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPos) return;
    const pos = getCanvasCoords(e);
    const x = Math.min(startPos.x, pos.x);
    const y = Math.min(startPos.y, pos.y);
    const width = Math.abs(pos.x - startPos.x);
    const height = Math.abs(pos.y - startPos.y);
    setCurrentBox({ x, y, width, height });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentBox && currentBox.width > 0.8 && currentBox.height > 0.8) {
      const pageBoxes = redactions[currentPage] || [];
      const newBox = { ...currentBox, id: Date.now() + Math.random() };
      setRedactions({
        ...redactions,
        [currentPage]: [...pageBoxes, newBox],
      });
    }
    setCurrentBox(null);
    setStartPos(null);
  };

  const removeRedactionBox = (pageNum, id) => {
    const pageBoxes = redactions[pageNum] || [];
    setRedactions({
      ...redactions,
      [pageNum]: pageBoxes.filter((b) => b.id !== id),
    });
  };

  const clearPageRedactions = () => {
    setRedactions({
      ...redactions,
      [currentPage]: [],
    });
  };

  // Advanced Line-Grouping & Case-Insensitive Keyword Auto-Search
  const handleKeywordAutoRedact = async () => {
    if (!pdfDoc || !searchKeyword.trim()) return;
    setIsSearching(true);
    setSearchFeedback('');
    const query = searchKeyword.trim().toLowerCase().replace(/\s+/g, ' ');
    const newRedactions = { ...redactions };
    let matchCount = 0;
    let totalTextItemsDoc = 0;

    try {
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        const pageBoxes = [...(newRedactions[i] || [])];

        totalTextItemsDoc += textContent.items.length;

        // 1. Direct item string matching (case & space normalized)
        for (const item of textContent.items) {
          if (!item.str || !item.str.trim()) continue;
          const itemText = item.str.toLowerCase().replace(/\s+/g, ' ');

          if (itemText.includes(query)) {
            const tx = item.transform;
            const x = (tx[4] / viewport.width) * 100;
            const y = ((viewport.height - tx[5] - (item.height || 10)) / viewport.height) * 100;
            const width = Math.max(4, (item.width / viewport.width) * 100);
            const height = Math.max(2.5, ((item.height || 12) / viewport.height) * 100);

            pageBoxes.push({
              id: Date.now() + Math.random(),
              x: Math.max(0, x - 0.5),
              y: Math.max(0, y - 0.5),
              width: Math.min(100 - x, width + 1),
              height: Math.min(100 - y, height + 1),
            });
            matchCount++;
          }
        }

        // 2. Line aggregation for multi-word phrases split across text fragments
        if (query.includes(' ') || matchCount === 0) {
          const lines = [];
          for (const item of textContent.items) {
            if (!item.str) continue;
            const tx = item.transform;
            const y = tx[5];
            const x = tx[4];
            let line = lines.find((l) => Math.abs(l.y - y) < 6);

            if (!line) {
              line = { y, items: [] };
              lines.push(line);
            }
            line.items.push({ text: item.str, x, width: item.width || 10, height: item.height || 12 });
          }

          for (const line of lines) {
            line.items.sort((a, b) => a.x - b.x);
            const fullLineStr = line.items.map((it) => it.text).join(' ').toLowerCase().replace(/\s+/g, ' ');

            if (fullLineStr.includes(query)) {
              const minX = Math.min(...line.items.map((it) => it.x));
              const maxX = Math.max(...line.items.map((it) => it.x + it.width));
              const maxHeight = Math.max(...line.items.map((it) => it.height));

              const x = (minX / viewport.width) * 100;
              const y = ((viewport.height - line.y - maxHeight) / viewport.height) * 100;
              const width = Math.max(4, ((maxX - minX) / viewport.width) * 100);
              const height = Math.max(2.5, (maxHeight / viewport.height) * 100);

              const isDup = pageBoxes.some((b) => Math.abs(b.x - x) < 3 && Math.abs(b.y - y) < 3);
              if (!isDup) {
                pageBoxes.push({
                  id: Date.now() + Math.random(),
                  x: Math.max(0, x - 0.5),
                  y: Math.max(0, y - 0.5),
                  width: Math.min(100 - x, width + 1),
                  height: Math.min(100 - y, height + 1),
                });
                matchCount++;
              }
            }
          }
        }

        newRedactions[i] = pageBoxes;
      }

      setRedactions(newRedactions);
      if (matchCount > 0) {
        setSearchFeedback(`Found & redacted ${matchCount} match(es) for "${searchKeyword}".`);
      } else if (totalTextItemsDoc === 0) {
        setSearchFeedback('No text layer found. This appears to be a scanned PDF or image. Use mouse drag to redact.');
      } else {
        setSearchFeedback(`No occurrences found for "${searchKeyword}".`);
      }
    } catch (err) {
      console.error('Error during keyword auto-redact:', err);
      setSearchFeedback('Failed to search document text.');
    } finally {
      setIsSearching(false);
    }
  };

  // Fast synchronous Uint8Array conversion (0 network fetch calls)
  const dataUrlToUint8Array = (dataUrl) => {
    const base64 = dataUrl.split(',')[1];
    const binaryStr = window.atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  };

  // Instant export processing
  const handleProcess = async () => {
    if (!pdfDoc || !files[0] || !pdfArrayBuffer) return;

    setProcessing(true);
    setModalOpen(true);
    setProcessedBlob(null);

    try {
      const srcDoc = await PDFDocument.load(pdfArrayBuffer, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();

      if (sanitizeMetadata) {
        outDoc.setTitle('');
        outDoc.setAuthor('');
        outDoc.setSubject('');
        outDoc.setKeywords([]);
        outDoc.setProducer('LocalPDF Privacy Engine');
        outDoc.setCreator('LocalPDF (Client-Side Redact)');
        outDoc.setCreationDate(new Date(0));
        outDoc.setModificationDate(new Date(0));
      }

      for (let i = 1; i <= totalPages; i++) {
        const pageBoxes = redactions[i] || [];
        const pdfJsPage = await pdfDoc.getPage(i);

        const scale = 2.0;
        const viewport = pdfJsPage.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await pdfJsPage.render({ canvasContext: ctx, viewport }).promise;

        if (pageBoxes.length > 0) {
          ctx.fillStyle = '#000000';
          for (const box of pageBoxes) {
            const bx = (box.x / 100) * canvas.width;
            const by = (box.y / 100) * canvas.height;
            const bw = (box.width / 100) * canvas.width;
            const bh = (box.height / 100) * canvas.height;
            ctx.fillRect(bx, by, bw, bh);
          }
        }

        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const imgBytes = dataUrlToUint8Array(imgDataUrl);
        const embeddedImg = await outDoc.embedJpg(imgBytes);

        const originalViewport = pdfJsPage.getViewport({ scale: 1.0 });
        const newPdfPage = outDoc.addPage([originalViewport.width, originalViewport.height]);

        newPdfPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height,
        });
      }

      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      setProcessedBlob(blob);

      addHistoryEntry({
        tool: 'redact',
        toolLabel: 'Redact & Sanitize PDF',
        fileName: files[0].name,
        inputSize: files[0].size,
        outputSize: blob.size,
      });
    } catch (err) {
      console.error('Redaction failed:', err);
      alert('Failed to redact and sanitize PDF: ' + err.message);
      setModalOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !files[0]) return;
    const baseName = files[0].name.replace(/\.[^/.]+$/, '');
    downloadFile(processedBlob, `${baseName}_redacted_sanitized.pdf`);
    setModalOpen(false);
  };

  const currentRedactions = redactions[currentPage] || [];
  const totalRedactionCount = Object.values(redactions).reduce((sum, list) => sum + list.length, 0);

  // Middle/Left Main Editor Area: Interactive PDF Document Canvas & Page Controls
  const leftPane = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
      {isLoadingPdf || !pdfDoc ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', width: '100%', gap: '0.75rem', color: '#94a3b8' }}>
          <Loader2 className="modal-spinner" size={36} />
          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Loading document canvas into main editor...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
          {/* Top Page Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'var(--surface-color, #1e293b)', padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color, #334155)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className="btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '0.3rem 0.6rem' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '95px', textAlign: 'center' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '0.3rem 0.6rem' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Click & drag on page to blackout text
            </div>

            <button
              className="btn-secondary"
              onClick={clearPageRedactions}
              disabled={currentRedactions.length === 0}
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              <Trash2 size={13} style={{ marginRight: '0.3rem' }} /> Clear Page
            </button>
          </div>

          {/* Interactive Page Canvas with Redaction Overlay */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              margin: '0 auto',
              display: 'inline-block',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
              borderRadius: '0.375rem',
              overflow: 'hidden',
              cursor: 'crosshair',
              userSelect: 'none',
              backgroundColor: '#ffffff',
              minWidth: '320px',
              minHeight: '420px',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <canvas ref={setCanvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />

            {/* Drawn Redaction Boxes for Current Page */}
            {currentRedactions.map((box) => (
              <div
                key={box.id}
                style={{
                  position: 'absolute',
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                  backgroundColor: '#000000',
                  opacity: 0.9,
                  border: '1.5px solid #ef4444',
                  boxSizing: 'border-box',
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRedactionBox(currentPage, box.id);
                  }}
                  title="Remove box"
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    fontSize: '11px',
                    lineHeight: '1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            {/* Live Drawing Box Preview */}
            {isDrawing && currentBox && (
              <div
                style={{
                  position: 'absolute',
                  left: `${currentBox.x}%`,
                  top: `${currentBox.y}%`,
                  width: `${currentBox.width}%`,
                  height: `${currentBox.height}%`,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  border: '2px dashed #ef4444',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Workspace
      title="Redact & Sanitize PDF"
      icon={EyeOff}
      files={files}
      onFilesSelected={handleFilesSelected}
      onClear={handleClear}
      onProcess={handleProcess}
      processLabel="Redact & Sanitize PDF"
      processing={processing}
      multiple={false}
      leftPane={leftPane}
    >
      {/* Right Sidebar Options Panel */}
      <h3 className="options-title">Redaction Options</h3>

      {/* Auto-Redact Search Section */}
      <div className="options-group">
        <label className="options-label">Auto-Redact Keyword</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem', width: '100%' }}>
          <input
            type="text"
            className="options-input"
            placeholder="e.g. AHADI SHOP, SSN, confidential"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleKeywordAutoRedact()}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={handleKeywordAutoRedact}
            disabled={isSearching || !searchKeyword.trim()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Search size={14} style={{ marginRight: '0.35rem' }} /> Auto-Redact Search
          </button>
        </div>
        {searchFeedback && (
          <div
            style={{
              fontSize: '0.8rem',
              color: searchFeedback.includes('No occurrences') ? '#f59e0b' : searchFeedback.includes('scanned') ? '#3b82f6' : '#10b981',
              marginTop: '0.35rem',
              lineHeight: 1.35,
            }}
          >
            {searchFeedback}
          </div>
        )}
      </div>

      {/* Metadata Sanitization Section */}
      <div className="options-group" style={{ marginTop: '0.5rem' }}>
        <label className="options-label">Document Sanitization</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.35rem' }}>
          <input
            type="checkbox"
            checked={sanitizeMetadata}
            onChange={(e) => setSanitizeMetadata(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
          />
          <span>Strip Document Metadata (Author, Title, Dates, Producer)</span>
        </label>
      </div>

      {/* Security Summary Card */}
      <div className="options-group" style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.08)', marginTop: '0.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
          <ShieldCheck size={16} color="#10b981" /> Security Summary
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <div>Current Page Boxes: <strong>{currentRedactions.length}</strong></div>
          <div>Total Document Boxes: <strong>{totalRedactionCount}</strong></div>
          <div>Metadata Sanitizer: <strong>{sanitizeMetadata ? 'Enabled' : 'Disabled'}</strong></div>
        </div>
      </div>

      {/* Download Action Progress Modal */}
      <ProgressModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Redacting & Sanitizing Document"
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        downloadLabel="Download Redacted PDF"
      />
    </Workspace>
  );
}
