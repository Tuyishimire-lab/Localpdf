'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Type, 
  Square, 
  PenTool, 
  MousePointer, 
  Bold, 
  Italic, 
  Undo2 
} from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf, renderPageToDataUrl } from '../../../lib/pdfEngine';
import { loadPdfLibSafely } from '../../../lib/pdfGuard';
import { mapNormalizedRectToPdf } from '../../../lib/pdfCoords';
import { downloadFile } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';
import { rgb, degrees } from 'pdf-lib';

function hexToPdfRgb(hex) {
  if (!hex || hex === 'transparent') return rgb(1, 1, 1);
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 1 : r, isNaN(g) ? 1 : g, isNaN(b) ? 1 : b);
}

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

  // Fabric.js state & refs
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const prevPageRef = useRef(0);
  const [fabricLib, setFabricLib] = useState(null);
  const [canvasObjects, setCanvasObjects] = useState({}); // { [pageIndex]: { objects: [], width: number, height: number } }
  const canvasObjectsRef = useRef({});
  const undoStacksRef = useRef({});
  const currentSnapshotRef = useRef([]);
  const isRestoringRef = useRef(false);
  const activePageRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    activePageRef.current = activePage;
    setCanUndo((undoStacksRef.current[activePage]?.length || 0) > 0);
  }, [activePage]);

  useEffect(() => {
    canvasObjectsRef.current = canvasObjects;
  }, [canvasObjects]);

  // Prevent global CSS resets (like canvas { max-width: 100%; }) from corrupting Fabric's layout sizes
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .canvas-container {
        max-width: none !important;
        max-height: none !important;
      }
      .lower-canvas, .upper-canvas {
        max-width: none !important;
        max-height: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Tool states
  const [zoom, setZoom] = useState(1.0);
  const zoomRef = useRef(1.0);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const handleZoomChange = (newZoom) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const clampedZoom = Math.min(Math.max(newZoom, 0.5), 3.0);
    setZoom(clampedZoom);

    canvas.setZoom(clampedZoom);
    
    if (canvas.backgroundImage) {
      canvas.setDimensions({
        width: canvas.backgroundImage.width * clampedZoom,
        height: canvas.backgroundImage.height * clampedZoom
      });
    }
    canvas.renderAll();
  };

  const [activeTool, setActiveTool] = useState('select'); // select, text, whiteout, draw
  const [brushColor, setBrushColor] = useState('#ff4757');
  const [brushWidth, setBrushWidth] = useState(4);

  // Active selection properties
  const [selectedType, setSelectedType] = useState(null); // i-text, rect, path, etc.
  const [selectedFontSize, setSelectedFontSize] = useState(20);
  const [selectedFontFamily, setSelectedFontFamily] = useState('Helvetica');
  const [selectedColor, setSelectedColor] = useState('#ff4757');
  const [selectedIsBold, setSelectedIsBold] = useState(false);
  const [selectedIsItalic, setSelectedIsItalic] = useState(false);

  // Dynamically load Fabric.js client-side
  useEffect(() => {
    import('fabric').then((module) => {
      setFabricLib(module.fabric);
    });
  }, []);

  // Render active page viewport image
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

  // Initialize Fabric Canvas once
  useEffect(() => {
    if (!fabricLib || !canvasRef.current) return;

    const canvas = new fabricLib.Canvas(canvasRef.current, {
      width: 400,
      height: 560,
      backgroundColor: '#ffffff'
    });

    fabricCanvasRef.current = canvas;

    // Handle object selections
    const handleSelection = () => {
      const activeObj = canvas.getActiveObject();
      if (!activeObj) {
        setSelectedType(null);
        return;
      }
      setSelectedType(activeObj.type);
      if (activeObj.type === 'i-text') {
        setSelectedColor(activeObj.fill);
        setSelectedFontSize(activeObj.fontSize);
        setSelectedFontFamily(activeObj.fontFamily);
        setSelectedIsBold(activeObj.fontWeight === 'bold');
        setSelectedIsItalic(activeObj.fontStyle === 'italic');
      } else if (activeObj.type === 'rect') {
        setSelectedColor(activeObj.fill);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelection);

    const recordUndoChange = () => {
      if (isRestoringRef.current) return;
      const pageIdx = activePageRef.current;
      const prevSnap = currentSnapshotRef.current || [];
      const nextSnap = canvas.getObjects().map((obj) => obj.toObject());
      const stack = undoStacksRef.current[pageIdx] || [];
      undoStacksRef.current[pageIdx] = [...stack.slice(-24), prevSnap];
      currentSnapshotRef.current = nextSnap;
      setCanUndo(true);
    };

    canvas.on('object:added', recordUndoChange);
    canvas.on('object:modified', recordUndoChange);
    canvas.on('object:removed', recordUndoChange);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [fabricLib, files.length]);

  // Save current state and load new background image on page changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !pageImg || !fabricLib) return;

    // Save previous active page state to React state before switching
    if (prevPageRef.current !== activePage) {
      const prevIndex = prevPageRef.current;
      
      const objects = canvas.getObjects().map(obj => obj.toObject());
      const rawWidth = canvas.backgroundImage ? canvas.backgroundImage.width : canvas.width / zoomRef.current;
      const rawHeight = canvas.backgroundImage ? canvas.backgroundImage.height : canvas.height / zoomRef.current;

      setCanvasObjects((prev) => ({
        ...prev,
        [prevIndex]: { objects, width: rawWidth, height: rawHeight }
      }));
      
      prevPageRef.current = activePage;
    }

    // Set background image
    isRestoringRef.current = true;
    canvas.clear();
    canvas.isDrawingMode = false;
    setActiveTool('select');

    fabricLib.Image.fromURL(pageImg, (img) => {
      const activeZoom = zoomRef.current;
      canvas.setWidth(img.width * activeZoom);
      canvas.setHeight(img.height * activeZoom);
      canvas.setZoom(activeZoom);
      
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
        scaleX: 1,
        scaleY: 1
      });

      // Restore saved objects if they exist
      const savedData = canvasObjectsRef.current[activePage];
      if (savedData && savedData.objects && savedData.objects.length > 0) {
        fabricLib.util.enlivenObjects(savedData.objects, (enlivenedObjects) => {
          enlivenedObjects.forEach((obj) => {
            canvas.add(obj);
          });
          currentSnapshotRef.current = canvas.getObjects().map((obj) => obj.toObject());
          isRestoringRef.current = false;
          canvas.renderAll();
        });
      } else {
        currentSnapshotRef.current = [];
        isRestoringRef.current = false;
      }
    });
  }, [pageImg, activePage, fabricLib]);

  const handleUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !fabricLib) return;
    const pageIdx = activePageRef.current;
    const stack = undoStacksRef.current[pageIdx] || [];
    if (stack.length === 0) return;

    const previousObjects = stack[stack.length - 1];
    undoStacksRef.current[pageIdx] = stack.slice(0, -1);
    setCanUndo(undoStacksRef.current[pageIdx].length > 0);

    isRestoringRef.current = true;
    canvas.getObjects().forEach((obj) => canvas.remove(obj));
    if (previousObjects.length > 0) {
      fabricLib.util.enlivenObjects(previousObjects, (enlivenedObjects) => {
        enlivenedObjects.forEach((obj) => canvas.add(obj));
        currentSnapshotRef.current = canvas.getObjects().map((obj) => obj.toObject());
        isRestoringRef.current = false;
        setSelectedType(null);
        canvas.renderAll();
      });
    } else {
      currentSnapshotRef.current = [];
      isRestoringRef.current = false;
      setSelectedType(null);
      canvas.renderAll();
    }
  };

  // Handle keyboard nudging, deletion, and Ctrl/Cmd+Z undo
  useEffect(() => {
    const handleKeyDown = (e) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const activeObj = canvas.getActiveObject();
      if (activeObj?.isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const stack = undoStacksRef.current[activePageRef.current] || [];
        if (stack.length > 0) {
          e.preventDefault();
          const prevObjs = stack[stack.length - 1];
          undoStacksRef.current[activePageRef.current] = stack.slice(0, -1);
          setCanUndo(undoStacksRef.current[activePageRef.current].length > 0);
          isRestoringRef.current = true;
          canvas.getObjects().forEach((obj) => canvas.remove(obj));
          if (prevObjs.length > 0 && fabricLib) {
            fabricLib.util.enlivenObjects(prevObjs, (enlivenedObjects) => {
              enlivenedObjects.forEach((obj) => canvas.add(obj));
              currentSnapshotRef.current = canvas.getObjects().map((obj) => obj.toObject());
              isRestoringRef.current = false;
              setSelectedType(null);
              canvas.renderAll();
            });
          } else {
            currentSnapshotRef.current = [];
            isRestoringRef.current = false;
            setSelectedType(null);
            canvas.renderAll();
          }
        }
        return;
      }

      if (!activeObj) return;

      const step = e.shiftKey ? 15 : 2;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          activeObj.set({ top: activeObj.top - step });
          canvas.renderAll();
          break;
        case 'ArrowDown':
          e.preventDefault();
          activeObj.set({ top: activeObj.top + step });
          canvas.renderAll();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          activeObj.set({ left: activeObj.left - step });
          canvas.renderAll();
          break;
        case 'ArrowRight':
          e.preventDefault();
          activeObj.set({ left: activeObj.left + step });
          canvas.renderAll();
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          canvas.remove(activeObj);
          canvas.discardActiveObject();
          canvas.renderAll();
          setSelectedType(null);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fabricLib]);

  const saveCurrentPageState = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects().map(obj => obj.toObject());
    const rawWidth = canvas.backgroundImage ? canvas.backgroundImage.width : canvas.width / zoom;
    const rawHeight = canvas.backgroundImage ? canvas.backgroundImage.height : canvas.height / zoom;

    setCanvasObjects((prev) => ({
      ...prev,
      [activePage]: { objects, width: rawWidth, height: rawHeight }
    }));
  };

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setActivePage(0);
    prevPageRef.current = 0;
    setCanvasObjects({});
    undoStacksRef.current = {};
    currentSnapshotRef.current = [];
    setCanUndo(false);
    setProcessedBlob(null);

    try {
      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.error("Error loading PDF", err);
      toast.error("Failed to load PDF file.");
      setFiles([]);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setActivePage(0);
    prevPageRef.current = 0;
    setPageImg(null);
    setCanvasObjects({});
    undoStacksRef.current = {};
    currentSnapshotRef.current = [];
    setCanUndo(false);
    setProcessedBlob(null);
    setSelectedType(null);
  };

  // Toolbox Operations
  const handleToolSelect = (tool) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !fabricLib) return;

    setActiveTool(tool);

    if (tool === 'draw') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
      canvas.discardActiveObject();
      canvas.renderAll();
    } else {
      canvas.isDrawingMode = false;
      const activeZoom = zoomRef.current || 1;
      const baseWidth = canvas.backgroundImage ? canvas.backgroundImage.width : canvas.width / activeZoom;
      const baseHeight = canvas.backgroundImage ? canvas.backgroundImage.height : canvas.height / activeZoom;

      if (tool === 'text') {
        const text = new fabricLib.IText('Add text overlay', {
          left: Math.max(0, baseWidth / 2 - 80),
          top: Math.max(0, baseHeight / 2 - 15),
          fontFamily: 'Helvetica',
          fontSize: 24,
          fill: brushColor,
          cornerColor: 'var(--primary-color)',
          cornerSize: 8,
          transparentCorners: false
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        setActiveTool('select');
      } else if (tool === 'whiteout') {
        const rect = new fabricLib.Rect({
          left: Math.max(0, baseWidth / 2 - 60),
          top: Math.max(0, baseHeight / 2 - 20),
          width: 120,
          height: 40,
          fill: '#ffffff',
          strokeWidth: 0,
          stroke: 'transparent',
          cornerColor: 'var(--primary-color)',
          cornerSize: 8,
          transparentCorners: false
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        canvas.renderAll();
        setActiveTool('select');
      }
    }
  };

  const updateActiveObject = (key, value) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    if (key === 'isBold') {
      activeObj.set({ fontWeight: value ? 'bold' : 'normal' });
      setSelectedIsBold(value);
    } else if (key === 'isItalic') {
      activeObj.set({ fontStyle: value ? 'italic' : 'normal' });
      setSelectedIsItalic(value);
    } else {
      activeObj.set({ [key]: value });
      if (key === 'fontSize') setSelectedFontSize(value);
      if (key === 'fontFamily') setSelectedFontFamily(value);
      if (key === 'color' || key === 'fill') setSelectedColor(value);
    }

    canvas.renderAll();
  };

  const deleteActiveObject = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      canvas.remove(activeObj);
      canvas.discardActiveObject();
      canvas.renderAll();
      setSelectedType(null);
    }
  };

  const updateBrushColor = (color) => {
    setBrushColor(color);
    const canvas = fabricCanvasRef.current;
    if (canvas && canvas.isDrawingMode) {
      canvas.freeDrawingBrush.color = color;
    }
  };

  // Programmatic Stamping to PDF
  const handleProcess = async () => {
    setProcessing(true);
    setModalOpen(true);

    try {
      saveCurrentPageState(); // Commit active canvas changes
      
      const fileBytes = await files[0].arrayBuffer();
      const pdfDocObj = await loadPdfLibSafely(fileBytes);
      const pages = pdfDocObj.getPages();

      // Combined state map including live unsaved modifications
      const allPagesData = { ...canvasObjectsRef.current };
      if (fabricCanvasRef.current) {
        const canvas = fabricCanvasRef.current;
        const objects = canvas.getObjects().map(obj => obj.toObject());
        const rawWidth = canvas.backgroundImage ? canvas.backgroundImage.width : canvas.width / zoom;
        const rawHeight = canvas.backgroundImage ? canvas.backgroundImage.height : canvas.height / zoom;
        allPagesData[activePage] = { objects, width: rawWidth, height: rawHeight };
      }

      // Loop and project transparent drawings over target PDF pages
      for (let i = 0; i < pages.length; i++) {
        const pageData = allPagesData[i];
        const hasObjects = pageData && pageData.objects && pageData.objects.length > 0;

        if (hasObjects) {
          const targetPage = pages[i];
          const srcW = Math.max(1, pageData.width || 600);
          const srcH = Math.max(1, pageData.height || 800);

          // 1. Draw the native whiteout rectangles directly on the PDF page first (respecting CropBox & /Rotate)
          pageData.objects.forEach((obj) => {
            if (obj.type === 'rect') {
              const objW = obj.width * (obj.scaleX || 1);
              const objH = obj.height * (obj.scaleY || 1);
              const mapped = mapNormalizedRectToPdf(targetPage, {
                x: obj.left / srcW,
                y: obj.top / srcH,
                width: objW / srcW,
                height: objH / srcH,
              });

              targetPage.drawRectangle({
                x: mapped.x,
                y: mapped.y,
                width: mapped.width,
                height: mapped.height,
                color: hexToPdfRgb(obj.fill),
                rotate: degrees(mapped.rotateAngle),
              });
            }
          });

          // 2. Draw any remaining overlays (text, paths) using high-res PNG
          const hasNonRect = pageData.objects.some((obj) => obj.type !== 'rect');
          if (hasNonRect) {
            const tempEl = document.createElement('canvas');
            tempEl.width = srcW;
            tempEl.height = srcH;

            const tempCanvas = new fabricLib.Canvas(tempEl);

            // Load only non-rect overlays
            await new Promise((resolve) => {
              fabricLib.util.enlivenObjects(pageData.objects, (enlivenedObjects) => {
                enlivenedObjects.forEach((obj) => {
                  if (obj.type !== 'rect') {
                    tempCanvas.add(obj);
                  }
                });
                tempCanvas.renderAll();
                resolve();
              });
            });

            // Export the transparent overlay at 2.5x multiplier for crispness
            const overlayDataUrl = tempCanvas.toDataURL({
              format: 'png',
              multiplier: 2.5,
            });

            tempCanvas.dispose();

            // Embed drawing overlay PNG
            const imageBytes = await fetch(overlayDataUrl).then((res) => res.arrayBuffer());
            const embeddedImage = await pdfDocObj.embedPng(imageBytes);
            const mappedFull = mapNormalizedRectToPdf(targetPage, {
              x: 0,
              y: 0,
              width: 1,
              height: 1,
            });

            // Draw the overlay layer matching visual page coordinates
            targetPage.drawImage(embeddedImage, {
              x: mappedFull.x,
              y: mappedFull.y,
              width: mappedFull.width,
              height: mappedFull.height,
              rotate: degrees(mappedFull.rotateAngle),
            });
          }
        }
      }

      const pdfBytes = await pdfDocObj.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Canvas drawing compilation error:", err);
      toast.error(err?.message || "Failed to render drawings onto PDF.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace(/\.pdf$/i, '');
    downloadFile(processedBlob, `${name}_edited.pdf`);
  };

  // leftPane elements mapping
  const leftPane = files.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem' }}>
      
      {/* Navigator & Zoom controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(7,7,20,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-md)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          className="rotate-card-btn" 
          disabled={activePage === 0} 
          onClick={() => {
            saveCurrentPageState();
            setActivePage(prev => prev - 1);
          }}
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: '0.9rem', fontWeight: '700', minWidth: '70px', textAlign: 'center' }}>
          Page {activePage + 1} of {totalPages}
        </span>
        <button 
          className="rotate-card-btn" 
          disabled={activePage === totalPages - 1} 
          onClick={() => {
            saveCurrentPageState();
            setActivePage(prev => prev + 1);
          }}
          type="button"
        >
          <ChevronRight size={16} />
        </button>

        {/* Vertical Divider */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>

        {/* Zoom controls */}
        <button 
          className="rotate-card-btn"
          onClick={() => handleZoomChange(zoom - 0.2)}
          disabled={zoom <= 0.6}
          title="Zoom Out"
          type="button"
          style={{ width: '28px', height: '28px', fontSize: '1.2rem', padding: 0 }}
        >
          -
        </button>
        <span style={{ fontSize: '0.85rem', fontWeight: '700', minWidth: '45px', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button 
          className="rotate-card-btn"
          onClick={() => handleZoomChange(zoom + 0.2)}
          disabled={zoom >= 3.0}
          title="Zoom In"
          type="button"
          style={{ width: '28px', height: '28px', fontSize: '1.2rem', padding: 0 }}
        >
          +
        </button>
        <button 
          className="rotate-card-btn"
          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
          onClick={() => handleZoomChange(1.0)}
          title="Reset Zoom"
          type="button"
        >
          Reset
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>

        <button
          className="rotate-card-btn"
          style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd+Z)"
          type="button"
        >
          <Undo2 size={13} aria-hidden="true" /> Undo
        </button>
      </div>

      {/* Scrollable grid wrapper for zoomed document canvas */}
      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          maxHeight: '68vh',
          overflow: 'auto',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          backgroundColor: 'rgba(7,7,20,0.6)',
          backdropFilter: 'blur(10px)',
          padding: '0.75rem',
          display: 'grid',
          placeItems: 'center'
        }}
      >
        {/* Editor viewport page */}
        <div 
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
          {loadingPage && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(21, 21, 41, 0.6)', zIndex: 15 }}>
              <div className="modal-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
            </div>
          )}
          
          {/* Stable wrapper container for the canvas */}
          <div>
            <canvas ref={canvasRef} />
          </div>
        </div>
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
          <h3 className="options-title">Editor Toolbox</h3>

          {/* Segmented controls representing active tool modes */}
          <div className="segment-control" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            <button
              type="button"
              className={`segment-btn ${activeTool === 'select' ? 'active' : ''}`}
              onClick={() => handleToolSelect('select')}
              title="Select & Arrange"
            >
              <MousePointer size={16} style={{ margin: 'auto' }} />
            </button>
            <button
              type="button"
              className={`segment-btn ${activeTool === 'text' ? 'active' : ''}`}
              onClick={() => handleToolSelect('text')}
              title="Add Text overlay"
            >
              <Type size={16} style={{ margin: 'auto' }} />
            </button>
            <button
              type="button"
              className={`segment-btn ${activeTool === 'whiteout' ? 'active' : ''}`}
              onClick={() => handleToolSelect('whiteout')}
              title="Whiteout (Erase)"
            >
              <Square size={16} style={{ margin: 'auto' }} />
            </button>
            <button
              type="button"
              className={`segment-btn ${activeTool === 'draw' ? 'active' : ''}`}
              onClick={() => handleToolSelect(activeTool === 'draw' ? 'select' : 'draw')}
              title="Freehand Draw"
            >
              <PenTool size={16} style={{ margin: 'auto' }} />
            </button>
          </div>

          {/* Freehand Pen Configurations */}
          {activeTool === 'draw' && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                Freehand Pen Styles
              </span>

              {/* Brush width slider */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  <span>Line Thickness</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>{brushWidth}px</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushWidth}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setBrushWidth(val);
                    const canvas = fabricCanvasRef.current;
                    if (canvas && canvas.isDrawingMode) {
                      canvas.freeDrawingBrush.width = val;
                    }
                  }}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Brush color list */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Pen Color
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {['#ff4757', '#0000b3', '#2ed573', '#ffa502', '#ffffff', '#000000'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateBrushColor(c)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: brushColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer'
                      }}
                    ></button>
                  ))}
                  
                  {/* Custom Brush Color Picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.25rem' }}>
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => updateBrushColor(e.target.value)}
                      style={{
                        border: 'none',
                        background: 'none',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Custom</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active selection configuration panels */}
          {selectedType ? (
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
                {selectedType === 'i-text' ? 'Text Settings' : 'Object Settings'}
              </span>

              {/* Text-specific configuration options */}
              {selectedType === 'i-text' && (
                <>
                  {/* Font Family selector */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                      Font Family
                    </label>
                    <select
                      value={selectedFontFamily}
                      onChange={(e) => updateActiveObject('fontFamily', e.target.value)}
                      className="options-select"
                      style={{
                        padding: '0.6rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'rgba(7,7,20,0.8)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times Roman">Times New Roman</option>
                      <option value="Courier">Courier</option>
                    </select>
                  </div>

                  {/* Font Size slider */}
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      <span>Font Size</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>{selectedFontSize}px</span>
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={selectedFontSize}
                      onChange={(e) => updateActiveObject('fontSize', parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Font formatting B / I */}
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                      Text Styling
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => updateActiveObject('isBold', !selectedIsBold)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.6rem',
                          borderRadius: 'var(--border-radius-md)',
                          backgroundColor: selectedIsBold ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-color)',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <Bold size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveObject('isItalic', !selectedIsItalic)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.6rem',
                          borderRadius: 'var(--border-radius-md)',
                          backgroundColor: selectedIsItalic ? 'var(--secondary-color)' : 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-color)',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <Italic size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Color configurations (Except for paths/drawings which are baked) */}
              {selectedType !== 'path' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    {selectedType === 'rect' ? 'Fill Color' : 'Text Color'}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(selectedType === 'rect'
                      ? ['#ffffff', '#fafaf9', '#fcfcf5', '#f5f5f5', '#f1f1ee', '#000000']
                      : ['#ff4757', '#0000b3', '#2ed573', '#ffa502', '#ffffff', '#000000']
                    ).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateActiveObject('fill', c)}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: c,
                          border: selectedColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer'
                        }}
                      ></button>
                    ))}
                    
                    {/* Custom Object Color Picker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.25rem' }}>
                      <input
                        type="color"
                        value={(selectedType === 'rect'
                          ? ['#ffffff', '#fafaf9', '#fcfcf5', '#f5f5f5', '#f1f1ee', '#000000']
                          : ['#ff4757', '#0000b3', '#2ed573', '#ffa502', '#ffffff', '#000000']
                        ).includes(selectedColor) ? selectedColor : (selectedType === 'rect' ? '#ffffff' : '#ff4757')}
                        onChange={(e) => updateActiveObject('fill', e.target.value)}
                        style={{
                          border: 'none',
                          background: 'none',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Custom</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deletion action */}
              <button
                type="button"
                className="btn-secondary"
                onClick={deleteActiveObject}
                style={{ width: '100%', color: 'var(--error-color)', borderColor: 'rgba(255,107,129,0.2)', padding: '0.5rem', marginTop: '0.5rem' }}
              >
                <Trash2 size={12} />
                Delete Selected Object
              </button>
            </div>
          ) : (
            activeTool !== 'draw' && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Use the toolbox above to draw paths, erase sections (whiteout blocks), or add text overlays. Click objects on the preview to select, scale, rotate, or reconfigure them.
              </p>
            )
          )}
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Compiling PDF Drawings..."
        description="Extracting transparent graphics overlays, executing high-resolution scales, and baking vector lines..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Edited PDF"
        resultBlob={processedBlob}
        resultFileName="edited_document.pdf"
        currentToolId="edit"
        inputSize={files[0]?.size}
      />
    </>
  );
}
