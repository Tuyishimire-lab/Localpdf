'use client';

import { useState, useEffect } from 'react';
import { Crop, ChevronLeft, ChevronRight } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf, renderPageToDataUrl } from '../../../lib/pdfEngine';
import { applyCropMarginsToPdf } from '../../../lib/pdfCropAndGray';
import { downloadFile } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export default function CropTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [pageImg, setPageImg] = useState(null);
  const [pageDims, setPageDims] = useState({ width: 612, height: 792 });

  const [top, setTop] = useState(36);
  const [right, setRight] = useState(36);
  const [bottom, setBottom] = useState(36);
  const [left, setLeft] = useState(36);
  const [pageRange, setPageRange] = useState('');

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  useEffect(() => {
    let cancelled = false;
    async function renderPreview() {
      if (!pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(activePage + 1);
        const vp = page.getViewport({ scale: 1.0 });
        page.cleanup?.();
        const url = await renderPageToDataUrl(pdfDoc, activePage + 1, 1.1);
        if (!cancelled) {
          setPageDims({ width: vp.width, height: vp.height });
          setPageImg(url);
        }
      } catch (err) {
        console.error('Crop preview error:', err);
      }
    }
    renderPreview();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, activePage]);

  const handleFilesSelected = async (selected) => {
    const file = selected?.[0];
    if (!file) return;
    pdfDoc?.destroy?.();
    setFiles([file]);
    setActivePage(0);
    setProcessedBlob(null);

    try {
      const doc = await loadPdf(file);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.error('Load PDF error:', err);
      toast.error('Failed to load PDF file.');
      setFiles([]);
    }
  };

  const handleClear = () => {
    pdfDoc?.destroy?.();
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setActivePage(0);
    setPageImg(null);
    setProcessedBlob(null);
  };

  const applyPreset = (pts) => {
    setTop(pts);
    setRight(pts);
    setBottom(pts);
    setLeft(pts);
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setModalOpen(true);
    setProcessedBlob(null);

    try {
      const bytes = await files[0].arrayBuffer();
      const outBytes = await applyCropMarginsToPdf(bytes, {
        top,
        right,
        bottom,
        left,
        pageRange,
      });
      setProcessedBlob(new Blob([outBytes], { type: 'application/pdf' }));
      setProcessing(false);
    } catch (err) {
      console.error('Crop error:', err);
      toast.error(err?.message || 'Failed to crop PDF.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !files[0]) return;
    const stem = files[0].name.replace(/\.pdf$/i, '');
    downloadFile(processedBlob, `${stem}_cropped.pdf`);
  };

  const topPct = Math.min(45, (top / Math.max(1, pageDims.height)) * 100);
  const bottomPct = Math.min(45, (bottom / Math.max(1, pageDims.height)) * 100);
  const leftPct = Math.min(45, (left / Math.max(1, pageDims.width)) * 100);
  const rightPct = Math.min(45, (right / Math.max(1, pageDims.width)) * 100);

  const leftPane =
    files.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem' }}>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(7,7,20,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-md)' }}>
            <button
              type="button"
              className="rotate-card-btn"
              disabled={activePage === 0}
              onClick={() => setActivePage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              Page {activePage + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="rotate-card-btn"
              disabled={activePage === totalPages - 1}
              onClick={() => setActivePage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        <div style={{ position: 'relative', display: 'inline-block', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', background: '#ffffff', lineHeight: 0 }}>
          {pageImg && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pageImg}
                alt={`Page ${activePage + 1} crop preview`}
                style={{ display: 'block', maxWidth: '100%', maxHeight: '62vh', height: 'auto' }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: `${topPct}%`,
                  bottom: `${bottomPct}%`,
                  left: `${leftPct}%`,
                  right: `${rightPct}%`,
                  border: '2px dashed #ff4757',
                  boxShadow: '0 0 0 9999px rgba(10, 12, 24, 0.35)',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      <Workspace
        title="Crop PDF"
        icon={Crop}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Apply CropBox"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Margin Trim Presets</h3>
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <button type="button" className="btn-secondary" onClick={() => applyPreset(0)} style={{ flex: 1, padding: '0.45rem' }}>None</button>
          <button type="button" className="btn-secondary" onClick={() => applyPreset(36)} style={{ flex: 1, padding: '0.45rem' }}>0.5 in (36pt)</button>
          <button type="button" className="btn-secondary" onClick={() => applyPreset(72)} style={{ flex: 1, padding: '0.45rem' }}>1 in (72pt)</button>
        </div>

        {[
          { label: 'Top Margin', value: top, setter: setTop },
          { label: 'Right Margin', value: right, setter: setRight },
          { label: 'Bottom Margin', value: bottom, setter: setBottom },
          { label: 'Left Margin', value: left, setter: setLeft },
        ].map((ctrl) => (
          <div key={ctrl.label} className="options-group slider-group">
            <div className="slider-val-container">
              <label className="options-label">{ctrl.label}</label>
              <span className="slider-val">{ctrl.value} pt</span>
            </div>
            <input
              type="range"
              className="range-slider"
              min="0"
              max="200"
              step="4"
              value={ctrl.value}
              onChange={(e) => ctrl.setter(parseInt(e.target.value, 10))}
            />
          </div>
        ))}

        <div className="options-group">
          <label className="options-label">Pages (optional, e.g. 1-3, 5)</label>
          <input
            type="text"
            className="options-input"
            value={pageRange}
            onChange={(e) => setPageRange(e.target.value)}
            placeholder="All pages"
          />
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Cropping PDF..."
        description="Updating CropBox boundaries losslessly..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Cropped PDF"
        resultBlob={processedBlob}
        resultFileName={files[0] ? `${files[0].name.replace(/\.pdf$/i, '')}_cropped.pdf` : 'cropped.pdf'}
        currentToolId="crop"
        inputSize={files[0]?.size}
      />
    </>
  );
}

