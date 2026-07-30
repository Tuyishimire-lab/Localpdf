'use client';

import { useState } from 'react';
import { TableProperties, FlaskConical, Info } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { downloadFile } from '../../../lib/utils';

const detectTable = (textItems) => {
  if (!textItems.length) return [];
  const rowBuckets = {};
  for (const item of textItems) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!rowBuckets[y]) rowBuckets[y] = [];
    rowBuckets[y].push({ text: item.str.trim(), x: item.transform[4] });
  }
  return Object.keys(rowBuckets)
    .sort((a, b) => b - a)
    .map(y => rowBuckets[y].sort((a, b) => a.x - b.x).map(i => i.text));
};

export default function PdfToExcelTool() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [sheetCount, setSheetCount] = useState(0);

  const handleFilesSelected = (selected) => {
    setFiles([selected[0]]);
    setResultBlob(null);
    setSheetCount(0);
  };

  const handleClear = () => {
    setFiles([]);
    setResultBlob(null);
    setSheetCount(0);
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setModalOpen(true);
    setResultBlob(null);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      let sheets = 0;

      for (let p = 1; p <= numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        const rows = detectTable(textContent.items);
        if (rows.length > 0) {
          const ws = XLSX.utils.aoa_to_sheet(rows);
          XLSX.utils.book_append_sheet(workbook, ws, `Page ${p}`);
          sheets++;
        }
      }

      if (sheets === 0) {
        throw new Error('No extractable text found. The PDF may be image-based. Try OCR first.');
      }

      const wbOut = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const name = files[0].name.replace(/\.pdf$/i, '.xlsx');

      setResultBlob(blob);
      setResultName(name);
      setSheetCount(sheets);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setProcessing(false);
      setModalOpen(false);
      alert(err.message || 'Conversion failed. The PDF may not contain extractable text data.');
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadFile(resultBlob, resultName);
  };

  return (
    <>
      <Workspace
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            PDF to Excel
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,204,0,0.15)', border: '1px solid rgba(255,204,0,0.4)', color: '#f0c000', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.15rem 0.4rem', borderRadius: '5px' }}>
              <FlaskConical size={10} /> Beta
            </span>
          </span>
        }
        icon={TableProperties}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Extract to Excel"
        processing={processing}
        multiple={false}
        leftPane={
          files[0] ? (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <TableProperties size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{files[0].name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{(files[0].size / 1024).toFixed(0)} KB</div>
                </div>
              </div>
              {sheetCount > 0 && (
                <div style={{ marginTop: '1rem', background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ✓ {sheetCount} sheet{sheetCount !== 1 ? 's' : ''} created in the Excel file
                </div>
              )}
            </div>
          ) : null
        }
      >
        <h3 className="options-title">Beta Notes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            <FlaskConical size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#f0c000' }} />
            <span>Table detection infers structure from text positions. Each PDF page becomes one sheet in the output.</span>
          </div>
          <div style={{ background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            Simple well-structured tables extract reliably. Complex multi-column layouts may need manual cleanup.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(255,71,87,0.04)', border: '1px solid rgba(255,71,87,0.15)', borderRadius: '8px', padding: '0.75rem' }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>Scanned PDFs require OCR first to produce extractable text before conversion.</span>
          </div>
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Extracting to Excel..."
        description="Analyzing PDF pages and building spreadsheet..."
        isComplete={!!resultBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download .xlsx"
      />
    </>
  );
}
