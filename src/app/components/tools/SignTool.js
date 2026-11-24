'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PenTool, ChevronLeft, ChevronRight, Check, Trash2, Upload, Calendar, Undo2 } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf, renderPageToDataUrl } from '../../../lib/pdfEngine';
import { loadPdfLibSafely } from '../../../lib/pdfGuard';
import { mapNormalizedRectToPdf } from '../../../lib/pdfCoords';
import { downloadFile } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';
import { degrees } from 'pdf-lib';

function createPlacementId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function imageFileToPngDataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 120;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        canvas.width = 0;
        canvas.height = 0;
        URL.revokeObjectURL(url);
        resolve(pngUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode signature image. Please use PNG, JPG, or WebP.'));
    };
    img.src = url;
  });
}

export default function SignTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [pageImg, setPageImg] = useState(null);
  const [loadingPage, setLoadingPage] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Signature creation states
  const [activeSignature, setActiveSignature] = useState(null); // { image, label }
  const [drawingMode, setDrawingMode] = useState('draw'); // 'draw' | 'type' | 'upload'
  const [typedName, setTypedName] = useState('');
  const [signatureColor, setSignatureColor] = useState('#000000');
  const [typedFont, setTypedFont] = useState('Great Vibes');
  const [dateStampText, setDateStampText] = useState('');

  // Multi-page placements + undo history
  const [placements, setPlacements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [undoStack, setUndoStack] = useState([]);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const viewportRef = useRef(null);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  useEffect(() => {
    let cancelled = false;
    async function renderViewport() {
      if (!pdfDoc) return;
      try {
        setLoadingPage(true);
        const url = await renderPageToDataUrl(pdfDoc, activePage + 1, 1.2);
        if (!cancelled) {
          setPageImg(url);
          setLoadingPage(false);
        }
      } catch (err) {
        console.error('Error rendering page viewport:', err);
        if (!cancelled) setLoadingPage(false);
      }
    }
    renderViewport();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, activePage]);

  const commitPlacements = useCallback((nextPlacements, prevSnapshot = null) => {
    setPlacements((curr) => {
      const snap = prevSnapshot || curr;
      setUndoStack((stack) => [...stack.slice(-24), snap]);
      return nextPlacements;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setPlacements(previous);
      setSelectedId(previous[previous.length - 1]?.id || null);
      return stack.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoStack.length, handleUndo]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = signatureColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setActivePage(0);
    setPlacements([]);
    setUndoStack([]);
    setSelectedId(null);
    setProcessedBlob(null);

    try {
      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.error('Error loading PDF', err);
      toast.error('Failed to load PDF file.');
      setFiles([]);
    }
  };

  const handleClear = () => {
    pdfDoc?.destroy?.();
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setActivePage(0);
    setPageImg(null);
    setPlacements([]);
    setUndoStack([]);
    setSelectedId(null);
    setProcessedBlob(null);
  };

  const addOverlayToActivePage = (image, label, size = { width: 150, height: 64 }) => {
    const offset = (placements.filter((p) => p.pageIndex === activePage).length % 4) * 5;
    const newItem = {
      id: createPlacementId(),
      pageIndex: activePage,
      image,
      label,
      x: Math.min(60, 35 + offset),
      y: Math.min(78, 65 - offset),
      width: size.width,
      height: size.height,
    };
    commitPlacements([...placements, newItem], placements);
    setSelectedId(newItem.id);
  };

  const saveSignature = () => {
    if (drawingMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const isBlank = !buffer.data.some((channel) => channel !== 0);
      if (isBlank) {
        toast.error('Please draw your signature first.');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      setActiveSignature({ image: dataUrl, label: 'Signature' });
      addOverlayToActivePage(dataUrl, 'Signature');
    } else if (drawingMode === 'type') {
      if (!typedName.trim()) {
        toast.error('Please type your name.');
        return;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 450;
      tempCanvas.height = 150;
      const ctx = tempCanvas.getContext('2d');
      ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.fillStyle = signatureColor;
      ctx.font = `italic 42px "${typedFont}", "Caveat", "Brush Script MT", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, tempCanvas.width / 2, tempCanvas.height / 2);
      const dataUrl = tempCanvas.toDataURL('image/png');
      tempCanvas.width = 0;
      tempCanvas.height = 0;
      setActiveSignature({ image: dataUrl, label: 'Signature' });
      addOverlayToActivePage(dataUrl, 'Signature');
    }
  };

  const handleSignatureImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await imageFileToPngDataUrl(file);
      setActiveSignature({ image: dataUrl, label: file.name });
      addOverlayToActivePage(dataUrl, 'Uploaded Signature');
    } catch (err) {
      toast.error(err?.message || 'Failed to upload signature image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleAddDateStamp = () => {
    const text = dateStampText.trim() || new Date().toLocaleDateString();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 320;
    tempCanvas.height = 84;
    const ctx = tempCanvas.getContext('2d');
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.fillStyle = signatureColor;
    ctx.font = '600 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);
    const dataUrl = tempCanvas.toDataURL('image/png');
    tempCanvas.width = 0;
    tempCanvas.height = 0;
    addOverlayToActivePage(dataUrl, `Date: ${text}`, { width: 130, height: 36 });
  };

  const handleMouseDown = (e, placement) => {
    e.preventDefault();
    setSelectedId(placement.id);

    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = placement.x;
    const initY = placement.y;
    const snapshotBeforeDrag = placements;
    let moved = false;

    const handleMouseMove = (moveEvent) => {
      moved = true;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newXPercent = initX + (deltaX / Math.max(1, rect.width)) * 100;
      const newYPercent = initY + (deltaY / Math.max(1, rect.height)) * 100;

      const widthPercent = (placement.width / Math.max(1, rect.width)) * 100;
      const heightPercent = (placement.height / Math.max(1, rect.height)) * 100;

      const clampedX = Math.max(0, Math.min(100 - widthPercent, newXPercent));
      const clampedY = Math.max(0, Math.min(100 - heightPercent, newYPercent));

      setPlacements((curr) =>
        curr.map((item) =>
          item.id === placement.id ? { ...item, x: clampedX, y: clampedY } : item
        )
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (moved) {
        setUndoStack((stack) => [...stack.slice(-24), snapshotBeforeDrag]);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const selectedPlacement = placements.find((p) => p.id === selectedId) || null;
  const pagePlacements = placements.filter((p) => p.pageIndex === activePage);

  const handleRemovePlacement = (id) => {
    const next = placements.filter((p) => p.id !== id);
    commitPlacements(next, placements);
    if (selectedId === id) {
      setSelectedId(next[next.length - 1]?.id || null);
    }
  };

  const handleResizeSelected = (newWidth) => {
    if (!selectedPlacement) return;
    const ratio = selectedPlacement.height / Math.max(1, selectedPlacement.width);
    const nextHeight = Math.round(newWidth * ratio);
    setPlacements((curr) =>
      curr.map((item) =>
        item.id === selectedPlacement.id
          ? { ...item, width: newWidth, height: nextHeight }
          : item
      )
    );
  };

  const handleProcess = async () => {
    if (placements.length === 0) {
      toast.error('Please add at least one signature or stamp to the document first.');
      return;
    }

    setProcessing(true);
    setModalOpen(true);

    try {
      const fileBytes = await files[0].arrayBuffer();
      const pdfDocObj = await loadPdfLibSafely(fileBytes);
      const pages = pdfDocObj.getPages();
      const embeddedCache = new Map();

      const viewport = viewportRef.current;
      const rect = viewport?.getBoundingClientRect?.() || { width: 500, height: 700 };

      for (const item of placements) {
        const targetPage = pages[item.pageIndex];
        if (!targetPage) continue;

        let embeddedImg = embeddedCache.get(item.image);
        if (!embeddedImg) {
          embeddedImg = await pdfDocObj.embedPng(item.image);
          embeddedCache.set(item.image, embeddedImg);
        }

        const normRect = {
          x: item.x / 100,
          y: item.y / 100,
          width: item.width / Math.max(1, rect.width),
          height: item.height / Math.max(1, rect.height),
        };
        const mapped = mapNormalizedRectToPdf(targetPage, normRect);

        targetPage.drawImage(embeddedImg, {
          x: mapped.x,
          y: mapped.y,
          width: mapped.width,
          height: mapped.height,
          rotate: degrees(mapped.rotateAngle),
        });
      }

      const pdfBytes = await pdfDocObj.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error('Signature stamping failed:', err);
      toast.error(err?.message || 'Failed to sign PDF document.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace(/\.pdf$/i, '');
    downloadFile(processedBlob, `${name}_signed.pdf`);
  };

  const leftPane =
    files.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(7,7,20,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-md)' }}>
          <button
            className="rotate-card-btn"
            disabled={activePage === 0}
            onClick={() => setActivePage((prev) => prev - 1)}
            type="button"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
            Page {activePage + 1} of {totalPages}
          </span>
          <button
            className="rotate-card-btn"
            disabled={activePage === totalPages - 1}
            onClick={() => setActivePage((prev) => prev + 1)}
            type="button"
            aria-label="Next page"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <div
          id="active-page-viewport"
          ref={viewportRef}
          style={{
            position: 'relative',
            display: 'inline-block',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: '#ffffff',
            lineHeight: 0,
          }}
        >
          {loadingPage ? (
            <div style={{ width: '400px', height: '560px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#151529' }}>
              <div className="modal-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pageImg}
                alt={`Page ${activePage + 1}`}
                style={{ display: 'block', maxWidth: '100%', height: 'auto', pointerEvents: 'none' }}
              />

              {pagePlacements.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleMouseDown(e, item)}
                    style={{
                      position: 'absolute',
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.width}px`,
                      height: `${item.height}px`,
                      cursor: 'move',
                      border: isSelected ? '2px dashed var(--primary-color)' : '1px dashed rgba(78,93,234,0.7)',
                      backgroundColor: isSelected ? 'rgba(255,71,87,0.08)' : 'rgba(78,93,234,0.04)',
                      boxSizing: 'border-box',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.label}
                      style={{ width: '100%', height: '100%', pointerEvents: 'none', objectFit: 'contain' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-6px',
                        right: '-6px',
                        width: '12px',
                        height: '12px',
                        background: 'var(--primary-color)',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                      }}
                    ></div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      <Workspace
        title="Sign PDF"
        icon={PenTool}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={`Sign PDF (${placements.length})`}
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 className="options-title" style={{ margin: 0 }}>Create Signature or Stamp</h3>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl/Cmd+Z)"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
            >
              <Undo2 size={14} aria-hidden="true" /> Undo
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.9rem' }}>
            {[
              { id: 'draw', label: 'Draw' },
              { id: 'type', label: 'Type' },
              { id: 'upload', label: 'Upload' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`btn-secondary ${drawingMode === tab.id ? 'btn-active' : ''}`}
                onClick={() => setDrawingMode(tab.id)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderColor: drawingMode === tab.id ? 'var(--primary-color)' : undefined,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.9rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ink Color:</span>
            {['#000000', '#0000b3', '#cc0000'].map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Select ink color ${c}`}
                onClick={() => setSignatureColor(c)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: signatureColor === c ? '2px solid white' : '1px solid transparent',
                  cursor: 'pointer',
                  boxShadow: signatureColor === c ? '0 0 8px rgba(255,255,255,0.4)' : 'none',
                }}
              />
            ))}
          </div>

          {drawingMode === 'draw' && (
            <div>
              <canvas
                ref={canvasRef}
                width={340}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--border-radius-md)',
                  border: '1px solid var(--border-color)',
                  cursor: 'crosshair',
                  display: 'block',
                  width: '100%',
                  touchAction: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={clearCanvas} style={{ flex: 1, padding: '0.45rem' }}>
                  Clear Sketch
                </button>
                <button type="button" className="btn-primary" onClick={saveSignature} style={{ flex: 1.4, padding: '0.45rem' }}>
                  <Check size={15} aria-hidden="true" /> Place on Page {activePage + 1}
                </button>
              </div>
            </div>
          )}

          {drawingMode === 'type' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <input
                type="text"
                className="options-input"
                placeholder="Type your signature name..."
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
              />
              <select
                className="options-select"
                value={typedFont}
                onChange={(e) => setTypedFont(e.target.value)}
              >
                <option value="Great Vibes">Cursive: Great Vibes</option>
                <option value="Alex Brush">Calligraphy: Alex Brush</option>
                <option value="Caveat">Handwritten: Caveat</option>
              </select>
              {typedName && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    color: signatureColor,
                    padding: '0.75rem',
                    borderRadius: 'var(--border-radius-md)',
                    textAlign: 'center',
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    fontFamily: `"${typedFont}", "Caveat", cursive`,
                    minHeight: '54px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {typedName}
                </div>
              )}
              <button type="button" className="btn-primary" onClick={saveSignature} style={{ width: '100%' }}>
                <Check size={15} aria-hidden="true" /> Place on Page {activePage + 1}
              </button>
            </div>
          )}

          {drawingMode === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <label className="btn-secondary" style={{ width: '100%', cursor: 'pointer', textAlign: 'center' }}>
                <Upload size={15} aria-hidden="true" /> Upload PNG / JPG Signature
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSignatureImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Transparent PNG works best for scanned ink signatures.
              </p>
            </div>
          )}

          {activeSignature && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => addOverlayToActivePage(activeSignature.image, activeSignature.label)}
              style={{ width: '100%', marginTop: '0.65rem', padding: '0.5rem' }}
            >
              Stamp Saved Signature on Page {activePage + 1}
            </button>
          )}

          <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--border-color)' }}>
            <label className="options-label">Quick Date / Text Stamp</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="options-input"
                placeholder="Today's date or Approved"
                value={dateStampText}
                onChange={(e) => setDateStampText(e.target.value)}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddDateStamp}
                style={{ flexShrink: 0, padding: '0.5rem 0.75rem' }}
                title="Place Date Stamp"
              >
                <Calendar size={15} aria-hidden="true" /> Add Date
              </button>
            </div>
          </div>

          {selectedPlacement && (
            <div style={{ marginTop: '0.9rem', padding: '0.75rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <span>Selected Scale ({selectedPlacement.label})</span>
                <span style={{ fontWeight: 'bold' }}>{selectedPlacement.width}px</span>
              </label>
              <input
                type="range"
                className="range-slider"
                min="60"
                max="300"
                value={selectedPlacement.width}
                onChange={(e) => handleResizeSelected(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {placements.length > 0 && (
            <div style={{ marginTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="options-label">Placed Overlays ({placements.length})</span>
              {placements.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    border: `1px solid ${item.id === selectedId ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setActivePage(item.pageIndex);
                    setSelectedId(item.id);
                  }}
                >
                  <span>P{item.pageIndex + 1} · {item.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.label} on page ${item.pageIndex + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlacement(item.id);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Signing Document..."
        description="Embedding signatures and stamps onto PDF layers..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Signed PDF"
        resultBlob={processedBlob}
        resultFileName={files[0] ? `${files[0].name.replace(/\.pdf$/i, '')}_signed.pdf` : 'signed_document.pdf'}
        currentToolId="sign"
        inputSize={files[0]?.size}
      />
    </>
  );
}
