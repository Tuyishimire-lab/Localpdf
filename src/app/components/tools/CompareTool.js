'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitCompare, Upload, Info, Loader, AlertCircle } from 'lucide-react';

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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
        {label}
      </label>
      <div
        style={{ ...CARD, borderColor: file ? 'var(--success-color)' : hover ? 'var(--primary-color)' : 'var(--border-color)', boxShadow: hover ? 'var(--accent-glow)' : 'none' }}
        onClick={() => document.getElementById(id).click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onChange({ target: { files: [f] } }); }}
      >
        {file
          ? <>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(46,213,115,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={20} style={{ color: 'var(--success-color)' }} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(0)} KB · Click to change</span>
            </>
          : <>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,71,87,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={20} style={{ color: 'var(--primary-color)' }} />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>Select PDF file</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>or drag and drop here</span>
            </>
        }
        <input id={id} type="file" accept=".pdf" style={{ display: 'none' }} onChange={onChange} />
      </div>
    </div>
  );
}

export default function CompareTool() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [status, setStatus] = useState('idle');
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState([]);
  const [diffStats, setDiffStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const canvasARef = useRef(null);
  const canvasBRef = useRef(null);
  const canvasDiffRef = useRef(null);

  const handleFileA = (e) => setFileA(e.target.files?.[0] || null);
  const handleFileB = (e) => setFileB(e.target.files?.[0] || null);

  const renderPageToImageData = async (pdfDoc, pageNum, scale = 1.5) => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return { canvas, ctx, width: viewport.width, height: viewport.height };
  };

  const pixelDiff = (imgDataA, imgDataB, width, height) => {
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = width;
    diffCanvas.height = height;
    const ctx = diffCanvas.getContext('2d');
    const diffData = ctx.createImageData(width, height);
    const dataA = imgDataA.data;
    const dataB = imgDataB.data;
    const out = diffData.data;
    let diffPixels = 0;
    for (let i = 0; i < dataA.length; i += 4) {
      const delta = (Math.abs(dataA[i] - dataB[i]) + Math.abs(dataA[i+1] - dataB[i+1]) + Math.abs(dataA[i+2] - dataB[i+2])) / 3;
      if (delta > 15) {
        out[i] = 255; out[i+1] = 60; out[i+2] = 60; out[i+3] = 200;
        diffPixels++;
      } else {
        out[i] = Math.round(dataA[i] * 0.5 + 128 * 0.5);
        out[i+1] = Math.round(dataA[i+1] * 0.5 + 128 * 0.5);
        out[i+2] = Math.round(dataA[i+2] * 0.5 + 128 * 0.5);
        out[i+3] = 200;
      }
    }
    ctx.putImageData(diffData, 0, 0);
    return { canvas: diffCanvas, diffPixels, totalPixels: dataA.length / 4 };
  };

  const compare = async () => {
    if (!fileA || !fileB) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
      const [bufA, bufB] = await Promise.all([fileA.arrayBuffer(), fileB.arrayBuffer()]);
      const [pdfA, pdfB] = await Promise.all([pdfjsLib.getDocument({ data: bufA }).promise, pdfjsLib.getDocument({ data: bufB }).promise]);
      const numPages = Math.max(pdfA.numPages, pdfB.numPages);
      const pageResults = [];
      let totalDiffPixels = 0, totalPixels = 0;
      for (let p = 1; p <= numPages; p++) {
        const hasA = p <= pdfA.numPages;
        const hasB = p <= pdfB.numPages;
        if (hasA && hasB) {
          const [rendA, rendB] = await Promise.all([renderPageToImageData(pdfA, p), renderPageToImageData(pdfB, p)]);
          const w = Math.min(rendA.width, rendB.width);
          const h = Math.min(rendA.height, rendB.height);
          const imgA = rendA.ctx.getImageData(0, 0, w, h);
          const imgB = rendB.ctx.getImageData(0, 0, w, h);
          const { canvas: diffCanvas, diffPixels, totalPixels: tp } = pixelDiff(imgA, imgB, w, h);
          totalDiffPixels += diffPixels; totalPixels += tp;
          pageResults.push({ canvasA: rendA.canvas, canvasB: rendB.canvas, canvasDiff: diffCanvas, diffPixels, totalPixels: tp, hasA, hasB });
        } else {
          const rendA = hasA ? (await renderPageToImageData(pdfA, p)).canvas : null;
          const rendB = hasB ? (await renderPageToImageData(pdfB, p)).canvas : null;
          pageResults.push({ canvasA: rendA, canvasB: rendB, canvasDiff: null, diffPixels: -1, hasA, hasB });
        }
      }
      setPages(pageResults);
      setCurrentPage(0);
      setDiffStats({ totalPages: numPages, pagesA: pdfA.numPages, pagesB: pdfB.numPages, percentDiff: totalPixels > 0 ? ((totalDiffPixels / totalPixels) * 100).toFixed(1) : '0.0', changed: pageResults.filter(p => p.diffPixels > 0).length });
      setStatus('done');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to compare PDFs. Ensure both files are valid, unencrypted PDFs.');
      setStatus('error');
    }
  };

  const drawPage = (idx) => {
    if (!pages[idx]) return;
    const { canvasA, canvasB, canvasDiff } = pages[idx];
    [{ ref: canvasARef, src: canvasA }, { ref: canvasBRef, src: canvasB }, { ref: canvasDiffRef, src: canvasDiff }].forEach(({ ref, src }) => {
      if (!ref.current || !src) return;
      ref.current.width = src.width;
      ref.current.height = src.height;
      ref.current.getContext('2d').drawImage(src, 0, 0);
    });
  };

  useEffect(() => {
    if (status === 'done' && pages[currentPage]) drawPage(currentPage);
  }, [currentPage, status, pages]);

  return (
    <div style={{ width: '100%' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 className="workspace-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GitCompare size={24} style={{ color: 'var(--primary-color)' }} />
          Compare PDF
        </h1>
        <Link href="/" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={14} /> Back to Tools
        </Link>
      </div>

      {/* Upload phase */}
      {status === 'idle' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <UploadSlot label="Original Document" file={fileA} id="fileA" onChange={handleFileA} />
            <UploadSlot label="Revised Document" file={fileB} id="fileB" onChange={handleFileB} />
          </div>

          {fileA && fileB && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <button className="btn-primary" onClick={compare} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', fontSize: '1rem' }}>
                <GitCompare size={18} /> Compare Documents
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--success-color)' }} />
            <span>Pixel-accurate visual comparison. Differences are highlighted in red. Password-protected PDFs must be unlocked first.</span>
          </div>
        </>
      )}

      {/* Loading */}
      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '4rem 2rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)' }}>
          <Loader size={24} style={{ color: 'var(--primary-color)', animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)' }}>Rendering and comparing pages...</span>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 'var(--border-radius-lg)' }}>
          <AlertCircle size={20} style={{ color: 'var(--error-color)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ color: 'var(--text-main)', margin: 0 }}>{errorMsg}</p>
          </div>
          <button className="btn-secondary" onClick={() => setStatus('idle')}>Try Again</button>
        </div>
      )}

      {/* Results */}
      {status === 'done' && diffStats && (
        <>
          {/* Stats bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1rem 1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
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
            <button className="btn-ghost" onClick={() => { setStatus('idle'); setPages([]); setFileA(null); setFileB(null); }} style={{ marginLeft: 'auto' }}>
              New Comparison
            </button>
          </div>

          {/* Page navigator */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
            {pages.map((p, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                style={{
                  position: 'relative', padding: '0.35rem 0.75rem', background: 'var(--bg-card)',
                  border: `1px solid ${i === currentPage ? 'var(--primary-color)' : p.diffPixels > 0 ? 'rgba(255,71,87,0.5)' : 'var(--border-color)'}`,
                  borderRadius: '6px', color: i === currentPage ? 'var(--primary-color)' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s',
                }}
              >
                P{i + 1}
                {p.diffPixels > 0 && <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, background: 'var(--primary-color)', borderRadius: '50%' }} />}
              </button>
            ))}
          </div>

          {/* Canvas grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            {[
              { ref: canvasARef, label: 'Original (A)' },
              { ref: canvasBRef, label: 'Revised (B)' },
              { ref: canvasDiffRef, label: 'Differences', extra: ' ■ red = changed' },
            ].map(({ ref, label, extra }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}{extra && <span style={{ color: '#ff4757', fontWeight: 400 }}>{extra}</span>}
                </span>
                <canvas ref={ref} style={{ width: '100%', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
