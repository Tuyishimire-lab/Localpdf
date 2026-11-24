'use client';

import { useState, useEffect } from 'react';
import { Hash, FileText } from 'lucide-react';
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

export default function PageNumbersTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);

  const [startNum, setStartNum] = useState(1);
  const [format, setFormat] = useState('pageN');
  const [position, setPosition] = useState('bottom-center');
  const [color, setColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(10);
  const [fontFamily, setFontFamily] = useState('Helvetica');

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

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const numberSinglePdf = async (file) => {
    const fileBytes = await file.arrayBuffer();
    const targetPdf = await loadPdfLibSafely(fileBytes);

    let embeddedFont = StandardFonts.Helvetica;
    if (fontFamily === 'TimesRoman') embeddedFont = StandardFonts.TimesRoman;
    else if (fontFamily === 'Courier') embeddedFont = StandardFonts.Courier;

    const font = await targetPdf.embedFont(embeddedFont);
    const pages = targetPdf.getPages();
    const docPages = pages.length;
    const { r, g, b } = hexToRgb(color);
    const pageMargin = 25;
    const [row, col] = position.split('-');

    for (let i = 0; i < docPages; i++) {
      const page = pages[i];
      const { visualWidth, visualHeight } = getVisualPageBox(page);

      const displayNum = startNum + i;
      let text = `${displayNum}`;
      if (format === 'pageN') text = `Page ${displayNum}`;
      else if (format === 'nOfM') text = `${displayNum} of ${docPages}`;

      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = fontSize;

      let vx = (visualWidth - textWidth) / 2;
      if (col === 'left') vx = pageMargin;
      else if (col === 'right') vx = Math.max(0, visualWidth - textWidth - pageMargin);

      let vy = Math.max(0, visualHeight - textHeight - pageMargin);
      if (row === 'top') vy = pageMargin;

      const mapped = mapVisualPointToPdf(page, vx, vy, textWidth, textHeight);

      page.drawText(text, {
        x: mapped.x,
        y: mapped.y,
        size: fontSize,
        font,
        color: rgb(r, g, b),
        rotate: degrees(mapped.rotateAngle),
      });
    }

    const pdfBytes = await targetPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setModalOpen(true);

    try {
      if (files.length === 1) {
        const blob = await numberSinglePdf(files[0]);
        setResultName(`${files[0].name.replace(/\.pdf$/i, '')}_numbered.pdf`);
        setProcessedBlob(blob);
      } else {
        const outputs = [];
        for (const file of files) {
          const blob = await numberSinglePdf(file);
          outputs.push({
            name: `${file.name.replace(/\.pdf$/i, '')}_numbered.pdf`,
            blob,
          });
        }
        const zipBlob = await createBatchZip(outputs);
        setResultName('numbered_pdfs.zip');
        setProcessedBlob(zipBlob);
      }
      setProcessing(false);
    } catch (err) {
      console.error('Page numbering error:', err);
      toast.error(err?.message || 'Failed to inject page numbers.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, resultName || 'numbered_document.pdf');
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

  const totalInputSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <>
      <Workspace
        title="Page Numbers"
        icon={Hash}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={files.length > 1 ? `Number ${files.length} PDFs` : 'Add Page Numbers'}
        processing={processing}
        multiple={true}
        leftPane={leftPane}
      >
        <h3 className="options-title">Position Layout</h3>

        <div className="options-group">
          <label className="options-label">Alignment Position</label>
          <select
            className="options-select"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-center">Bottom Center</option>
            <option value="bottom-right">Bottom Right</option>
            <option value="top-left">Top Left</option>
            <option value="top-center">Top Center</option>
            <option value="top-right">Top Right</option>
          </select>
        </div>

        <h3 className="options-title">Number Settings</h3>

        <div className="options-group">
          <label className="options-label">Numbering Format</label>
          <select
            className="options-select"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="pageN">Page N (e.g. Page 1)</option>
            <option value="nOfM">N of M (e.g. 1 of 5)</option>
            <option value="simple">Simple Integer (e.g. 1)</option>
          </select>
        </div>

        <div className="options-group">
          <label className="options-label">Start Numbering From</label>
          <input
            type="number"
            className="options-input"
            min="1"
            value={startNum}
            onChange={(e) => setStartNum(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </div>

        <div className="options-group">
          <label className="options-label">Font Family</label>
          <select
            className="options-select"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
          >
            <option value="Helvetica">Helvetica (Standard)</option>
            <option value="TimesRoman">Times New Roman</option>
            <option value="Courier">Courier Monospace</option>
          </select>
        </div>

        <div className="options-group slider-group">
          <div className="slider-val-container">
            <label className="options-label">Font Size</label>
            <span className="slider-val">{fontSize} pt</span>
          </div>
          <input
            type="range"
            className="range-slider"
            min="6"
            max="24"
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="options-group">
          <label className="options-label">Text Color</label>
          <input
            type="color"
            className="options-input"
            style={{ height: '40px', padding: '4px', cursor: 'pointer' }}
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Numbering PDF..."
        description="Iterating and drawing page numbers onto the layouts..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel={files.length > 1 ? 'Download Batch ZIP' : 'Download Numbered PDF'}
        resultBlob={processedBlob}
        resultFileName={resultName || 'numbered_document.pdf'}
        currentToolId="page-numbers"
        inputSize={totalInputSize}
      />
    </>
  );
}
