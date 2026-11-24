'use client';

import { useState } from 'react';
import { Layers, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf, renderPageToDataUrl } from '../../../lib/pdfEngine';
import { loadPdfLibSafely } from '../../../lib/pdfGuard';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';
import { PDFDocument } from 'pdf-lib';

function createItemId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export default function MergeTool() {
  const [items, setItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleFilesSelected = async (newFiles) => {
    const newItems = newFiles.map((file) => ({
      id: createItemId(),
      file,
      pageCount: '...',
      previewUrl: null,
      sizeStr: formatBytes(file.size)
    }));

    setItems((prev) => [...prev, ...newItems]);

    newItems.forEach(async (item) => {
      let pdfDoc = null;
      try {
        pdfDoc = await loadPdf(item.file);
        const pageCount = pdfDoc.numPages;

        let previewUrl = null;
        try {
          previewUrl = await renderPageToDataUrl(pdfDoc, 1, 0.3);
        } catch (e) {
          console.error("Error rendering first page preview", e);
        }

        setItems((prev) =>
          prev.map((entry) =>
            entry.id === item.id ? { ...entry, pageCount, previewUrl } : entry
          )
        );
      } catch (err) {
        console.error("Error parsing PDF", err);
      } finally {
        await pdfDoc?.destroy?.();
      }
    });
  };

  const handleClear = () => {
    setItems([]);
    setProcessedBlob(null);
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

  const removeFile = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleProcess = async () => {
    if (items.length === 0) return;
    setProcessing(true);
    setModalOpen(true);

    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const item of items) {
        const fileBytes = await item.file.arrayBuffer();
        const pdf = await loadPdfLibSafely(fileBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Merging error:", err);
      toast.error(err?.message || "Failed to merge PDF files. Ensure none are password-protected.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, "merged_document.pdf");
  };

  const files = items.map((item) => item.file);

  const leftPane = (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {items.map((item, index) => {
          const { id, file, pageCount, previewUrl, sizeStr } = item;
          return (
            <div key={id} className="preview-card" style={{ padding: '1rem', width: 'auto' }}>
              <div className="preview-badge">{index + 1}</div>
              
              <div className="preview-image-container" style={{ aspectRatio: '1 / 1.414', height: '140px' }}>
                {previewUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={file.name} className="preview-image" />
                  </>
                ) : (
                  <div className="modal-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                )}
              </div>
              
              <div 
                className="preview-name" 
                style={{ fontSize: '0.85rem', fontWeight: '700', marginTop: '0.5rem', textAlign: 'left' }}
                title={file.name}
              >
                {file.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '4px' }}>
                <span>{pageCount} pages</span>
                <span>{sizeStr}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.75rem' }}>
                <button 
                  className="rotate-card-btn" 
                  disabled={index === 0} 
                  onClick={() => moveFile(index, -1)}
                  title="Move Up"
                >
                  <ArrowUp size={12} />
                </button>
                <button 
                  className="rotate-card-btn" 
                  disabled={index === items.length - 1} 
                  onClick={() => moveFile(index, 1)}
                  title="Move Down"
                >
                  <ArrowDown size={12} />
                </button>
                <button 
                  className="rotate-card-btn" 
                  onClick={() => removeFile(index)} 
                  style={{ color: 'var(--error-color)' }}
                  title="Delete"
                >
                  <Trash2 size={12} />
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
        title="Merge PDF"
        icon={Layers}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Merge PDF"
        processing={processing}
        leftPane={leftPane}
      >
        <h3 className="options-title">Merge Settings</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Arrange your files in the desired merge order using the arrows. All operations run client-side.
        </p>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Merging PDF Files..."
        description="Combining your selected files into a single document..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Merged PDF"
        resultBlob={processedBlob}
        resultFileName="merged_document.pdf"
        currentToolId="merge"
      />
    </>
  );
}
