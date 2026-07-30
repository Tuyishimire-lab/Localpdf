'use client';

import { useState } from 'react';
import { Wrench, CheckCircle, Loader, Info } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { downloadFile } from '../../../lib/utils';

export default function RepairTool() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [log, setLog] = useState([]);

  const handleFilesSelected = (selected) => {
    setFiles([selected[0]]);
    setResultBlob(null);
    setLog([]);
  };

  const handleClear = () => {
    setFiles([]);
    setResultBlob(null);
    setLog([]);
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setModalOpen(true);
    setResultBlob(null);
    setLog([]);

    const logs = [];
    const addLog = (msg) => { logs.push(msg); setLog([...logs]); };

    try {
      addLog('Reading file...');
      const arrayBuffer = await files[0].arrayBuffer();

      addLog('Attempting to parse PDF structure...');
      const { PDFDocument } = await import('pdf-lib');

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
          updateMetadata: false,
        });
        addLog('PDF structure parsed successfully.');
      } catch {
        addLog('Primary parse failed. Attempting recovery...');
        try {
          const partialData = new Uint8Array(arrayBuffer).slice(0, -100);
          pdfDoc = await PDFDocument.load(partialData.buffer, {
            ignoreEncryption: true,
            throwOnInvalidObject: false,
          });
          addLog('Partial recovery succeeded.');
        } catch {
          throw new Error('PDF is too corrupted to recover. The file structure cannot be parsed.');
        }
      }

      addLog(`Found ${pdfDoc.getPageCount()} pages.`);
      addLog('Rebuilding cross-reference table...');

      const repairedBytes = await pdfDoc.save({
        addDefaultPage: pdfDoc.getPageCount() === 0,
        useObjectStreams: false,
      });

      addLog('Verifying repaired PDF...');
      await PDFDocument.load(repairedBytes);
      addLog('Verification passed. Repair complete!');

      const blob = new Blob([repairedBytes], { type: 'application/pdf' });
      const name = files[0].name.replace(/\.pdf$/i, '_repaired.pdf');
      setResultBlob(blob);
      setResultName(name);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setProcessing(false);
      setModalOpen(false);
      alert(err.message || 'Repair failed. The file may have severe structural damage beyond recovery.');
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadFile(resultBlob, resultName);
  };

  return (
    <>
      <Workspace
        title="Repair PDF"
        icon={Wrench}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Repair PDF"
        processing={processing}
        multiple={false}
        accept="application/pdf,.pdf"
        leftPane={
          files[0] ? (
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <Wrench size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{files[0].name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{(files[0].size / 1024).toFixed(0)} KB</div>
                </div>
              </div>

              {log.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Repair Log</div>
                  {log.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {processing && i === log.length - 1
                        ? <Loader size={12} style={{ animation: 'spin 1s linear infinite', flexShrink: 0, color: 'var(--primary-color)' }} />
                        : <CheckCircle size={12} style={{ color: 'var(--success-color)', flexShrink: 0 }} />}
                      <span>{entry}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null
        }
      >
        <h3 className="options-title">About Repair</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--success-color)' }} />
            <span>Rebuilds the PDF cross-reference table and re-serializes the document structure using pdf-lib.</span>
          </div>
          <div style={{ background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            Works best on files with truncated structures or invalid xref tables from incomplete downloads.
          </div>
          <div style={{ background: 'rgba(255,71,87,0.04)', border: '1px solid rgba(255,71,87,0.15)', borderRadius: '8px', padding: '0.75rem' }}>
            Your original file is never modified. The repaired file is a new copy.
          </div>
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Repairing PDF..."
        description="Rebuilding document structure and cross-reference table..."
        isComplete={!!resultBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Repaired PDF"
      />
    </>
  );
}
