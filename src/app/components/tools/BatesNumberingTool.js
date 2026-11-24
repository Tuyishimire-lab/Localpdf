'use client';

import { useState } from 'react';
import { Hash, FileText } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { applyBatesAndHeaders } from '../../../lib/pdfMetadataAndBates';
import { createBatchZip } from '../../../lib/batchZip';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export default function BatesNumberingTool() {
  const [files, setFiles] = useState([]);
  const [prefix, setPrefix] = useState('EX-');
  const [startNumber, setStartNumber] = useState(1);
  const [digits, setDigits] = useState(6);
  const [suffix, setSuffix] = useState('');
  const [batesPosition, setBatesPosition] = useState('bottom-right');
  const [fontSize, setFontSize] = useState(10);
  const [color, setColor] = useState('#111111');

  const [headerCenter, setHeaderCenter] = useState('');
  const [footerLeft, setFooterLeft] = useState('');

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const handleFilesSelected = (selected) => {
    if (!selected || selected.length === 0) return;
    setFiles((prev) => [...prev, ...selected]);
    setProcessedBlob(null);
  };

  const handleClear = () => {
    setFiles([]);
    setProcessedBlob(null);
    setResultName('');
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setModalOpen(true);
    setProcessedBlob(null);

    try {
      let currentStart = Math.max(0, parseInt(startNumber, 10) || 1);

      if (files.length === 1) {
        const bytes = await files[0].arrayBuffer();
        const res = await applyBatesAndHeaders(bytes, {
          prefix,
          startNumber: currentStart,
          digits,
          suffix,
          batesPosition,
          fontSize,
          color,
          headerCenter,
          footerLeft,
        });
        setResultName(`${files[0].name.replace(/\.pdf$/i, '')}_bates.pdf`);
        setProcessedBlob(new Blob([res.bytes], { type: 'application/pdf' }));
      } else {
        const outputs = [];
        for (const file of files) {
          const bytes = await file.arrayBuffer();
          const res = await applyBatesAndHeaders(bytes, {
            prefix,
            startNumber: currentStart,
            digits,
            suffix,
            batesPosition,
            fontSize,
            color,
            headerCenter,
            footerLeft,
          });
          currentStart = res.nextStartNumber;
          outputs.push({
            name: `${file.name.replace(/\.pdf$/i, '')}_bates.pdf`,
            blob: new Blob([res.bytes], { type: 'application/pdf' }),
          });
        }
        const zipBlob = await createBatchZip(outputs);
        setResultName('bates_numbered_pdfs.zip');
        setProcessedBlob(zipBlob);
      }

      setProcessing(false);
    } catch (err) {
      console.error('Bates numbering error:', err);
      toast.error(err?.message || 'Failed to apply Bates numbering.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, resultName || 'bates_numbered.pdf');
  };

  const sampleBates = `${prefix}${String(Math.max(0, parseInt(startNumber, 10) || 1)).padStart(Math.max(1, digits), '0')}${suffix}`;
  const totalInputSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  const leftPane =
    files.length > 0 ? (
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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Doc #{idx + 1}</span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <>
      <Workspace
        title="Bates Numbering & Headers"
        icon={Hash}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={files.length > 1 ? `Bates Stamp ${files.length} PDFs` : 'Apply Bates Numbering'}
        processing={processing}
        multiple={true}
        leftPane={leftPane}
      >
        <h3 className="options-title">Bates Stamp Format</h3>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
          Preview: <strong style={{ fontFamily: 'monospace' }}>{sampleBates}</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div className="options-group">
            <label className="options-label">Prefix</label>
            <input type="text" className="options-input" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <div className="options-group">
            <label className="options-label">Suffix</label>
            <input type="text" className="options-input" value={suffix} onChange={(e) => setSuffix(e.target.value)} />
          </div>
          <div className="options-group">
            <label className="options-label">Start #</label>
            <input type="number" className="options-input" min="0" value={startNumber} onChange={(e) => setStartNumber(parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="options-group">
            <label className="options-label">Digits</label>
            <input type="number" className="options-input" min="1" max="12" value={digits} onChange={(e) => setDigits(Math.max(1, parseInt(e.target.value, 10) || 6))} />
          </div>
        </div>

        <div className="options-group">
          <label className="options-label">Bates Position</label>
          <select className="options-select" value={batesPosition} onChange={(e) => setBatesPosition(e.target.value)}>
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-center">Bottom Center</option>
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
            <option value="top-center">Top Center</option>
          </select>
        </div>

        <div className="options-group">
          <label className="options-label">Optional Top Header ({'{page}'}, {'{total}'})</label>
          <input
            type="text"
            className="options-input"
            value={headerCenter}
            onChange={(e) => setHeaderCenter(e.target.value)}
            placeholder="e.g. CONFIDENTIAL — Page {page} of {total}"
          />
        </div>

        <div className="options-group">
          <label className="options-label">Optional Bottom-Left Footer</label>
          <input
            type="text"
            className="options-input"
            value={footerLeft}
            onChange={(e) => setFooterLeft(e.target.value)}
            placeholder="e.g. Case No. 2026-104"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label className="options-label">Size ({fontSize}pt)</label>
            <input type="range" className="range-slider" min="7" max="18" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} />
          </div>
          <input type="color" className="options-input" style={{ width: '48px', height: '38px', padding: '2px' }} value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Applying Bates Numbers..."
        description="Stamping continuous Bates identifiers across documents..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel={files.length > 1 ? 'Download Batch ZIP' : 'Download Bates PDF'}
        resultBlob={processedBlob}
        resultFileName={resultName || 'bates_numbered.pdf'}
        currentToolId="bates-numbering"
        inputSize={totalInputSize}
      />
    </>
  );
}

