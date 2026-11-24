'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Table, Download, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf } from '../../../lib/pdfEngine';
import {
  extractTableRowsFromTextItems,
  rowsToCsv,
  buildMinimalXlsx,
} from '../../../lib/pdfTableExtractor';
import { addHistoryEntry } from '../../../lib/history';
import { downloadFile } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export default function PdfToExcelTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePage, setActivePage] = useState(0);

  const [exportFormat, setExportFormat] = useState('xlsx'); // 'xlsx' | 'csv'
  const [combineSheets, setCombineSheets] = useState(false);
  const [colGapThreshold, setColGapThreshold] = useState(14);
  const [rowTolerance, setRowTolerance] = useState(4.5);

  const [extractedSheets, setExtractedSheets] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [scannedWarning, setScannedWarning] = useState(false);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  const parseAllPages = async (doc, gap, tol) => {
    const sheets = [];
    let totalCells = 0;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      try {
        const textContent = await page.getTextContent();
        const { rows } = extractTableRowsFromTextItems(textContent.items, {
          colGapThreshold: gap,
          rowTolerance: tol,
        });
        totalCells += rows.reduce((sum, r) => sum + r.filter(Boolean).length, 0);
        sheets.push({ name: `Page ${i}`, rows });
      } finally {
        page.cleanup?.();
      }
    }

    return { sheets, totalCells };
  };

  const handleFilesSelected = async (selected) => {
    const file = selected?.[0];
    if (!file) return;
    pdfDoc?.destroy?.();
    setFiles([file]);
    setActivePage(0);
    setResultBlob(null);
    setScannedWarning(false);

    try {
      const doc = await loadPdf(file);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      const { sheets, totalCells } = await parseAllPages(doc, colGapThreshold, rowTolerance);
      setExtractedSheets(sheets);
      if (totalCells === 0) {
        setScannedWarning(true);
      }
    } catch (err) {
      console.error('PDF table parse error:', err);
      toast.error('Failed to read PDF document.');
      setFiles([]);
    }
  };

  const handleReanalyze = async () => {
    if (!pdfDoc) return;
    try {
      const { sheets, totalCells } = await parseAllPages(pdfDoc, colGapThreshold, rowTolerance);
      setExtractedSheets(sheets);
      setScannedWarning(totalCells === 0);
      toast.success('Updated table preview with new detection thresholds.');
    } catch (err) {
      console.error('Reanalyze error:', err);
      toast.error('Failed to re-extract tables.');
    }
  };

  const handleClear = () => {
    pdfDoc?.destroy?.();
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setActivePage(0);
    setExtractedSheets([]);
    setResultBlob(null);
    setResultName('');
    setScannedWarning(false);
  };

  const handleProcess = async () => {
    if (!files[0] || !pdfDoc) return;
    setProcessing(true);
    setModalOpen(true);
    setResultBlob(null);

    try {
      const { sheets, totalCells } = await parseAllPages(pdfDoc, colGapThreshold, rowTolerance);
      setExtractedSheets(sheets);

      if (totalCells === 0) {
        setScannedWarning(true);
        setProcessing(false);
        setModalOpen(false);
        toast.error('No selectable text tables found. This PDF appears scanned — try OCR PDF first.');
        return;
      }

      const stem = files[0].name.replace(/\.pdf$/i, '');
      let blob;
      let outName;

      if (exportFormat === 'csv') {
        const targetRows = combineSheets
          ? sheets.flatMap((s) => s.rows)
          : sheets[activePage]?.rows || [];
        const csv = rowsToCsv(targetRows);
        blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        outName = combineSheets ? `${stem}_tables.csv` : `${stem}_page_${activePage + 1}.csv`;
      } else {
        const finalSheets = combineSheets
          ? [{ name: 'All Pages', rows: sheets.flatMap((s) => s.rows) }]
          : sheets;
        blob = await buildMinimalXlsx(finalSheets);
        outName = `${stem}.xlsx`;
      }

      setResultName(outName);
      setResultBlob(blob);
      setProcessing(false);
      addHistoryEntry({
        tool: 'pdf-to-excel',
        toolLabel: 'PDF to Excel / CSV',
        fileName: outName,
        inputSize: files[0].size,
        outputSize: blob.size,
      });
    } catch (err) {
      console.error('Table export error:', err);
      setProcessing(false);
      setModalOpen(false);
      toast.error(err?.message || 'Failed to export spreadsheet.');
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadFile(resultBlob, resultName || 'extracted_tables.xlsx');
  };

  const activeRows = extractedSheets[activePage]?.rows || [];

  const leftPane =
    files.length > 0 ? (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'rgba(7,7,20,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-md)' }}>
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

        {scannedWarning && (
          <div style={{ padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 204, 0, 0.35)', background: 'rgba(255, 204, 0, 0.08)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={18} style={{ color: '#ffcc00', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
            <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
              <strong>No selectable text found:</strong> Scanned PDFs need OCR first.{' '}
              <Link href="/tools/ocr" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'underline' }}>
                Run OCR PDF with Table Reconstruction →
              </Link>
            </div>
          </div>
        )}

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', overflowX: 'auto' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
            Detected <strong>{activeRows.length}</strong> rows on Page {activePage + 1}
          </div>
          {activeRows.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <tbody>
                {activeRows.slice(0, 40).map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRight: '1px solid var(--border-color)',
                          whiteSpace: 'nowrap',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: rIdx === 0 ? 700 : 400,
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              No structured rows detected on this page.
            </p>
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      <Workspace
        title="PDF to Excel / CSV"
        icon={Table}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={exportFormat === 'xlsx' ? 'Export .xlsx Workbook' : 'Export .csv'}
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Spreadsheet Settings</h3>

        <div className="options-group">
          <label className="options-label">Export Format</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setExportFormat('xlsx')}
              style={{ flex: 1, borderColor: exportFormat === 'xlsx' ? 'var(--primary-color)' : undefined }}
            >
              Excel (.xlsx)
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setExportFormat('csv')}
              style={{ flex: 1, borderColor: exportFormat === 'csv' ? 'var(--primary-color)' : undefined }}
            >
              CSV (.csv)
            </button>
          </div>
        </div>

        <div className="options-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input
              type="checkbox"
              checked={combineSheets}
              onChange={(e) => setCombineSheets(e.target.checked)}
              style={{ accentColor: 'var(--primary-color)' }}
            />
            Combine all pages into a single sheet/table
          </label>
        </div>

        <div className="options-group slider-group">
          <div className="slider-val-container">
            <label className="options-label">Column Gap Sensitivity</label>
            <span className="slider-val">{colGapThreshold} pt</span>
          </div>
          <input
            type="range"
            className="range-slider"
            min="4"
            max="40"
            step="2"
            value={colGapThreshold}
            onChange={(e) => setColGapThreshold(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="options-group slider-group">
          <div className="slider-val-container">
            <label className="options-label">Row Grouping Tolerance</label>
            <span className="slider-val">{rowTolerance} pt</span>
          </div>
          <input
            type="range"
            className="range-slider"
            min="2"
            max="12"
            step="0.5"
            value={rowTolerance}
            onChange={(e) => setRowTolerance(parseFloat(e.target.value))}
          />
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={handleReanalyze}
          disabled={!pdfDoc}
          style={{ width: '100%' }}
        >
          Refresh Table Preview
        </button>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Extracting PDF Tables..."
        description="Clustering columns and building your spreadsheet locally..."
        isComplete={!!resultBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel={exportFormat === 'xlsx' ? 'Download .xlsx' : 'Download .csv'}
        resultBlob={resultBlob}
        resultFileName={resultName || 'tables.xlsx'}
        currentToolId="pdf-to-excel"
        inputSize={files[0]?.size}
        skipHistory={true}
      />
    </>
  );
}

