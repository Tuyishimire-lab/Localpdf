'use client';

import { useState, useEffect } from 'react';
import { Minimize2, FileText } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf, renderPageToBlob } from '../../../lib/pdfEngine';
import { compressPdfLossless } from '../../../lib/qpdfEngine';
import { createBatchZip } from '../../../lib/batchZip';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';
import { PDFDocument } from 'pdf-lib';

export default function CompressTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState('lossless');
  const [compressionStats, setCompressionStats] = useState(null);

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
    setCompressionStats(null);
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
    setCompressionStats(null);
  };

  const compressSingleFile = async (file, existingDoc = null) => {
    if (compressionLevel === 'lossless') {
      const fileBytes = await file.arrayBuffer();
      const { bytes } = await compressPdfLossless(fileBytes);
      return new Blob([bytes], { type: 'application/pdf' });
    }

    let scale = 1.0;
    let quality = 0.7;
    if (compressionLevel === 'extreme') {
      scale = 0.8;
      quality = 0.55;
    } else if (compressionLevel === 'low') {
      scale = 1.4;
      quality = 0.85;
    }

    let docToUse = existingDoc;
    let ownsDoc = false;
    if (!docToUse) {
      docToUse = await loadPdf(file);
      ownsDoc = true;
    }

    try {
      const compressedPdf = await PDFDocument.create();
      for (let i = 1; i <= docToUse.numPages; i++) {
        const imageBlob = await renderPageToBlob(docToUse, i, scale, 'image/jpeg', quality);
        const imageBytes = await imageBlob.arrayBuffer();
        const embeddedImage = await compressedPdf.embedJpg(imageBytes);

        const { width, height } = embeddedImage.scale(1.0);
        const page = compressedPdf.addPage([width, height]);

        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const pdfBytes = await compressedPdf.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
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
    setCompressionStats(null);

    try {
      const originalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
      let finalBlob;
      let outputBytesTotal = 0;

      if (files.length === 1) {
        finalBlob = await compressSingleFile(files[0], pdfDoc);
        outputBytesTotal = finalBlob.size;
        setResultName(`${files[0].name.replace(/\.pdf$/i, '')}_compressed.pdf`);
      } else {
        const outputs = [];
        for (const file of files) {
          const blob = await compressSingleFile(file, null);
          outputBytesTotal += blob.size;
          outputs.push({
            name: `${file.name.replace(/\.pdf$/i, '')}_compressed.pdf`,
            blob,
          });
        }
        finalBlob = await createBatchZip(outputs);
        setResultName('compressed_pdfs.zip');
      }

      const savedPercent =
        originalSize > 0
          ? Math.round(((originalSize - outputBytesTotal) / originalSize) * 100)
          : 0;
      setCompressionStats({
        originalSize,
        compressedSize: outputBytesTotal,
        savedPercent,
      });
      setProcessedBlob(finalBlob);
      setProcessing(false);
    } catch (err) {
      console.error('Compression error:', err);
      toast.error(err?.message || 'Failed to compress PDF.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, resultName || 'compressed_document.pdf');
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
        title="Compress PDF"
        icon={Minimize2}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={files.length > 1 ? `Compress ${files.length} PDFs` : 'Compress PDF'}
        processing={processing}
        multiple={true}
        leftPane={leftPane}
      >
        <h3 className="options-title">Compression Settings</h3>

        <div className="options-group">
          <label className="options-label">Compression Level</label>

          <div
            className={`tool-card ${compressionLevel === 'lossless' ? 'active' : ''}`}
            style={{
              padding: '1rem',
              cursor: 'pointer',
              borderColor: compressionLevel === 'lossless' ? 'var(--primary-color)' : 'var(--border-color)',
              background: compressionLevel === 'lossless' ? 'rgba(255, 71, 87, 0.05)' : 'var(--bg-card)',
            }}
            onClick={() => setCompressionLevel('lossless')}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Lossless Vector (Recommended)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Preserves crisp text, links, and forms while recompressing streams and pruning unused objects.
            </div>
          </div>

          <div
            className={`tool-card ${compressionLevel === 'extreme' ? 'active' : ''}`}
            style={{
              padding: '1rem',
              cursor: 'pointer',
              borderColor: compressionLevel === 'extreme' ? 'var(--primary-color)' : 'var(--border-color)',
              background: compressionLevel === 'extreme' ? 'rgba(255, 71, 87, 0.05)' : 'var(--bg-card)',
            }}
            onClick={() => setCompressionLevel('extreme')}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Extreme Compression (Raster)</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Downscales and re-encodes pages as JPEG. Ideal for heavy scanned PDFs (flattens text).
            </div>
          </div>

          <div
            className={`tool-card ${compressionLevel === 'recommended' ? 'active' : ''}`}
            style={{
              padding: '1rem',
              cursor: 'pointer',
              borderColor: compressionLevel === 'recommended' ? 'var(--primary-color)' : 'var(--border-color)',
              background: compressionLevel === 'recommended' ? 'rgba(255, 71, 87, 0.05)' : 'var(--bg-card)',
            }}
            onClick={() => setCompressionLevel('recommended')}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Balanced Scan Compression</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Medium raster quality for image-heavy scans.
            </div>
          </div>

          <div
            className={`tool-card ${compressionLevel === 'low' ? 'active' : ''}`}
            style={{
              padding: '1rem',
              cursor: 'pointer',
              borderColor: compressionLevel === 'low' ? 'var(--primary-color)' : 'var(--border-color)',
              background: compressionLevel === 'low' ? 'rgba(255, 71, 87, 0.05)' : 'var(--bg-card)',
            }}
            onClick={() => setCompressionLevel('low')}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>High Quality Raster</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Higher resolution raster output for scanned documents.
            </div>
          </div>
        </div>

        {compressionStats && (
          <div
            style={{
              background: 'rgba(46, 213, 115, 0.08)',
              border: '1px solid rgba(46, 213, 115, 0.25)',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.82rem',
              color: 'var(--text-main)',
            }}
          >
            <div><strong>Original:</strong> {formatBytes(compressionStats.originalSize)}</div>
            <div><strong>Output:</strong> {formatBytes(compressionStats.compressedSize)}</div>
            <div style={{ color: compressionStats.savedPercent >= 0 ? 'var(--success-color)' : 'var(--text-muted)', fontWeight: 700, marginTop: '2px' }}>
              {compressionStats.savedPercent >= 0
                ? `Saved ${compressionStats.savedPercent}%`
                : `Size changed by +${Math.abs(compressionStats.savedPercent)}% (already compressed)`}
            </div>
          </div>
        )}
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Compressing PDF..."
        description="Scaling and optimizing document pages..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel={files.length > 1 ? 'Download Batch ZIP' : 'Download Compressed PDF'}
        resultBlob={processedBlob}
        resultFileName={resultName || 'compressed_document.pdf'}
        currentToolId="compress"
        inputSize={totalInputSize}
      />
    </>
  );
}
