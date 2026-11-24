'use client';

import { useState, useEffect, useRef } from 'react';
import { FileUp, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';
import { PDFDocument } from 'pdf-lib';

function createItemId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export default function JpgToPdfTool() {
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState('none');
  
  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  const handleFilesSelected = (newFiles) => {
    const newItems = newFiles.map((file) => ({
      id: createItemId(),
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleClear = () => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setItems([]);
    setProcessedBlob(null);
  };

  const removeFile = (index) => {
    const target = items[index];
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const moveFile = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const convertImageToPngBytes = (file) => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          canvas.width = 0;
          canvas.height = 0;
          if (!blob) {
            reject(new Error('Canvas conversion failed'));
            return;
          }
          blob.arrayBuffer().then((bytes) => {
            resolve({
              bytes,
              width: img.naturalWidth,
              height: img.naturalHeight
            });
          }).catch(reject);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
      img.src = objectUrl;
    });
  };

  const embedImageFile = async (pdfDoc, file) => {
    const isJpeg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);

    if (isJpeg) {
      try {
        const bytes = await file.arrayBuffer();
        const embedded = await pdfDoc.embedJpg(bytes);
        return { embeddedImage: embedded, width: embedded.width, height: embedded.height };
      } catch (err) {
        console.warn('Direct JPG embed failed, falling back to PNG conversion:', err);
      }
    }

    if (isPng) {
      try {
        const bytes = await file.arrayBuffer();
        const embedded = await pdfDoc.embedPng(bytes);
        return { embeddedImage: embedded, width: embedded.width, height: embedded.height };
      } catch (err) {
        console.warn('Direct PNG embed failed, falling back to canvas PNG conversion:', err);
      }
    }

    const { bytes, width, height } = await convertImageToPngBytes(file);
    const embeddedImage = await pdfDoc.embedPng(bytes);
    return { embeddedImage, width, height };
  };

  const handleProcess = async () => {
    if (items.length === 0) return;
    setProcessing(true);
    setModalOpen(true);

    try {
      const pdfDoc = await PDFDocument.create();

      const A4_WIDTH = 595.27;
      const A4_HEIGHT = 841.89;
      const LETTER_WIDTH = 612;
      const LETTER_HEIGHT = 792;

      let marginVal = 0;
      if (margin === 'small') marginVal = 20;
      else if (margin === 'big') marginVal = 45;

      for (const item of items) {
        const { embeddedImage, width: imgWidth, height: imgHeight } = await embedImageFile(pdfDoc, item.file);

        let pageWidth = A4_WIDTH;
        let pageHeight = A4_HEIGHT;

        if (pageSize === 'letter') {
          pageWidth = LETTER_WIDTH;
          pageHeight = LETTER_HEIGHT;
        } else if (pageSize === 'fit') {
          pageWidth = imgWidth + marginVal * 2;
          pageHeight = imgHeight + marginVal * 2;
        }

        if (pageSize !== 'fit' && orientation === 'landscape') {
          const temp = pageWidth;
          pageWidth = pageHeight;
          pageHeight = temp;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        const usableWidth = pageWidth - marginVal * 2;
        const usableHeight = pageHeight - marginVal * 2;

        let drawWidth = usableWidth;
        let drawHeight = usableHeight;
        
        const imgRatio = imgWidth / imgHeight;
        const pageRatio = usableWidth / usableHeight;

        if (imgRatio > pageRatio) {
          drawHeight = usableWidth / imgRatio;
        } else {
          drawWidth = usableHeight * imgRatio;
        }

        const xPos = marginVal + (usableWidth - drawWidth) / 2;
        const yPos = marginVal + (usableHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x: xPos,
          y: yPos,
          width: drawWidth,
          height: drawHeight
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Image to PDF error:", err);
      toast.error("Failed to convert images to PDF.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, "compiled_images.pdf");
  };

  const files = items.map((item) => item.file);

  const leftPane = (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.25rem' }}>
        {items.map((item, index) => {
          const { id, file, previewUrl: url } = item;
          return (
            <div key={id} className="preview-card" style={{ padding: '0.75rem', width: 'auto' }}>
              <div className="preview-badge">{index + 1}</div>
              
              <div className="preview-image-container" style={{ aspectRatio: '1 / 1', height: '120px' }}>
                {url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={file.name} className="preview-image" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                  </>
                ) : (
                  <div className="modal-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                )}
              </div>
              
              <div 
                className="preview-name" 
                style={{ fontSize: '0.8rem', fontWeight: '700', marginTop: '0.5rem' }}
                title={file.name}
              >
                {file.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>
                {formatBytes(file.size)}
              </div>
              
              <div style={{ display: 'flex', gap: '0.4rem', width: '100%', marginTop: '0.5rem' }}>
                <button 
                  className="rotate-card-btn" 
                  disabled={index === 0} 
                  onClick={() => moveFile(index, -1)}
                  title="Move Left"
                >
                  <ArrowUp size={10} style={{ transform: 'rotate(-90deg)' }} />
                </button>
                <button 
                  className="rotate-card-btn" 
                  disabled={index === items.length - 1} 
                  onClick={() => moveFile(index, 1)}
                  title="Move Right"
                >
                  <ArrowDown size={10} style={{ transform: 'rotate(-90deg)' }} />
                </button>
                <button 
                  className="rotate-card-btn" 
                  onClick={() => removeFile(index)} 
                  style={{ color: 'var(--error-color)' }}
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <Workspace
        title="JPG to PDF"
        icon={FileUp}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Convert to PDF"
        processing={processing}
        accept="image/png, image/jpeg, image/webp"
        leftPane={leftPane}
      >
        <h3 className="options-title">Page Layout</h3>
        
        <div className="options-group">
          <label className="options-label">Page Size</label>
          <select 
            className="options-select" 
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value)}
          >
            <option value="a4">A4 (Standard)</option>
            <option value="letter">US Letter</option>
            <option value="fit">Fit to Image Size</option>
          </select>
        </div>

        {pageSize !== 'fit' && (
          <div className="options-group">
            <label className="options-label">Orientation</label>
            <div className="segment-control">
              <button 
                className={`segment-btn ${orientation === 'portrait' ? 'active' : ''}`}
                onClick={() => setOrientation('portrait')}
              >
                Portrait
              </button>
              <button 
                className={`segment-btn ${orientation === 'landscape' ? 'active' : ''}`}
                onClick={() => setOrientation('landscape')}
              >
                Landscape
              </button>
            </div>
          </div>
        )}

        <div className="options-group">
          <label className="options-label">Margins</label>
          <div className="segment-control">
            <button 
              className={`segment-btn ${margin === 'none' ? 'active' : ''}`}
              onClick={() => setMargin('none')}
            >
              None
            </button>
            <button 
              className={`segment-btn ${margin === 'small' ? 'active' : ''}`}
              onClick={() => setMargin('small')}
            >
              Small
            </button>
            <button 
              className={`segment-btn ${margin === 'big' ? 'active' : ''}`}
              onClick={() => setMargin('big')}
            >
              Big
            </button>
          </div>
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Converting Images..."
        description="Encoding and arranging graphics into PDF pages..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Compiled PDF"
        resultBlob={processedBlob}
        resultFileName="images_converted.pdf"
        currentToolId="jpg-to-pdf"
      />
    </>
  );
}
