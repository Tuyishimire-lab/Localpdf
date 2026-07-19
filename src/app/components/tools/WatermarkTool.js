'use client';

import { useState } from 'react';
import { Type } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export default function WatermarkTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(50);
  const [rotation, setRotation] = useState(45);
  const [opacity, setOpacity] = useState(0.3);
  const [color, setColor] = useState('#ff0000');
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [gridPosition, setGridPosition] = useState('center');

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
      
      let embeddedFont = StandardFonts.HelveticaBold;
      if (fontFamily === 'TimesRoman') embeddedFont = StandardFonts.TimesRomanBold;
      else if (fontFamily === 'Courier') embeddedFont = StandardFonts.CourierBold;
      
      const font = await targetPdf.embedFont(embeddedFont);
      const pages = targetPdf.getPages();
      const { r, g, b } = hexToRgb(color);

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = fontSize;

        let x = 0;
        let y = 0;

        const [row, col] = gridPosition.split('-');
        
        if (gridPosition === 'center') {
          x = (width - textWidth) / 2;
          y = (height - textHeight) / 2;
        } else {
          if (col === 'left') x = 35;
          else if (col === 'center' || !col) x = (width - textWidth) / 2;
          else if (col === 'right') x = width - textWidth - 35;

          if (row === 'bottom') y = 35;
          else if (row === 'center') y = (height - textHeight) / 2;
          else if (row === 'top') y = height - textHeight - 35;
        }

        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          font: font,
          color: rgb(r, g, b),
          opacity: parseFloat(opacity),
          rotate: degrees(parseInt(rotation)),
        });
      }

      const pdfBytes = await targetPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Watermark error:", err);
      alert("Failed to apply watermark.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    downloadFile(processedBlob, `${name}_watermarked.pdf`);
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

  const positions = [
    { id: 'top-left', label: '↖' },
    { id: 'top-center', label: '↑' },
    { id: 'top-right', label: '↗' },
    { id: 'center-left', label: '←' },
    { id: 'center', label: '•' },
    { id: 'center-right', label: '→' },
    { id: 'bottom-left', label: '↙' },
    { id: 'bottom-center', label: '↓' },
    { id: 'bottom-right', label: '↘' }
  ];

  return (
    <>
      <Workspace
        title="Watermark PDF"
        icon={Type}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Apply Watermark"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Watermark Text</h3>
        
        <div className="options-group">
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
            onChange={(e) => setFontSize(parseInt(e.target.value))}
          />
        </div>

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
            onChange={(e) => setRotation(parseInt(e.target.value))}
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
          <label className="options-label">Watermark Color</label>
          <input 
            type="color" 
            className="options-input" 
            style={{ height: '40px', padding: '4px', cursor: 'pointer' }}
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        <div className="options-group">
          <label className="options-label">Position Placement</label>
          <div className="watermark-grid-helper">
            {positions.map((pos) => (
              <div 
                key={pos.id} 
                className={`watermark-grid-cell ${gridPosition === pos.id ? 'active' : ''}`}
                onClick={() => setGridPosition(pos.id)}
              >
                {pos.label}
              </div>
            ))}
          </div>
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Adding Watermark..."
        description="Stamping watermark text onto PDF layers..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Watermarked PDF"
      />
    </>
  );
}
