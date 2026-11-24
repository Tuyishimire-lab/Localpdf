'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitCompare, Upload, Info, Loader, AlertCircle, Download, FileDiff, Eye } from 'lucide-react';
import PrivacyProofBadge from '../PrivacyProofBadge';
import ProgressSteps from '../ProgressSteps';
import { loadPdf } from '../../../lib/pdfEngine';
import { diffLines, buildDiffReportHtml } from '../../../lib/textDiff';
import { downloadFile } from '../../../lib/utils';
import { addHistoryEntry } from '../../../lib/history';

const CARD = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--border-radius-lg)',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  cursor: 'pointer',
  minHeight: '130px',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  width: '100%',
};

function UploadSlot({ label, file, id, onChange }) {
  const [hover, setHover] = useState(false);
  const triggerInput = () => document.getElementById(id)?.click();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label htmlFor={id} style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${label}`}
        style={{ ...CARD, borderColor: file ? 'var(--success-color)' : hover ? 'var(--primary-color)' : 'var(--border-color)', boxShadow: hover ? 'var(--accent-glow)' : 'none' }}
        onClick={triggerInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerInput();
          }
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onChange({ target: { files: [f] } }); }}
      >
        {file
          ? <>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(46,213,115,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
                <Upload size={20} style={{ color: 'var(--success-color)' }} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)} KB · Click to change</span>
            </>
          : <>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,71,87,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
                <Upload size={20} style={{ color: 'var(--primary-color)' }} />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Select PDF file</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>or drag and drop here</span>
            </>
        }
        <input
          id={id}
          type="file"
          tabIndex={-1}
          aria-hidden="true"
          accept="application/pdf,.pdf"
          style={{ display: 'none' }}
          onClick={(e) => e.stopPropagation()}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

async function extractPageLines(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  try {
    const content = await page.getTextContent();
    const sorted = [...content.items].sort((a, b) => Math.round(b.transform[5]) - Math.round(a.transform[5]) || a.transform[4] - b.transform[4]);
    const lines = [];
    let current = [];
    let lastY = null;
    for (const item of sorted) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (lastY === null || Math.abs(y - lastY) < 5) {
        current.push(item.str);
      } else {
        const line = current.join(' ').replace(/\s+/g, ' ').trim();
        if (line) lines.push(line);
        current = [item.str];
      }
      lastY = y;
    }
    const lastLine = current.join(' ').replace(/\s+/g, ' ').trim();
    if (lastLine) lines.push(lastLine);
    return lines;
  } finally {
    page.cleanup?.();
  }
}

async function renderOffscreenImageData(pdfDoc, pageNum, scale) {
  const page = await pdfDoc.getPage(pageNum);
  try {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const width = canvas.width;
    const height = canvas.height;
    canvas.width = 0;
    canvas.height = 0;
    return { imgData, width, height };
  } finally {
    page.cleanup?.();
  }
}

export default function CompareTool() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [status, setStatus] = useState('idle');
  const [compareStep, setCompareStep] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'text'
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState([]);
  const [diffStats, setDiffStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const bufARef = useRef(null);
  const bufBRef = useRef(null);
  const canvasARef = useRef(null);
  const canvasBRef = useRef(null);
  const canvasDiffRef = useRef(null);

  const handleFileA = (e) => setFileA(e.target.files?.[0] || null);
  const handleFileB = (e) => setFileB(e.target.files?.[0] || null);

  const countPixelDeltas = (imgDataA, imgDataB, width, height) => {
    const dataA = imgDataA.data;
    const dataB = imgDataB.data;
    const strideA = imgDataA.width;
    const strideB = imgDataB.width;
    let diffPixels = 0;
    const totalPixels = width * height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idxA = (y * strideA + x) * 4;
        const idxB = (y * strideB + x) * 4;
        const delta =
          (Math.abs(dataA[idxA] - dataB[idxB]) +
            Math.abs(dataA[idxA + 1] - dataB[idxB + 1]) +
            Math.abs(dataA[idxA + 2] - dataB[idxB + 2])) /
          3;
        if (delta > 15) diffPixels++;
      }
    }
    return { diffPixels, totalPixels };
  };

  const compare = async () => {
    if (!fileA || !fileB) return;
    setStatus('loading');
    setCompareStep(0);
    setProgressLabel('Reading PDF buffers...');
    setErrorMsg('');

    let pdfA = null;
    let pdfB = null;
    try {
      const [bufA, bufB] = await Promise.all([fileA.arrayBuffer(), fileB.arrayBuffer()]);
      bufARef.current = bufA;
      bufBRef.current = bufB;

      [pdfA, pdfB] = await Promise.all([loadPdf(bufA.slice(0)), loadPdf(bufB.slice(0))]);
      const numPages = Math.max(pdfA.numPages, pdfB.numPages);
      const pageResults = [];
      let totalDiffPixels = 0;
      let totalPixels = 0;

      setCompareStep(1);
      for (let p = 1; p <= numPages; p++) {
        setProgressLabel(`Analyzing page ${p} of ${numPages}...`);
        const hasA = p <= pdfA.numPages;
        const hasB = p <= pdfB.numPages;
        const [textLinesA, textLinesB] = await Promise.all([
          hasA ? extractPageLines(pdfA, p) : Promise.resolve([]),
          hasB ? extractPageLines(pdfB, p) : Promise.resolve([]),
        ]);

        if (hasA && hasB) {
          const [rendA, rendB] = await Promise.all([
            renderOffscreenImageData(pdfA, p, 0.75),
            renderOffscreenImageData(pdfB, p, 0.75),
          ]);
          const w = Math.min(rendA.width, rendB.width);
          const h = Math.min(rendA.height, rendB.height);
          const { diffPixels, totalPixels: tp } = countPixelDeltas(rendA.imgData, rendB.imgData, w, h);
          totalDiffPixels += diffPixels;
          totalPixels += tp;
          pageResults.push({
            pageNum: p,
            diffPixels,
            totalPixels: tp,
            hasA,
            hasB,
            textLinesA,
            textLinesB,
          });
        } else {
          pageResults.push({
            pageNum: p,
            diffPixels: -1,
            totalPixels: 0,
            hasA,
            hasB,
            textLinesA,
            textLinesB,
          });
        }
      }

      setCompareStep(2);
      setPages(pageResults);
      setCurrentPage(0);
      setDiffStats({
        totalPages: numPages,
        pagesA: pdfA.numPages,
        pagesB: pdfB.numPages,
        percentDiff: totalPixels > 0 ? ((totalDiffPixels / totalPixels) * 100).toFixed(1) : '0.0',
        changed: pageResults.filter((p) => p.diffPixels !== 0).length,
      });
      setStatus('done');

      addHistoryEntry({
        tool: 'compare',
        toolLabel: 'Compare PDF',
        fileName: `${fileA.name} vs ${fileB.name}`,
        inputSize: fileA.size + fileB.size,
        outputSize: null,
      });
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to compare PDFs. Ensure both files are valid, unencrypted PDFs.');
      setStatus('error');
    } finally {
      await pdfA?.destroy?.();
      await pdfB?.destroy?.();
    }
  };

  // On-demand crisp 1.5x page rendering only for the active page (zero bulk canvas state)
  useEffect(() => {
    if (status !== 'done' || viewMode !== 'visual' || !pages[currentPage]) return;
    if (!bufARef.current || !bufBRef.current) return;

    let cancelled = false;
    async function renderVisiblePage() {
      let pdfA = null;
      let pdfB = null;
      try {
        const meta = pages[currentPage];
        [pdfA, pdfB] = await Promise.all([
          loadPdf(bufARef.current.slice(0)),
          loadPdf(bufBRef.current.slice(0)),
        ]);
        if (cancelled) return;

        const rendA = meta.hasA ? await renderOffscreenImageData(pdfA, meta.pageNum, 1.5) : null;
        const rendB = meta.hasB ? await renderOffscreenImageData(pdfB, meta.pageNum, 1.5) : null;
        if (cancelled) return;

        if (canvasARef.current) {
          const cA = canvasARef.current;
          if (rendA) {
            cA.width = rendA.width;
            cA.height = rendA.height;
            cA.getContext('2d').putImageData(rendA.imgData, 0, 0);
          } else {
            cA.width = 400;
            cA.height = 500;
            cA.getContext('2d').clearRect(0, 0, 400, 500);
          }
        }

        if (canvasBRef.current) {
          const cB = canvasBRef.current;
          if (rendB) {
            cB.width = rendB.width;
            cB.height = rendB.height;
            cB.getContext('2d').putImageData(rendB.imgData, 0, 0);
          } else {
            cB.width = 400;
            cB.height = 500;
            cB.getContext('2d').clearRect(0, 0, 400, 500);
          }
        }

        if (canvasDiffRef.current) {
          const cD = canvasDiffRef.current;
          if (rendA && rendB) {
            const w = Math.min(rendA.width, rendB.width);
            const h = Math.min(rendA.height, rendB.height);
            cD.width = w;
            cD.height = h;
            const ctx = cD.getContext('2d');
            const outImg = ctx.createImageData(w, h);
            const dataA = rendA.imgData.data;
            const dataB = rendB.imgData.data;
            const out = outImg.data;
            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const idxA = (y * rendA.width + x) * 4;
                const idxB = (y * rendB.width + x) * 4;
                const idxOut = (y * w + x) * 4;
                const delta =
                  (Math.abs(dataA[idxA] - dataB[idxB]) +
                    Math.abs(dataA[idxA + 1] - dataB[idxB + 1]) +
                    Math.abs(dataA[idxA + 2] - dataB[idxB + 2])) /
                  3;
                if (delta > 15) {
                  out[idxOut] = 255;
                  out[idxOut + 1] = 60;
                  out[idxOut + 2] = 60;
                  out[idxOut + 3] = 220;
                } else {
                  out[idxOut] = Math.round(dataA[idxA] * 0.5 + 128 * 0.5);
                  out[idxOut + 1] = Math.round(dataA[idxA + 1] * 0.5 + 128 * 0.5);
                  out[idxOut + 2] = Math.round(dataA[idxA + 2] * 0.5 + 128 * 0.5);
                  out[idxOut + 3] = 200;
                }
              }
            }
            ctx.putImageData(outImg, 0, 0);
          } else {
            cD.width = 400;
            cD.height = 500;
            const ctx = cD.getContext('2d');
            ctx.fillStyle = '#151529';
            ctx.fillRect(0, 0, 400, 500);
          }
        }
      } finally {
        await pdfA?.destroy?.();
        await pdfB?.destroy?.();
      }
    }

    renderVisiblePage();
    return () => {
      cancelled = true;
    };
  }, [currentPage, status, viewMode, pages]);

  const handleDownloadReport = () => {
    if (!diffStats || pages.length === 0) return;
    const pageTextDiffs = pages.map((p) => ({
      ...p,
      ...diffLines(p.textLinesA, p.textLinesB),
    }));
    const html = buildDiffReportHtml({
      fileAName: fileA?.name || 'Original.pdf',
      fileBName: fileB?.name || 'Revised.pdf',
      diffStats,
      pageTextDiffs,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadFile(blob, 'comparison_diff_report.html');
  };

  const activeMeta = pages[currentPage];
  const activeTextDiff = activeMeta ? diffLines(activeMeta.textLinesA, activeMeta.textLinesB) : null;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="workspace-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GitCompare size={24} style={{ color: 'var(--primary-color)' }} aria-hidden="true" />
          Compare PDF
        </h1>
        <Link href="/" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to Tools
        </Link>
      </div>

      {status === 'idle' && (
        <>
          <div style={{ marginBottom: '1.25rem' }}>
            <PrivacyProofBadge />
          </div>
          <div className="compare-upload-grid-resp">
            <UploadSlot label="Original Document" file={fileA} id="fileA" onChange={handleFileA} />
            <UploadSlot label="Revised Document" file={fileB} id="fileB" onChange={handleFileB} />
          </div>

          {fileA && fileB && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <button type="button" className="btn-primary" onClick={compare} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1rem' }}>
                <GitCompare size={18} aria-hidden="true" /> Compare Documents
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--success-color)' }} aria-hidden="true" />
            <span>Pixel-accurate visual comparison plus line-level text diff. Differences highlight in red. Password-protected PDFs must be unlocked first.</span>
          </div>
        </>
      )}

      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)' }}>
          <Loader size={24} style={{ color: 'var(--primary-color)', animation: 'spin 1s linear infinite' }} aria-hidden="true" />
          <ProgressSteps steps={['Load PDFs', 'Analyze Pages', 'Ready']} current={compareStep} label={progressLabel} />
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 'var(--border-radius-lg)' }}>
          <AlertCircle size={20} style={{ color: 'var(--error-color)', flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--text-main)', margin: 0 }}>{errorMsg}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => setStatus('idle')}>Try Again</button>
        </div>
      )}

      {status === 'done' && diffStats && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1rem 1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Pages Changed', value: diffStats.changed },
              { label: 'Content Diff', value: `${diffStats.percentDiff}%` },
              { label: 'Pages (A / B)', value: `${diffStats.pagesA} / ${diffStats.pagesB}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary-color)' }}>{value}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewMode('visual')}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', borderColor: viewMode === 'visual' ? 'var(--primary-color)' : undefined }}
              >
                <Eye size={14} aria-hidden="true" /> Visual Diff
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setViewMode('text')}
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem', borderColor: viewMode === 'text' ? 'var(--primary-color)' : undefined }}
              >
                <FileDiff size={14} aria-hidden="true" /> Text Diff
              </button>
              <button type="button" className="btn-secondary" onClick={handleDownloadReport} style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}>
                <Download size={14} aria-hidden="true" /> Diff Report (.html)
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  bufARef.current = null;
                  bufBRef.current = null;
                  setStatus('idle');
                  setPages([]);
                  setFileA(null);
                  setFileB(null);
                }}
              >
                New Comparison
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
            {pages.map((p, i) => (
              <button
                type="button"
                key={p.pageNum}
                onClick={() => setCurrentPage(i)}
                style={{
                  position: 'relative',
                  padding: '0.35rem 0.75rem',
                  background: 'var(--bg-card)',
                  border: `1px solid ${i === currentPage ? 'var(--primary-color)' : p.diffPixels !== 0 ? 'rgba(255,71,87,0.5)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  color: i === currentPage ? 'var(--primary-color)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.2s',
                }}
              >
                P{i + 1}
                {p.diffPixels !== 0 && (
                  <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, background: 'var(--primary-color)', borderRadius: '50%' }} />
                )}
              </button>
            ))}
          </div>

          {viewMode === 'visual' ? (
            <div className="compare-canvas-grid-resp">
              {[
                { ref: canvasARef, label: 'Original (A)' },
                { ref: canvasBRef, label: 'Revised (B)' },
                { ref: canvasDiffRef, label: 'Differences', extra: ' ■ red = changed' },
              ].map(({ ref, label, extra }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                    {extra && <span style={{ color: '#ff4757', fontWeight: 400 }}>{extra}</span>}
                  </span>
                  <canvas ref={ref} style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#ffffff' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1rem', fontFamily: 'monospace', fontSize: '0.82rem', maxHeight: '62vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-sans)' }}>
                Page {currentPage + 1}: +{activeTextDiff?.addedCount || 0} added, -{activeTextDiff?.removedCount || 0} removed
              </div>
              {activeTextDiff?.entries?.length ? (
                activeTextDiff.entries.map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      marginBottom: '2px',
                      whiteSpace: 'pre-wrap',
                      background:
                        entry.type === 'added'
                          ? 'rgba(46,213,115,0.12)'
                          : entry.type === 'removed'
                          ? 'rgba(255,71,87,0.14)'
                          : 'transparent',
                      color:
                        entry.type === 'added'
                          ? 'var(--success-color)'
                          : entry.type === 'removed'
                          ? 'var(--error-color)'
                          : 'var(--text-main)',
                    }}
                  >
                    <strong>{entry.type === 'added' ? '+ ' : entry.type === 'removed' ? '- ' : '  '}</strong>
                    {entry.text}
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No selectable text found on this page.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
