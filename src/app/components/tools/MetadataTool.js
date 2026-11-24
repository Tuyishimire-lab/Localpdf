'use client';

import { useState } from 'react';
import { FileCode, ShieldAlert } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { readPdfMetadata, updatePdfMetadata } from '../../../lib/pdfMetadataAndBates';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

const EMPTY_META = {
  title: '',
  author: '',
  subject: '',
  keywords: '',
  creator: '',
  producer: '',
  creationDate: '',
  modificationDate: '',
  pageCount: 0,
};

export default function MetadataTool() {
  const [files, setFiles] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const handleFilesSelected = async (selected) => {
    const file = selected?.[0];
    if (!file) return;
    setFiles([file]);
    setProcessedBlob(null);

    try {
      const bytes = await file.arrayBuffer();
      const info = await readPdfMetadata(bytes);
      setMeta(info);
    } catch (err) {
      console.error('Metadata read error:', err);
      toast.error(err?.message || 'Failed to read PDF metadata.');
      setFiles([]);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setMeta(EMPTY_META);
    setProcessedBlob(null);
    setResultName('');
  };

  const saveWithOptions = async ({ scrubAll = false } = {}) => {
    if (!files[0]) return;
    setProcessing(true);
    setModalOpen(true);
    setProcessedBlob(null);

    try {
      const bytes = await files[0].arrayBuffer();
      const outBytes = await updatePdfMetadata(bytes, meta, { scrubAll });
      if (scrubAll) {
        setMeta({
          ...EMPTY_META,
          pageCount: meta.pageCount,
        });
      }
      const stem = files[0].name.replace(/\.pdf$/i, '');
      setResultName(scrubAll ? `${stem}_scrubbed.pdf` : `${stem}_metadata.pdf`);
      setProcessedBlob(new Blob([outBytes], { type: 'application/pdf' }));
      setProcessing(false);
    } catch (err) {
      console.error('Metadata save error:', err);
      toast.error(err?.message || 'Failed to update PDF metadata.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, resultName || 'updated_metadata.pdf');
  };

  const leftPane =
    files.length > 0 ? (
      <div style={{ padding: '1.25rem', width: '100%' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Document Properties</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.84rem' }}>
            <div><strong>File:</strong> {files[0].name}</div>
            <div><strong>Size:</strong> {formatBytes(files[0].size)}</div>
            <div><strong>Pages:</strong> {meta.pageCount}</div>
            <div><strong>Created:</strong> {meta.creationDate ? new Date(meta.creationDate).toLocaleDateString() : '—'}</div>
            <div><strong>Modified:</strong> {meta.modificationDate ? new Date(meta.modificationDate).toLocaleDateString() : '—'}</div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <Workspace
        title="Metadata Editor & Scrubber"
        icon={FileCode}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={() => saveWithOptions({ scrubAll: false })}
        processLabel="Save Metadata Changes"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Edit PDF Properties</h3>

        {[
          { key: 'title', label: 'Title' },
          { key: 'author', label: 'Author' },
          { key: 'subject', label: 'Subject' },
          { key: 'keywords', label: 'Keywords (comma-separated)' },
          { key: 'creator', label: 'Creator App' },
          { key: 'producer', label: 'Producer Engine' },
        ].map(({ key, label }) => (
          <div key={key} className="options-group" style={{ marginBottom: '0.6rem' }}>
            <label className="options-label">{label}</label>
            <input
              type="text"
              className="options-input"
              value={meta[key] || ''}
              onChange={(e) => setMeta((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder="(Empty)"
            />
          </div>
        ))}

        <button
          type="button"
          className="btn-secondary"
          onClick={() => saveWithOptions({ scrubAll: true })}
          disabled={processing}
          style={{ width: '100%', color: 'var(--error-color)', borderColor: 'rgba(255,107,129,0.35)', marginTop: '0.5rem' }}
        >
          <ShieldAlert size={15} aria-hidden="true" /> Scrub All Privacy Metadata
        </button>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Updating Metadata..."
        description="Writing clean PDF document info fields..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Updated PDF"
        resultBlob={processedBlob}
        resultFileName={resultName || 'updated_metadata.pdf'}
        currentToolId="metadata"
        inputSize={files[0]?.size}
      />
    </>
  );
}

