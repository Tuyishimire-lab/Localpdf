'use client';

import { useState, useEffect, useRef } from 'react';
import { Edit3, ChevronLeft, ChevronRight, Plus, Trash2, Save } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf, renderPageToDataUrl } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function EditTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [pageImg, setPageImg] = useState(null);
  const [loadingPage, setLoadingPage] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Text layers list
  const [overlays, setOverlays] = useState([]); // [{ id, pageIndex, text, x, y, fontSize, color }]
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [editingOverlayId, setEditingOverlayId] = useState(null);

  const viewportRef = useRef(null);

  // Render active page viewport
  useEffect(() => {
    async function renderViewport() {
      if (!pdfDoc) return;
      try {
        setLoadingPage(true);
        const url = await renderPageToDataUrl(pdfDoc, activePage + 1, 1.2);
        setPageImg(url);
        setLoadingPage(false);
      } catch (err) {
        console.error("Error rendering page viewport:", err);
        setLoadingPage(false);
      }
    }
    renderViewport();
  }, [pdfDoc, activePage]);

  const generateUid = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 11);
  };

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setActivePage(0);
    setOverlays([]);
    setSelectedOverlayId(null);
    setEditingOverlayId(null);
    setProcessedBlob(null);

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
    setOverlays([]);
    setSelectedOverlayId(null);
    setEditingOverlayId(null);
    setProcessedBlob(null);
  };

  const addTextOverlay = () => {
    const newOverlay = {
      id: generateUid(),
      pageIndex: activePage,
      text: 'Double click to edit text',
      x: 30, // Percentage width
      y: 40, // Percentage height
      fontSize: 16,
      color: '#ff4757' // Default color matches primary accent
    };
    
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  const updateSelectedOverlay = (key, val) => {
    setOverlays((prev) =>
      prev.map((item) => (item.id === selectedOverlayId ? { ...item, [key]: val } : item))
    );
  };

  const deleteSelectedOverlay = () => {
    setOverlays((prev) => prev.filter((item) => item.id !== selectedOverlayId));
    setSelectedOverlayId(null);
  };

  // Draggable overlay handlers
  const handleOverlayMouseDown = (e, id) => {
    e.stopPropagation();
    setSelectedOverlayId(id);
    
    // Ignore dragging if double-clicked to edit inline
    if (editingOverlayId === id) return;

    const viewport = viewportRef.current;
    if (!viewport) return;
    
    const rect = viewport.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    
    const item = overlays.find((o) => o.id === id);
    if (!item) return;

    const initX = item.x;
    const initY = item.y;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const newXPercent = initX + (deltaX / rect.width) * 100;
      const newYPercent = initY + (deltaY / rect.height) * 100;

      setOverlays((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                x: Math.max(0, Math.min(90, newXPercent)),
                y: Math.max(0, Math.min(95, newYPercent))
              }
            : o
        )
      );
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Convert Hex codes to PDF RGB color array
  const hexToPdfRgb = (hex) => {
    try {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return rgb(r, g, b);
    } catch (e) {
      return rgb(0, 0, 0); // Fallback to black
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    setModalOpen(true);

    try {
      const fileBytes = await files[0].arrayBuffer();
      const pdfDocObj = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const pages = pdfDocObj.getPages();
      
      // Embed standard Helvetica font
      const helveticaFont = await pdfDocObj.embedFont(StandardFonts.Helvetica);

      // Loop through and stamp all overlay text items
      for (const item of overlays) {
        if (item.pageIndex >= pages.length) continue;
        
        const targetPage = pages[item.pageIndex];
        const { width, height } = targetPage.getSize();

        // Convert percentage page positions to PDF coordinate points
        const pdfX = (item.x / 100) * width;
        
        // Font size height offset
        const pdfY = height - ((item.y / 100) * height) - item.fontSize;

        targetPage.drawText(item.text, {
          x: pdfX,
          y: pdfY,
          size: item.fontSize,
          font: helveticaFont,
          color: hexToPdfRgb(item.color)
        });
      }

      const pdfBytes = await pdfDocObj.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Text stamping compilation error:", err);
      alert("Failed to render text layers onto PDF.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    downloadFile(processedBlob, `${name}_edited.pdf`);
  };

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);
  const activeOverlays = overlays.filter((o) => o.pageIndex === activePage);

  const leftPane = files.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem' }}>
      
      {/* Navigator controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(7,7,20,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-md)' }}>
        <button 
          className="rotate-card-btn" 
          disabled={activePage === 0} 
          onClick={() => {
            setActivePage(prev => prev - 1);
            setSelectedOverlayId(null);
            setEditingOverlayId(null);
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
            setSelectedOverlayId(null);
            setEditingOverlayId(null);
          }}
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Editor viewport page */}
      <div 
        id="edit-page-viewport"
        ref={viewportRef}
        style={{
          position: 'relative',
          display: 'inline-block',
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
          <>
            <img 
              src={pageImg} 
              alt={`Page ${activePage + 1}`} 
              style={{ display: 'block', maxWidth: '100%', height: 'auto', pointerEvents: 'none' }} 
            />
            
            {/* Render overlay inputs dynamically */}
            {activeOverlays.map((item) => {
              const isSelected = selectedOverlayId === item.id;
              const isEditing = editingOverlayId === item.id;

              return (
                <div
                  key={item.id}
                  onMouseDown={(e) => handleOverlayMouseDown(e, item.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingOverlayId(item.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    cursor: isEditing ? 'text' : 'move',
                    border: isSelected ? '1px dashed var(--primary-color)' : '1px solid transparent',
                    backgroundColor: isSelected ? 'rgba(255, 71, 87, 0.05)' : 'transparent',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    zIndex: isSelected ? 10 : 5,
                    userSelect: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateSelectedOverlay('text', e.target.value)}
                      onBlur={() => setEditingOverlayId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingOverlayId(null);
                      }}
                      autoFocus
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--primary-color)',
                        color: '#000000',
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        fontSize: `${item.fontSize}px`,
                        padding: '1px 4px',
                        outline: 'none'
                      }}
                      onMouseDown={(e) => e.stopPropagation()} // Prevent dragging active input
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        fontSize: `${item.fontSize}px`,
                        color: item.color,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.text}
                    </span>
                  )}
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
        title="Edit PDF"
        icon={Edit3}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Save Edited PDF"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <div>
          <h3 className="options-title">Page Editing Overlays</h3>

          {/* Core overlay creation trigger */}
          <div className="options-group" style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={addTextOverlay}
              style={{ width: '100%' }}
            >
              <Plus size={16} />
              Add Text Label
            </button>
          </div>

          {/* Active selected label configurations panels */}
          {selectedOverlay ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                Label Settings
              </span>

              {/* Text content modifier */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Text Content
                </label>
                <input
                  type="text"
                  value={selectedOverlay.text}
                  onChange={(e) => updateSelectedOverlay('text', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(7,7,20,0.8)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Font size modification slider */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <span>Font Size</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>{selectedOverlay.fontSize}px</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={selectedOverlay.fontSize}
                  onChange={(e) => updateSelectedOverlay('fontSize', parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Color list palette picker */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Text Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['#000000', '#ff4757', '#0000b3', '#2ed573', '#ffa502', '#ffffff'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateSelectedOverlay('color', c)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: selectedOverlay.color === c ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer'
                      }}
                    ></button>
                  ))}
                </div>
              </div>

              {/* Deletion trigger */}
              <button
                type="button"
                className="btn-secondary"
                onClick={deleteSelectedOverlay}
                style={{ width: '100%', color: 'var(--error-color)', borderColor: 'rgba(255,107,129,0.2)', padding: '0.5rem', marginTop: '0.5rem' }}
              >
                <Trash2 size={12} />
                Delete Text Label
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Add a text label to the page, double-click it to type inline, and drag it to any position on the preview.
            </p>
          )}
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Compiling PDF Edits..."
        description="Encoding Helvetica font metrics, generating visual text grids, and stamping PDF coordinates..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Edited PDF"
      />
    </>
  );
}
