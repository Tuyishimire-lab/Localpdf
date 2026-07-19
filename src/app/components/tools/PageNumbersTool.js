'use client';

import { useState } from 'react';
import { Hash } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
  const [modalOpen, setModalOpen] = useState(false);

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);

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
    setProcessedBlob(null);
  };

  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const handleProcess = async () => {
    if (!pdfDoc || files.length === 0) return;
    setProcessing(true);
    setModalOpen(true);

    try {
      const fileBytes = await files[0].arrayBuffer();
      const targetPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      
      let embeddedFont = StandardFonts.Helvetica;
      if (fontFamily === 'TimesRoman') embeddedFont = StandardFonts.TimesRoman;
      else if (fontFamily === 'Courier') embeddedFont = StandardFonts.Courier;
      
      const font = await targetPdf.embedFont(embeddedFont);
      const pages = targetPdf.getPages();
      const { r, g, b } = hexToRgb(color);

      for (let i = 0; i < totalPages; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        
        const displayNum = startNum + i;
        let text = `${displayNum}`;
        if (format === 'pageN') text = `Page ${displayNum}`;
        else if (format === 'nOfM') text = `${displayNum} of ${totalPages}`;

        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = fontSize;

        let x = 0;
        let y = 0;
        const pageMargin = 25;

        const [row, col] = position.split('-');

        if (col === 'left') x = pageMargin;
        else if (col === 'center') x = (width - textWidth) / 2;
        else if (col === 'right') x = width - textWidth - pageMargin;

        if (row === 'bottom') y = pageMargin;
        else if (row === 'top') y = height - textHeight - pageMargin;

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font: font,
          color: rgb(r, g, b)
        });
      }

      const pdfBytes = await targetPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Page numbering error:", err);
      alert("Failed to inject page numbers.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    downloadFile(processedBlob, `${name}_numbered.pdf`);
  };

  const leftPane = pdfDoc ? (
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
  ) : null;

  return (
    <>
      <Workspace
        title="Page Numbers"
        icon={Hash}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Add Page Numbers"
        processing={processing}
        multiple={false}
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
            onChange={(e) => setStartNum(Math.max(1, parseInt(e.target.value) || 1))}
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
            onChange={(e) => setFontSize(parseInt(e.target.value))}
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
        downloadLabel="Download Numbered PDF"
      />
    </>
  );
}
