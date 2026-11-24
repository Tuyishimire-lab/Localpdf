'use client';

import { useState, useEffect } from 'react';
import { Contrast, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { renderPageToGrayscaleBlob } from '../../../lib/pdfCropAndGray';
import { createBatchZip } from '../../../lib/batchZip';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export default function GrayscaleTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);

  const [dpiScale, setDpiScale] = useState(2.0); // 1.5 = ~110dpi, 2.0 = ~144dpi, 2.5 = ~180dpi
  const [contrast, setContrast] = useState(1.1);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  const handleFilesSelected = async (selected) => {
    if (!selected || selected.length === 0) return;
    setFiles((prev) => [...prev, ...selected]);
    setProcessedBlob(null);

    if (files.length === 0 && selected.length === 1) {
      try {
        const doc = await loadPdf(selected[0]);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Grayscale load error:', err);
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

  const convertSinglePdfToGrayscale = async (file, existingDoc = null) => {
    let docToUse = existingDoc;
    let ownsDoc = false;
    if (!docToUse) {
      docToUse = await loadPdf(file);
      ownsDoc = true;
    }

    try {
      const outPdf = await PDFDocument.create();
      for (let i = 1; i <= docToUse.numPages; i++) {
        const imgBlob = await renderPageToGrayscaleBlob(docToUse, i, {
          scale: dpiScale,
          quality: 0.9,
          contrast,
        });
        const imgBytes = await imgBlob.arrayBuffer();
        const embedded = await outPdf.embedJpg(imgBytes);
        const { width, height } = embedded.scale(1 / dpiScale);
        const page = outPdf.addPage([width, height]);
        page.drawImage(embedded, { x: 0, y: 0, width, height });
      }
      const bytes = await outPdf.save();
      return new Blob([bytes], { type: 'application/pdf' });
    } finally {
      if (ownsDoc) {
        await docToUse?.destroy?.();
      }
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setModalOpen(true);
    setProcessedBlob(null);

    try {
      if (files.length === 1) {
        const blob = await convertSinglePdfToGrayscale(files[0], pdfDoc);
        setResultName(`${files[0].name.replace(/\.pdf$/i, '')}_grayscale.pdf`);
        setProcessedBlob(blob);
      } else {
        const outputs = [];
        for (const file of files) {
          const blob = await convertSinglePdfToGrayscale(file, null);
          outputs.push({
            name: `${file.name.replace(/\.pdf$/i, '')}_grayscale.pdf`,
            blob,
          });
        }
        const zipBlob = await createBatchZip(outputs);
        setResultName('grayscale_pdfs.zip');
        setProcessedBlob(zipBlob);
      }
      setProcessing(false);
    } catch (err) {
      console.error('Grayscale conversion error:', err);
      toast.error(err?.message || 'Failed to convert PDF to grayscale.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, resultName || 'grayscale_document.pdf');
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
        title="Grayscale / Print-Ready PDF"
        icon={Contrast}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={files.length > 1 ? `Convert ${files.length} PDFs` : 'Convert to Grayscale'}
        processing={processing}
        multiple={true}
        leftPane={leftPane}
      >
        <h3 className="options-title">Print-Ready Settings</h3>

        <div className="options-group">
          <label className="options-label">Render Resolution</label>
          <select
            className="options-select"
            value={dpiScale}
            onChange={(e) => setDpiScale(parseFloat(e.target.value))}
          >
            <option value={1.5}>Standard (110 DPI — Smallest Size)</option>
            <option value={2.0}>High Quality (144 DPI — Recommended)</option>
            <option value={2.5}>Crisp Print (180 DPI)</option>
          </select>
        </div>

        <div className="options-group slider-group">
          <div className="slider-val-container">
            <label className="options-label">Contrast Boost</label>
            <span className="slider-val">{Math.round(contrast * 100)}%</span>
          </div>
          <input
            type="range"
            className="range-slider"
            min="0.8"
            max="1.5"
            step="0.05"
            value={contrast}
            onChange={(e) => setContrast(parseFloat(e.target.value))}
          />
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Converts color pages to calibrated grayscale for monochrome office printers and saves ink. Drop multiple PDFs for batch ZIP export.
        </p>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Converting to Grayscale..."
        description="Rendering monochrome luminance pages locally..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel={files.length > 1 ? 'Download Batch ZIP' : 'Download Grayscale PDF'}
        resultBlob={processedBlob}
        resultFileName={resultName || 'grayscale_document.pdf'}
        currentToolId="grayscale"
        inputSize={totalInputSize}
      />
    </>
  );
}

