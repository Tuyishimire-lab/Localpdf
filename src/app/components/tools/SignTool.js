'use client';

import { useState, useEffect, useRef } from 'react';
import { PenTool, ChevronLeft, ChevronRight, Check, Trash2, Edit } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf, renderPageToDataUrl } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { PDFDocument } from 'pdf-lib';

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
  const [signatureImage, setSignatureImage] = useState(null);
  const [drawingMode, setDrawingMode] = useState('draw'); // 'draw' or 'type'
  const [typedName, setTypedName] = useState('');
  const [signatureColor, setSignatureColor] = useState('#000000'); // Black ink, Blue ink (#0000b3), Red ink (#cc0000)
  const [typedFont, setTypedFont] = useState('Great Vibes'); // Calligraphy fonts

  // Signature placement states
  const [signaturePosition, setSignaturePosition] = useState({ x: 40, y: 70 }); // Percentages
  const [signatureSize, setSignatureSize] = useState({ width: 140, height: 60 });
  const [signatureAdded, setSignatureAdded] = useState(false);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const viewportRef = useRef(null);

  // Render active page thumbnail
  useEffect(() => {
    async function renderViewport() {
      if (!pdfDoc) return;
      try {
        setLoadingPage(true);
        // Render page at 1.2 scale for accurate signing coordinates
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

  // Canvas drawing handlers
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
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setActivePage(0);
    setSignatureAdded(false);
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
    setSignatureAdded(false);
    setProcessedBlob(null);
  };

  // Convert canvas/text signature to image
  const saveSignature = () => {
    if (drawingMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Ensure canvas has drawings (not completely empty)
      const ctx = canvas.getContext('2d');
      const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const isBlank = !buffer.data.some(channel => channel !== 0);
      if (isBlank) {
        alert("Please draw your signature first.");
        return;
      }
      
      setSignatureImage(canvas.toDataURL('image/png'));
      setSignatureAdded(true);
    } else {
      if (!typedName.trim()) {
        alert("Please type your name.");
        return;
      }
      
      // Create a temporary canvas to render text in the cursive font
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 450;
      tempCanvas.height = 150;
      const ctx = tempCanvas.getContext('2d');
      
      ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.fillStyle = signatureColor;
      
      // Select font styling matching Google font configurations
      ctx.font = `italic 42px "${typedFont}", "Caveat", "Brush Script MT", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, tempCanvas.width / 2, tempCanvas.height / 2);
      
      setSignatureImage(tempCanvas.toDataURL('image/png'));
      setSignatureAdded(true);
    }
  };

  // Draggable signature mouse handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    if (!signatureAdded) return;
    
    const viewport = viewportRef.current;
    if (!viewport) return;
    
    const rect = viewport.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = signaturePosition.x;
    const initY = signaturePosition.y;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const newXPercent = initX + (deltaX / rect.width) * 100;
      const newYPercent = initY + (deltaY / rect.height) * 100;
      
      const widthPercent = (signatureSize.width / rect.width) * 100;
      const heightPercent = (signatureSize.height / rect.height) * 100;

      setSignaturePosition({
        x: Math.max(0, Math.min(100 - widthPercent, newXPercent)),
        y: Math.max(0, Math.min(100 - heightPercent, newYPercent))
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleProcess = async () => {
    if (!signatureImage || !signatureAdded) {
      alert("Please add a signature to the document first.");
      return;
    }

    setProcessing(true);
    setModalOpen(true);

    try {
      const fileBytes = await files[0].arrayBuffer();
      const pdfDocObj = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      
      // Load base64 signature image
      const embeddedSigImage = await pdfDocObj.embedPng(signatureImage);
      const pages = pdfDocObj.getPages();
      const targetPage = pages[activePage];
      const { width, height } = targetPage.getSize();

      // Fetch dimensions of rendered preview viewport element
      const viewport = viewportRef.current;
      const rect = viewport.getBoundingClientRect();

      // Map percentages to PDF coordinate points
      const pdfX = (signaturePosition.x / 100) * width;
      const pdfWidth = (signatureSize.width / rect.width) * width;
      const pdfHeight = (signatureSize.height / rect.height) * height;
      
      // PDF coordinate starts at bottom-left corner
      const pdfY = height - ((signaturePosition.y / 100) * height) - pdfHeight;

      // Draw the PNG signature image onto target PDF page layer
      targetPage.drawImage(embeddedSigImage, {
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight
      });

      const pdfBytes = await pdfDocObj.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Signature stamping failed:", err);
      alert("Failed to sign PDF document.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    downloadFile(processedBlob, `${name}_signed.pdf`);
  };

  const leftPane = files.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem' }}>
      
      {/* Top page navigator controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(7,7,20,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-md)' }}>
        <button 
          className="rotate-card-btn" 
          disabled={activePage === 0} 
          onClick={() => setActivePage(prev => prev - 1)}
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
          onClick={() => setActivePage(prev => prev + 1)}
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Main page signing canvas viewport */}
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
            
            {/* Draggable signature overlay wrapper */}
            {signatureAdded && signatureImage && (
              <div
                onMouseDown={handleMouseDown}
                style={{
                  position: 'absolute',
                  left: `${signaturePosition.x}%`,
                  top: `${signaturePosition.y}%`,
                  width: `${signatureSize.width}px`,
                  height: `${signatureSize.height}px`,
                  cursor: 'move',
                  border: '2px dashed var(--primary-color)',
                  backgroundColor: 'rgba(255,71,87,0.05)',
                  boxSizing: 'border-box',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <img 
                  src={signatureImage} 
                  alt="Signature placement" 
                  style={{ width: '100%', height: '100%', pointerEvents: 'none', objectFit: 'contain' }} 
                />
                
                {/* Visual handle identifier */}
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '12px',
                  height: '12px',
                  background: 'var(--primary-color)',
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }}></div>
              </div>
            )}
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
        processLabel="Sign PDF & Export"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        {!signatureAdded ? (
          <div>
            <h3 className="options-title">Create Your Signature</h3>
            
            {/* Draw / Type Tab selection buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button 
                type="button"
                className={`btn-secondary ${drawingMode === 'draw' ? 'btn-active' : ''}`}
                onClick={() => setDrawingMode('draw')}
                style={{ flex: 1, borderColor: drawingMode === 'draw' ? 'var(--primary-color)' : '' }}
              >
                Draw
              </button>
              <button 
                type="button"
                className={`btn-secondary ${drawingMode === 'type' ? 'btn-active' : ''}`}
                onClick={() => setDrawingMode('type')}
                style={{ flex: 1, borderColor: drawingMode === 'type' ? 'var(--primary-color)' : '' }}
              >
                Type
              </button>
            </div>

            {/* Ink color options picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ink Color:</span>
              {['#000000', '#0000b3', '#cc0000'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSignatureColor(color)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: signatureColor === color ? '2px solid white' : '1px solid transparent',
                    cursor: 'pointer',
                    boxShadow: signatureColor === color ? '0 0 8px rgba(255,255,255,0.4)' : 'none'
                  }}
                ></button>
              ))}
            </div>

            {/* Drawing Canvas Area */}
            {drawingMode === 'draw' ? (
              <div>
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={130}
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
                    touchAction: 'none'
                  }}
                />
                <button 
                  type="button"
                  className="btn-secondary" 
                  onClick={clearCanvas} 
                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem' }}
                >
                  Clear Sketch
                </button>
              </div>
            ) : (
              /* Text Input Cursive fonts option */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Type your signature name..."
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(7,7,20,0.8)',
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-sans)'
                  }}
                />
                
                {/* Font selection list dropdown */}
                <select
                  value={typedFont}
                  onChange={(e) => setTypedFont(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(7,7,20,0.8)',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="Great Vibes">Cursive: Great Vibes</option>
                  <option value="Alex Brush">Calligraphy: Alex Brush</option>
                  <option value="Caveat">Handwritten: Caveat</option>
                </select>

                {/* Live typography design test preview */}
                {typedName && (
                  <div style={{
                    backgroundColor: '#ffffff',
                    color: signatureColor,
                    padding: '1rem',
                    borderRadius: 'var(--border-radius-md)',
                    textAlign: 'center',
                    fontSize: '2rem',
                    fontWeight: '700',
                    fontFamily: `"${typedFont}", "Caveat", cursive`,
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)'
                  }}>
                    {typedName}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={saveSignature}
              style={{ width: '100%', marginTop: '1.25rem' }}
            >
              <Check size={16} />
              Confirm & Apply Signature
            </button>
          </div>
        ) : (
          /* Signature placement controllers styling */
          <div>
            <h3 className="options-title">Adjust Signature Overlay</h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(255,255,255,0.03)',
              padding: '1rem',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', background: '#ffffff', padding: '0.5rem', borderRadius: '4px', height: '60px' }}>
                <img src={signatureImage} alt="Active signature" style={{ maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              
              <div>
                <label style={{ display: 'flex', justifyContent: 'between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span>Signature Scale (Width)</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>{signatureSize.width}px</span>
                </label>
                <input
                  type="range"
                  min="60"
                  max="300"
                  value={signatureSize.width}
                  onChange={(e) => {
                    const w = parseInt(e.target.value);
                    // Maintain standard 7:3 aspect ratio approximately
                    setSignatureSize({
                      width: w,
                      height: Math.round(w * 0.43)
                    });
                  }}
                  style={{ width: '100%' }}
                />
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSignatureAdded(false);
                }}
                style={{ width: '100%', color: 'var(--error-color)', borderColor: 'rgba(255, 107, 129, 0.2)' }}
              >
                <Trash2 size={14} />
                Edit / Redo Signature
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', lineHeight: '1.4' }}>
              Drag the signature directly on the visual page preview to place it. Adjust the size using the scale slider above.
            </p>
          </div>
        )}
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Signing Document..."
        description="Embedding signature png, recalculating coordinates and compiling PDF layers..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Signed PDF"
      />
    </>
  );
}
