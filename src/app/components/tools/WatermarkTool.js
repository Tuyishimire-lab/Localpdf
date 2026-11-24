'use client';

import { useState, useEffect } from 'react';
import { Type, Upload, FileText } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { loadPdfLibSafely } from '../../../lib/pdfGuard';
import { getVisualPageBox, mapVisualPointToPdf } from '../../../lib/pdfCoords';
import { createBatchZip } from '../../../lib/batchZip';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';
import { rgb, degrees, StandardFonts } from 'pdf-lib';

function fileToPngPayload(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 150;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        canvas.toBlob(async (blob) => {
          canvas.width = 0;
          canvas.height = 0;
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Failed to decode watermark image.'));
            return;
          }
          const bytes = new Uint8Array(await blob.arrayBuffer());
          resolve({
            dataUrl,
            bytes,
            width: img.naturalWidth || img.width || 300,
            height: img.naturalHeight || img.height || 150,
            name: file.name,
          });
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unsupported image format. Please choose PNG, JPG, or WebP.'));
    };
    img.src = objectUrl;
  });
}

export default function WatermarkTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);

  const [watermarkMode, setWatermarkMode] = useState('text'); // 'text' | 'image'
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkImage, setWatermarkImage] = useState(null);
  const [imageScale, setImageScale] = useState(0.3);

  const [fontSize, setFontSize] = useState(50);
  const [rotation, setRotation] = useState(45);
  const [opacity, setOpacity] = useState(0.3);
  const [color, setColor] = useState('#ff0000');
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [gridPosition, setGridPosition] = useState('center');
  const [tileMode, setTileMode] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  const handleFilesSelected = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setFiles((prev) => [...prev, ...selectedFiles]);
    setProcessedBlob(null);

    if (files.length === 0 && selectedFiles.length === 1) {
      try {
        const doc = await loadPdf(selectedFiles[0]);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF', err);
        toast.error('Failed to load PDF file.');
        setFiles([]);
      }
    } else {
      pdfDoc?.destroy?.();
      setPdfDoc(null);
      setTotalPages(0);
    }
  };

  const handleClear = () => {
    pdfDoc?.destroy?.();
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setProcessedBlob(null);
    setResultName('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = await fileToPngPayload(file);
      setWatermarkImage(payload);
    } catch (err) {
      toast.error(err?.message || 'Failed to read watermark image.');
    } finally {
      e.target.value = '';
    }
  };

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const getAnchorPoints = (visualWidth, visualHeight, itemW, itemH) => {
    if (tileMode) {
      const points = [];
      const cols = 3;
      const rows = 4;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = ((c + 0.5) / cols) * visualWidth;
          const cy = ((r + 0.5) / rows) * visualHeight;
          points.push({ vx: cx - itemW / 2, vy: cy - itemH / 2 });
        }
      }
      return points;
    }

    const [row, col] = gridPosition.split('-');
    let vx = (visualWidth - itemW) / 2;
    let vy = (visualHeight - itemH) / 2;

    if (gridPosition !== 'center') {
      if (col === 'left') vx = 35;
      else if (col === 'right') vx = Math.max(0, visualWidth - itemW - 35);
      else vx = (visualWidth - itemW) / 2;

      if (row === 'top') vy = 35;
      else if (row === 'bottom') vy = Math.max(0, visualHeight - itemH - 35);
      else vy = (visualHeight - itemH) / 2;
    }

    return [{ vx, vy }];
  };

  const stampSinglePdf = async (file) => {
    const fileBytes = await file.arrayBuffer();
    const targetPdf = await loadPdfLibSafely(fileBytes);
    const pages = targetPdf.getPages();
    const rotDeg = parseInt(rotation, 10) || 0;
    const alpha = parseFloat(opacity);

    if (watermarkMode === 'image') {
      const embeddedImg = await targetPdf.embedPng(watermarkImage.bytes);
      const ratio = watermarkImage.height / Math.max(1, watermarkImage.width);

      for (const page of pages) {
        const box = getVisualPageBox(page);
        const targetW = box.visualWidth * imageScale;
        const targetH = targetW * ratio;
        const points = getAnchorPoints(box.visualWidth, box.visualHeight, targetW, targetH);

        for (const pt of points) {
          const mapped = mapVisualPointToPdf(page, pt.vx, pt.vy, targetW, targetH);
          page.drawImage(embeddedImg, {
            x: mapped.x,
            y: mapped.y,
            width: targetW,
            height: targetH,
            opacity: alpha,
            rotate: degrees((mapped.rotateAngle + rotDeg + 360) % 360),
          });
        }
      }
    } else {
      let embeddedFont = StandardFonts.HelveticaBold;
      if (fontFamily === 'TimesRoman') embeddedFont = StandardFonts.TimesRomanBold;
      else if (fontFamily === 'Courier') embeddedFont = StandardFonts.CourierBold;

      const font = await targetPdf.embedFont(embeddedFont);
      const { r, g, b } = hexToRgb(color);
      const effectiveSize = tileMode ? Math.max(14, Math.min(fontSize, 36)) : fontSize;
      const textWidth = font.widthOfTextAtSize(watermarkText, effectiveSize);
      const textHeight = effectiveSize;

      for (const page of pages) {
        const box = getVisualPageBox(page);
        const points = getAnchorPoints(box.visualWidth, box.visualHeight, textWidth, textHeight);

        for (const pt of points) {
          const mapped = mapVisualPointToPdf(page, pt.vx, pt.vy, textWidth, textHeight);
          page.drawText(watermarkText, {
            x: mapped.x,
            y: mapped.y,
            size: effectiveSize,
            font,
            color: rgb(r, g, b),
            opacity: alpha,
            rotate: degrees((mapped.rotateAngle + rotDeg + 360) % 360),
          });
        }
      }
    }

    const pdfBytes = await targetPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    if (watermarkMode === 'text' && !watermarkText.trim()) {
      toast.error('Please enter watermark text.');
      return;
    }
    if (watermarkMode === 'image' && !watermarkImage) {
      toast.error('Please upload a watermark image.');
      return;
    }

    setProcessing(true);
    setModalOpen(true);

    try {
      if (files.length === 1) {
        const blob = await stampSinglePdf(files[0]);
        const name = `${files[0].name.replace(/\.pdf$/i, '')}_watermarked.pdf`;
        setResultName(name);
        setProcessedBlob(blob);
      } else {
        const outputs = [];
        for (const file of files) {
          const blob = await stampSinglePdf(file);
          outputs.push({
            name: `${file.name.replace(/\.pdf$/i, '')}_watermarked.pdf`,
            blob,
          });
        }
        const zipBlob = await createBatchZip(outputs);
        setResultName('watermarked_pdfs.zip');
        setProcessedBlob(zipBlob);
      }
      setProcessing(false);
    } catch (err) {
      console.error('Watermark error:', err);
      toast.error(err?.message || 'Failed to apply watermark.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, resultName || 'watermarked_document.pdf');
  };

  const leftPane =
    files.length === 1 && pdfDoc ? (
      <div style={{ width: '100%' }}>
        <div className="preview-grid">
          {Array.from({ length: totalPages }, (_, i) => (
            <PagePreview
              key={i}
              pdfDoc={pdfDoc}
              pageNum={i + 1}
              label={(i + 1).toString()}
            />
          ))}
        </div>
      </div>
    ) : files.length > 0 ? (
      <div className="file-list-container">
        {files.map((file, idx) => (
          <div key={`${file.name}-${idx}`} className="file-item-card">
            <div className="file-item-left">
              <FileText size={20} style={{ color: 'var(--primary-color)' }} aria-hidden="true" />
              <div className="file-item-info">
                <div className="file-item-name">{file.name}</div>
                <div className="file-item-size">{formatBytes(file.size)}</div>
              </div>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Queued</span>
          </div>
        ))}
      </div>
    ) : null;

  const positions = [
    { id: 'top-left', label: '↖' },
    { id: 'top-center', label: '↑' },
    { id: 'top-right', label: '↗' },
    { id: 'center-left', label: '←' },
    { id: 'center', label: '•' },
    { id: 'center-right', label: '→' },
    { id: 'bottom-left', label: '↙' },
    { id: 'bottom-center', label: '↓' },
    { id: 'bottom-right', label: '↘' },
  ];

  const totalInputSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <>
      <Workspace
        title="Watermark PDF"
        icon={Type}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={files.length > 1 ? `Watermark ${files.length} PDFs` : 'Apply Watermark'}
        processing={processing}
        multiple={true}
        leftPane={leftPane}
      >
        <h3 className="options-title">Watermark Type</h3>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setWatermarkMode('text')}
            style={{
              flex: 1,
              borderColor: watermarkMode === 'text' ? 'var(--primary-color)' : 'var(--border-color)',
            }}
          >
            Text
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setWatermarkMode('image')}
            style={{
              flex: 1,
              borderColor: watermarkMode === 'image' ? 'var(--primary-color)' : 'var(--border-color)',
            }}
          >
            Image / Logo
          </button>
        </div>

        {watermarkMode === 'text' ? (
          <>
            <div className="options-group">
              <label className="options-label">Watermark Text</label>
              <input
                type="text"
                className="options-input"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="e.g. DRAFT"
              />
            </div>

            <div className="options-group">
              <label className="options-label">Font Type</label>
              <select
                className="options-select"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                <option value="Helvetica">Helvetica Bold</option>
                <option value="TimesRoman">Times New Roman Bold</option>
                <option value="Courier">Courier Bold</option>
              </select>
            </div>

            <div className="options-group slider-group">
              <div className="slider-val-container">
                <label className="options-label">Font Size</label>
                <span className="slider-val">{fontSize} px</span>
              </div>
              <input
                type="range"
                className="range-slider"
                min="12"
                max="120"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="options-group">
              <label className="options-label">Watermark Color</label>
              <input
                type="color"
                className="options-input"
                style={{ height: '40px', padding: '4px', cursor: 'pointer' }}
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="options-group">
            <label className="options-label">Upload Watermark Image (PNG, JPG, WebP)</label>
            <label
              className="btn-secondary"
              style={{ width: '100%', cursor: 'pointer', textAlign: 'center' }}
            >
              <Upload size={15} aria-hidden="true" />
              {watermarkImage ? `Change (${watermarkImage.name})` : 'Choose Image File'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
            {watermarkImage && (
              <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', marginTop: '0.5rem' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={watermarkImage.dataUrl}
                  alt="Watermark preview"
                  style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            )}
            <div className="options-group slider-group" style={{ marginTop: '0.5rem' }}>
              <div className="slider-val-container">
                <label className="options-label">Logo Width</label>
                <span className="slider-val">{Math.round(imageScale * 100)}%</span>
              </div>
              <input
                type="range"
                className="range-slider"
                min="0.1"
                max="0.7"
                step="0.05"
                value={imageScale}
                onChange={(e) => setImageScale(parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}

        <div className="options-group slider-group">
          <div className="slider-val-container">
            <label className="options-label">Rotation Angle</label>
            <span className="slider-val">{rotation}°</span>
          </div>
          <input
            type="range"
            className="range-slider"
            min="-90"
            max="90"
            value={rotation}
            onChange={(e) => setRotation(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="options-group slider-group">
          <div className="slider-val-container">
            <label className="options-label">Opacity</label>
            <span className="slider-val">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            className="range-slider"
            min="0.1"
            max="1.0"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
          />
        </div>

        <div className="options-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={tileMode}
              onChange={(e) => setTileMode(e.target.checked)}
              style={{ accentColor: 'var(--primary-color)' }}
            />
            Repeat Diagonal Tile Grid (3×4)
          </label>
        </div>

        {!tileMode && (
          <div className="options-group">
            <label className="options-label">Position Placement</label>
            <div className="watermark-grid-helper">
              {positions.map((pos) => (
                <button
                  type="button"
                  key={pos.id}
                  className={`watermark-grid-cell ${gridPosition === pos.id ? 'active' : ''}`}
                  onClick={() => setGridPosition(pos.id)}
                  aria-label={`Position ${pos.id}`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Adding Watermark..."
        description="Stamping watermark onto PDF layers..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel={files.length > 1 ? 'Download Batch ZIP' : 'Download Watermarked PDF'}
        resultBlob={processedBlob}
        resultFileName={resultName || 'watermarked_document.pdf'}
        currentToolId="watermark"
        inputSize={totalInputSize}
      />
    </>
  );
}
