'use client';

import { useState, useEffect } from 'react';
import { Scissors, FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf } from '../../../lib/pdfEngine';
import { loadPdfLibSafely } from '../../../lib/pdfGuard';
import { splitPdfByMaxSize, computeBookmarkRanges } from '../../../lib/pdfSplitBySize';
import { createBatchZip } from '../../../lib/batchZip';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

async function resolveOutlineBookmarks(pdfDoc) {
  try {
    const outline = await pdfDoc.getOutline();
    if (!outline || outline.length === 0) return [];
    const items = [];
    for (const entry of outline) {
      let dest = entry.dest;
      if (typeof dest === 'string') {
        dest = await pdfDoc.getDestination(dest);
      }
      if (Array.isArray(dest) && dest[0]) {
        const pageIndex = await pdfDoc.getPageIndex(dest[0]);
        items.push({ title: entry.title || `Chapter ${pageIndex + 1}`, page: pageIndex + 1 });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export default function SplitBySizeTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [bookmarks, setBookmarks] = useState([]);

  const [mode, setMode] = useState('size'); // 'size' | 'bookmarks'
  const [maxMb, setMaxMb] = useState(10);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [partsSummary, setPartsSummary] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

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
    setProcessedBlob(null);
    setPartsSummary([]);

    try {
      const doc = await loadPdf(file);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      const foundBookmarks = await resolveOutlineBookmarks(doc);
      setBookmarks(foundBookmarks);
    } catch (err) {
      console.error('Split by size load error:', err);
      toast.error('Failed to load PDF file.');
      setFiles([]);
    }
  };

  const handleClear = () => {
    pdfDoc?.destroy?.();
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setBookmarks([]);
    setProcessedBlob(null);
    setPartsSummary([]);
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setModalOpen(true);
    setProcessedBlob(null);

    try {
      const fileBytes = await files[0].arrayBuffer();
      const stem = files[0].name.replace(/\.pdf$/i, '');

      if (mode === 'bookmarks') {
        const ranges = computeBookmarkRanges(bookmarks, totalPages);
        if (ranges.length === 0) {
          setProcessing(false);
          setModalOpen(false);
          toast.error('This PDF does not contain clickable outline bookmarks. Use Max File Size mode.');
          return;
        }
        const srcDoc = await loadPdfLibSafely(fileBytes);
        const zipEntries = [];
        const summary = [];

        for (let i = 0; i < ranges.length; i++) {
          const r = ranges[i];
          const subDoc = await PDFDocument.create();
          const indices = [];
          for (let p = r.startPage; p <= r.endPage; p++) indices.push(p - 1);
          const copied = await subDoc.copyPages(srcDoc, indices);
          copied.forEach((p) => subDoc.addPage(p));
          const subBytes = await subDoc.save();
          const safeTitle = r.title.replace(/[^\w.-]+/g, '_').slice(0, 40) || `section_${i + 1}`;
          const name = `${stem}_${i + 1}_${safeTitle}.pdf`;
          zipEntries.push({ name, blob: new Blob([subBytes], { type: 'application/pdf' }) });
          summary.push({ name, startPage: r.startPage, endPage: r.endPage, size: subBytes.length });
        }

        const zipBlob = await createBatchZip(zipEntries);
        setPartsSummary(summary);
        setResultName(`${stem}_chapters.zip`);
        setProcessedBlob(zipBlob);
      } else {
        const maxBytes = Math.max(0.05, Number(maxMb) || 10) * 1024 * 1024;
        const parts = await splitPdfByMaxSize(fileBytes, maxBytes);
        const zipEntries = parts.map((p) => ({
          name: `${stem}_part_${p.partNumber}.pdf`,
          blob: new Blob([p.bytes], { type: 'application/pdf' }),
        }));
        const zipBlob = await createBatchZip(zipEntries);
        setPartsSummary(
          parts.map((p) => ({
            name: `${stem}_part_${p.partNumber}.pdf`,
            startPage: p.startPage,
            endPage: p.endPage,
            size: p.size,
          }))
        );
        setResultName(`${stem}_split_parts.zip`);
        setProcessedBlob(zipBlob);
      }

      setProcessing(false);
    } catch (err) {
      console.error('Split by size error:', err);
      toast.error(err?.message || 'Failed to split PDF.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, resultName || 'split_parts.zip');
  };

  const leftPane =
    files.length > 0 ? (
      <div style={{ padding: '1.25rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="file-item-card">
          <div className="file-item-left">
            <FileText size={20} style={{ color: 'var(--primary-color)' }} aria-hidden="true" />
            <div className="file-item-info">
              <div className="file-item-name">{files[0].name}</div>
              <div className="file-item-size">
                {formatBytes(files[0].size)} · {totalPages} pages · {bookmarks.length} bookmarks detected
              </div>
            </div>
          </div>
        </div>

        {partsSummary.length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.9rem' }}>Generated Parts ({partsSummary.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
              {partsSummary.map((part) => (
                <div key={part.name} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>{part.name} (Pages {part.startPage}–{part.endPage})</span>
                  <strong>{formatBytes(part.size)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      <Workspace
        title="Split PDF by Size / Bookmarks"
        icon={Scissors}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Split into ZIP"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Split Strategy</h3>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMode('size')}
            style={{ flex: 1, borderColor: mode === 'size' ? 'var(--primary-color)' : undefined }}
          >
            Max File Size
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setMode('bookmarks')}
            style={{ flex: 1, borderColor: mode === 'bookmarks' ? 'var(--primary-color)' : undefined }}
          >
            Bookmarks ({bookmarks.length})
          </button>
        </div>

        {mode === 'size' ? (
          <div className="options-group">
            <label className="options-label">Maximum Size per Part (MB)</label>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {[5, 10, 25].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMaxMb(preset)}
                  style={{ flex: 1, padding: '0.4rem', borderColor: maxMb === preset ? 'var(--primary-color)' : undefined }}
                >
                  {preset} MB
                </button>
              ))}
            </div>
            <input
              type="number"
              className="options-input"
              min="0.1"
              step="0.5"
              value={maxMb}
              onChange={(e) => setMaxMb(parseFloat(e.target.value) || 1)}
            />
          </div>
        ) : (
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {bookmarks.length > 0
              ? `Found ${bookmarks.length} top-level outline bookmarks. Each chapter will be exported as its own PDF inside the ZIP.`
              : 'No outline bookmarks detected in this PDF.'}
          </div>
        )}
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Splitting PDF..."
        description="Packing split PDF parts into a ZIP archive..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download ZIP Archive"
        resultBlob={processedBlob}
        resultFileName={resultName || 'split_parts.zip'}
        currentToolId="split-by-size"
        inputSize={files[0]?.size}
      />
    </>
  );
}

