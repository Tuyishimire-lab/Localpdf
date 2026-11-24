'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileSearch, ChevronLeft, ChevronRight, Copy, Download, Sparkles, FileCheck2 } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import ProgressSteps from '../ProgressSteps';
import { loadPdf, renderPageToDataUrl } from '../../../lib/pdfEngine';
import { recognizeImage } from '../../../lib/ocrEngine';
import { buildSearchablePdf } from '../../../lib/searchablePdf';
import { addHistoryEntry } from '../../../lib/history';
import { downloadFile } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export default function OcrTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [pageImg, setPageImg] = useState(null);
  const [loadingPage, setLoadingPage] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressVal, setProgressVal] = useState(0);
  const [ocrResultsByPage, setOcrResultsByPage] = useState({});

  const [ocrScope, setOcrScope] = useState('current'); // 'current' | 'all'
  const [language, setLanguage] = useState('eng');
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [binarize, setBinarize] = useState(false);
  const [layoutFormat, setLayoutFormat] = useState('preserve');

  const [searchableBlob, setSearchableBlob] = useState(null);
  const [searchableModalOpen, setSearchableModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  const preprocessImage = (imageSrc, options) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (options.enhanceContrast) {
          ctx.filter = 'grayscale(1) contrast(2.2) brightness(0.95)';
        }

        ctx.drawImage(img, 0, 0);

        if (options.binarize) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const v =
              0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] >= 128
                ? 255
                : 0;
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const dataUrl = canvas.toDataURL('image/png');
        const width = canvas.width;
        const height = canvas.height;
        canvas.width = 0;
        canvas.height = 0;
        resolve({ dataUrl, width, height });
      };
      img.src = imageSrc;
    });
  };

  const formatRecognizedData = (data, format) => {
    if (!data) return '';

    if (format === 'preserve') {
      const blocks = data.blocks || [];
      let structuredText = '';
      blocks.forEach((block) => {
        if (block.paragraphs) {
          block.paragraphs.forEach((p) => {
            const paragraphText = p.lines.map((line) => line.text.trim()).join('\n');
            structuredText += paragraphText + '\n\n';
          });
        }
      });
      return structuredText.trim() || data.text || '';
    }

    if (format === 'flow') {
      const blocks = data.blocks || [];
      let flowText = '';
      blocks.forEach((block) => {
        if (block.paragraphs) {
          block.paragraphs.forEach((p) => {
            let paragraphText = p.lines.map((line) => line.text.trim()).join(' ');
            paragraphText = paragraphText.replace(/-\s+/g, '');
            flowText += paragraphText + '\n\n';
          });
        }
      });
      return flowText.trim() || data.text || '';
    }

    if (format === 'table') {
      const lines = data.lines || [];
      if (lines.length === 0) return data.text || '';

      const sortedLines = [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0);
      const rows = [];
      sortedLines.forEach((line) => {
        const midY = (line.bbox.y0 + line.bbox.y1) / 2;
        const matchedRow = rows.find((row) => {
          const rowY0 = Math.min(...row.map((l) => l.bbox.y0));
          const rowY1 = Math.max(...row.map((l) => l.bbox.y1));
          return midY >= rowY0 && midY <= rowY1;
        });

        if (matchedRow) matchedRow.push(line);
        else rows.push([line]);
      });

      return rows
        .map((row) => {
          row.sort((a, b) => a.bbox.x0 - b.bbox.x0);
          return row.map((item) => item.text.trim()).join('\t');
        })
        .join('\n')
        .trim();
    }

    return data.text || '';
  };

  const displayedText = useMemo(() => {
    const keys = Object.keys(ocrResultsByPage)
      .map(Number)
      .sort((a, b) => a - b);
    if (keys.length === 0) return '';

    if (ocrScope === 'all' && keys.length > 1) {
      return keys
        .map((idx) => `--- Page ${idx + 1} ---\n${formatRecognizedData(ocrResultsByPage[idx]?.data, layoutFormat)}`)
        .join('\n\n')
        .trim();
    }

    const activeEntry = ocrResultsByPage[activePage];
    if (activeEntry) {
      return formatRecognizedData(activeEntry.data, layoutFormat);
    }

    if (keys.length === 1) {
      return formatRecognizedData(ocrResultsByPage[keys[0]]?.data, layoutFormat);
    }
    return '';
  }, [ocrResultsByPage, ocrScope, activePage, layoutFormat]);

  useEffect(() => {
    let cancelled = false;
    async function renderViewport() {
      if (!pdfDoc) return;
      try {
        setLoadingPage(true);
        const url = await renderPageToDataUrl(pdfDoc, activePage + 1, 2.5);
        if (!cancelled) {
          setPageImg(url);
          setLoadingPage(false);
        }
      } catch (err) {
        console.error('Error rendering page viewport:', err);
        if (!cancelled) setLoadingPage(false);
      }
    }
    renderViewport();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, activePage]);

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setActivePage(0);
    setOcrResultsByPage({});
    setProgressVal(0);
    setProgressStatus('');
    setSearchableBlob(null);

    try {
      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.error('Error loading PDF', err);
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
    setOcrResultsByPage({});
    setProgressVal(0);
    setProgressStatus('');
    setSearchableBlob(null);
  };

  const handleProcess = async () => {
    if (!pdfDoc) return;
    const targetPages =
      ocrScope === 'all'
        ? Array.from({ length: totalPages }, (_, i) => i)
        : [activePage];

    setProcessing(true);
    setStepIndex(0);
    setProgressVal(0);
    setProgressStatus('Rendering high-resolution page images...');

    try {
      const nextMap = { ...ocrResultsByPage };

      for (let i = 0; i < targetPages.length; i++) {
        const pageIdx = targetPages[i];
        setStepIndex(0);
        setProgressStatus(`Rendering page ${pageIdx + 1} of ${totalPages}...`);
        const rawUrl =
          pageIdx === activePage && pageImg
            ? pageImg
            : await renderPageToDataUrl(pdfDoc, pageIdx + 1, 2.5);

        const preprocessed = await preprocessImage(rawUrl, { enhanceContrast, binarize });

        setStepIndex(1);
        const result = await recognizeImage(preprocessed.dataUrl, language, (m) => {
          if (m.status === 'recognizing text') {
            const overall = ((i + (m.progress || 0)) / targetPages.length) * 100;
            setProgressStatus(
              `OCR Page ${pageIdx + 1}/${totalPages} (${language.toUpperCase()})...`
            );
            setProgressVal(Math.round(overall));
          } else if (m.status) {
            setProgressStatus(`${m.status.charAt(0).toUpperCase() + m.status.slice(1)}...`);
          }
        });

        nextMap[pageIdx] = {
          data: result.data,
          imageWidth: preprocessed.width,
          imageHeight: preprocessed.height,
        };
      }

      setOcrResultsByPage(nextMap);
      setStepIndex(2);
      setProgressVal(100);
      setProgressStatus('OCR complete!');
      setProcessing(false);

      addHistoryEntry({
        tool: 'ocr',
        toolLabel: 'OCR PDF',
        fileName: files[0].name,
        inputSize: files[0].size,
        outputSize: null,
      });
      toast.success(
        `Extracted text from ${targetPages.length} ${targetPages.length === 1 ? 'page' : 'pages'}.`
      );
    } catch (err) {
      console.error('OCR recognition error:', err);
      toast.error('Failed to perform text recognition on this document.');
      setProcessing(false);
    }
  };

  const handleExportSearchablePdf = async () => {
    const entries = Object.entries(ocrResultsByPage);
    if (entries.length === 0 || !files[0]) {
      toast.error('Run OCR first to extract text before creating a searchable PDF.');
      return;
    }

    setSearchableBlob(null);
    setSearchableModalOpen(true);

    try {
      const pdfBytes = await files[0].arrayBuffer();
      const ocrPages = entries.map(([idx, val]) => ({
        pageIndex: Number(idx),
        imageWidth: val.imageWidth,
        imageHeight: val.imageHeight,
        words: val.data?.words,
        lines: val.data?.lines,
        text: val.data?.text,
      }));
      const outBytes = await buildSearchablePdf(pdfBytes, ocrPages);
      setSearchableBlob(new Blob([outBytes], { type: 'application/pdf' }));
    } catch (err) {
      console.error('Searchable PDF build error:', err);
      setSearchableModalOpen(false);
      toast.error(err?.message || 'Failed to build searchable PDF.');
    }
  };

  const handleCopyText = () => {
    if (!displayedText) return;
    navigator.clipboard.writeText(displayedText);
    toast.success('Text copied to clipboard!');
  };

  const handleDownloadText = () => {
    if (!displayedText || !files[0]) return;
    const blob = new Blob([displayedText], { type: 'text/plain;charset=utf-8' });
    const name = files[0].name.replace(/\.pdf$/i, '');
    downloadFile(
      blob,
      ocrScope === 'all' ? `${name}_ocr_all_pages.txt` : `${name}_page_${activePage + 1}_text.txt`
    );
  };

  const searchableFileName = files[0]
    ? `${files[0].name.replace(/\.pdf$/i, '')}_searchable.pdf`
    : 'searchable.pdf';

  const leftPane =
    files.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(7,7,20,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-md)' }}>
          <button
            className="rotate-card-btn"
            disabled={activePage === 0}
            onClick={() => setActivePage((prev) => prev - 1)}
            type="button"
            aria-label="Previous page"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
            Page {activePage + 1} of {totalPages}
          </span>
          <button
            className="rotate-card-btn"
            disabled={activePage === totalPages - 1}
            onClick={() => setActivePage((prev) => prev + 1)}
            type="button"
            aria-label="Next page"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <div
          style={{
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: '#ffffff',
            lineHeight: 0,
          }}
        >
          {loadingPage ? (
            <div style={{ width: '400px', height: '560px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#151529' }}>
              <div className="modal-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }}></div>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pageImg}
                alt={`Page ${activePage + 1}`}
                style={{ display: 'block', maxWidth: '100%', height: 'auto', maxHeight: '600px', pointerEvents: 'none' }}
              />
            </>
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      <Workspace
        title="OCR PDF"
        icon={FileSearch}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={ocrScope === 'all' ? `Extract All Pages (${totalPages})` : `Extract Text (Page ${activePage + 1})`}
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <div>
          <h3 className="options-title">OCR Configurations</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.25rem' }}>
            <div>
              <label className="options-label">Page Scope</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOcrScope('current')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    borderColor: ocrScope === 'current' ? 'var(--primary-color)' : undefined,
                  }}
                >
                  Current Page
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setOcrScope('all')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    borderColor: ocrScope === 'all' ? 'var(--primary-color)' : undefined,
                  }}
                >
                  All Pages ({totalPages})
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                Document Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="options-select"
              >
                <option value="eng">English</option>
                <option value="spa">Spanish (Español)</option>
                <option value="fra">French (Français)</option>
                <option value="deu">German (Deutsch)</option>
                <option value="ita">Italian (Italiano)</option>
                <option value="por">Portuguese (Português)</option>
                <option value="nld">Dutch (Nederlands)</option>
                <option value="chi_sim">Chinese (Simplified)</option>
                <option value="jpn">Japanese (日本語)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Image Preprocessing
              </span>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={enhanceContrast}
                  onChange={(e) => setEnhanceContrast(e.target.checked)}
                  style={{ accentColor: 'var(--primary-color)' }}
                />
                Enhance Contrast (Auto Grayscale)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={binarize}
                  onChange={(e) => setBinarize(e.target.checked)}
                  style={{ accentColor: 'var(--primary-color)' }}
                />
                Binarize Image (Max Threshold)
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Layout Organization
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { id: 'preserve', label: 'Preserve Layout', desc: 'Maintains multi-column blocks and paragraphs' },
                  { id: 'flow', label: 'Single Text Flow', desc: 'Clean sentences, ideal for copying into Word' },
                  { id: 'table', label: 'Reconstruct Tables', desc: 'CSV/Tab aligned grid (paste to Excel)' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLayoutFormat(option.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '6px',
                      border: layoutFormat === option.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                      backgroundColor: layoutFormat === option.id ? 'rgba(78,93,234,0.1)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      width: '100%',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: layoutFormat === option.id ? 'var(--primary-color)' : 'var(--text-main)' }}>
                      {option.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      {option.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {processing && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '0.85rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <ProgressSteps steps={['Render', 'OCR', 'Ready']} current={stepIndex} label={progressStatus} />
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progressVal}%`, height: '100%', background: 'var(--accent-gradient)', transition: 'width 0.2s ease' }}></div>
              </div>
              <span style={{ fontSize: '0.75rem', alignSelf: 'flex-end', color: 'var(--text-muted)' }}>
                {progressVal}% Complete
              </span>
            </div>
          )}

          {displayedText ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                <Sparkles size={16} style={{ color: 'var(--secondary-color)' }} aria-hidden="true" />
                Extracted Text Output ({Object.keys(ocrResultsByPage).length} {Object.keys(ocrResultsByPage).length === 1 ? 'page' : 'pages'} ready)
              </div>

              <textarea
                value={displayedText}
                readOnly
                className="options-input"
                style={{
                  width: '100%',
                  height: '200px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  resize: 'vertical',
                  lineHeight: '1.4',
                }}
              />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={handleCopyText} style={{ flex: 1, padding: '0.5rem' }}>
                  <Copy size={14} aria-hidden="true" /> Copy Text
                </button>
                <button type="button" className="btn-secondary" onClick={handleDownloadText} style={{ flex: 1, padding: '0.5rem' }}>
                  <Download size={14} aria-hidden="true" /> Download .txt
                </button>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleExportSearchablePdf}
                style={{ width: '100%', padding: '0.6rem' }}
              >
                <FileCheck2 size={15} aria-hidden="true" /> Export Searchable PDF
              </button>
            </div>
          ) : (
            !processing && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                Choose Current Page or All Pages, then extract selectable text or generate a searchable PDF completely in your browser.
              </p>
            )
          )}
        </div>
      </Workspace>

      <ProgressModal
        isOpen={searchableModalOpen}
        title="Building Searchable PDF..."
        description="Embedding invisible OCR text layer onto PDF pages..."
        isComplete={!!searchableBlob}
        onDownload={() => searchableBlob && downloadFile(searchableBlob, searchableFileName)}
        onClose={() => setSearchableModalOpen(false)}
        downloadLabel="Download Searchable PDF"
        resultBlob={searchableBlob}
        resultFileName={searchableFileName}
        currentToolId="ocr"
        inputSize={files[0]?.size}
      />
    </>
  );
}
