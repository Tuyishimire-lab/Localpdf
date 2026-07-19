'use client';

import { useState } from 'react';
import { FileUp, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { PDFDocument } from 'pdf-lib';

export default function JpgToPdfTool() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState({});
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState('none');
  
  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleFilesSelected = (newFiles) => {
    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPreviews((prev) => ({
        ...prev,
        [file.name + file.size]: url
      }));
    });
  };

  const handleClear = () => {
    Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews({});
    setProcessedBlob(null);
  };

  const removeFile = (index) => {
    const file = files[index];
    const key = file.name + file.size;
    if (previews[key]) {
      URL.revokeObjectURL(previews[key]);
    }
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const moveFile = (index, direction) => {
    const newFiles = [...files];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    setFiles(newFiles);
  };

  const convertImageToPngBytes = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const fileReader = new FileReader();
              fileReader.onload = (event) => {
                resolve({
                  bytes: event.target.result,
                  width: img.naturalWidth,
                  height: img.naturalHeight
                });
              };
              fileReader.onerror = reject;
              fileReader.readAsArrayBuffer(blob);
            } else {
              reject(new Error("Canvas conversion failed"));
            }
          }, 'image/png');
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
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

      for (const file of files) {
        const { bytes, width: imgWidth, height: imgHeight } = await convertImageToPngBytes(file);
        const embeddedImage = await pdfDoc.embedPng(bytes);

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
      alert("Failed to convert images to PDF.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, "compiled_images.pdf");
  };

  const leftPane = (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.25rem' }}>
        {files.map((file, index) => {
          const key = file.name + file.size;
          const url = previews[key];
          return (
            <div key={file.name + index} className="preview-card" style={{ padding: '0.75rem', width: 'auto' }}>
              <div className="preview-badge">{index + 1}</div>
              
              <div className="preview-image-container" style={{ aspectRatio: '1 / 1', height: '120px' }}>
                {url ? (
                  <img src={url} alt={file.name} className="preview-image" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
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
                  disabled={index === files.length - 1} 
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
      />
    </>
  );
}
