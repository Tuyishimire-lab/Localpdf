'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Download, Archive } from 'lucide-react';
import Workspace from '../Workspace';
import { loadPdf } from '../../../lib/pdfEngine';
import { extractEmbeddedImagesFromPage } from '../../../lib/pdfFormAndImages';
import { createBatchZip } from '../../../lib/batchZip';
import { addHistoryEntry } from '../../../lib/history';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export default function ExtractImagesTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [images, setImages] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  const handleFilesSelected = async (selected) => {
    const file = selected?.[0];
    if (!file) return;
    pdfDoc?.destroy?.();
    setFiles([file]);
    setImages([]);
    setScanning(true);

    try {
      const doc = await loadPdf(file);
      setPdfDoc(doc);
      const found = [];

      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const pageImages = await extractEmbeddedImagesFromPage(page, p);
        found.push(...pageImages);
      }

      setImages(found);
      setScanning(false);

      if (found.length === 0) {
        toast.info('No embedded raster images found in this PDF.');
      } else {
        toast.success(`Extracted ${found.length} embedded image${found.length > 1 ? 's' : ''}.`);
        addHistoryEntry({
          tool: 'extract-images',
          toolLabel: 'Extract Images',
          fileName: file.name,
          inputSize: file.size,
          outputSize: null,
        });
      }
    } catch (err) {
      console.error('Extract images error:', err);
      setScanning(false);
      toast.error('Failed to scan PDF for embedded images.');
    }
  };

  const handleClear = () => {
    pdfDoc?.destroy?.();
    setFiles([]);
    setPdfDoc(null);
    setImages([]);
    setScanning(false);
  };

  const handleDownloadAllZip = async () => {
    if (images.length === 0 || !files[0]) return;
    try {
      const entries = images.map((img, i) => ({
        name: `page_${img.pageNum}_image_${i + 1}.png`,
        blob: img.blob,
      }));
      const zipBlob = await createBatchZip(entries);
      const stem = files[0].name.replace(/\.pdf$/i, '');
      downloadFile(zipBlob, `${stem}_extracted_images.zip`);
    } catch (err) {
      console.error('ZIP build error:', err);
      toast.error('Failed to bundle extracted images.');
    }
  };

  const leftPane =
    files.length > 0 ? (
      <div style={{ width: '100%' }}>
        {scanning ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '3rem' }}>
            <div className="modal-spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }}></div>
            <span>Scanning PDF object streams for embedded images...</span>
          </div>
        ) : images.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No embedded raster images were detected in this PDF. (Vector shapes can be exported via PDF to JPG.)
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {images.map((img, idx) => (
              <div key={img.id} className="preview-card" style={{ padding: '0.75rem', width: 'auto' }}>
                <div className="preview-badge">P{img.pageNum}</div>
                <div className="preview-image-container" style={{ aspectRatio: '1 / 1', height: '130px', background: '#ffffff' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={`Extracted ${idx + 1}`}
                    className="preview-image"
                    style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                  />
                </div>
                <div className="preview-name" style={{ fontSize: '0.78rem', marginTop: '0.45rem' }}>
                  {img.width} × {img.height} px · {formatBytes(img.blob.size)}
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.4rem', fontSize: '0.78rem', marginTop: '0.4rem' }}
                  onClick={() => downloadFile(img.blob, `page_${img.pageNum}_img_${idx + 1}.png`)}
                >
                  <Download size={13} aria-hidden="true" /> Download PNG
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : null;

  return (
    <Workspace
      title="Extract Images"
      icon={ImageIcon}
      files={files}
      onFilesSelected={handleFilesSelected}
      onClear={handleClear}
      onProcess={handleDownloadAllZip}
      processLabel={`Download All as ZIP (${images.length})`}
      processing={scanning || images.length === 0}
      multiple={false}
      leftPane={leftPane}
    >
      <h3 className="options-title">Extraction Summary</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
          <div><strong>Images Found:</strong> {images.length}</div>
          <div><strong>Format:</strong> Original resolution lossless PNG</div>
        </div>
        {images.length > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={handleDownloadAllZip}
            style={{ width: '100%' }}
          >
            <Archive size={15} aria-hidden="true" /> Bundle All ({images.length}) into ZIP
          </button>
        )}
      </div>
    </Workspace>
  );
}

