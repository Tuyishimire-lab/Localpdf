'use client';

import { useState, useEffect } from 'react';
import { Lock, FileText } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { encryptPdf } from '../../../lib/qpdfEngine';
import { createBatchZip } from '../../../lib/batchZip';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export default function ProtectTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [allowModifying, setAllowModifying] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  const handleFilesSelected = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setFiles((prev) => [...prev, ...selectedFiles]);
    setProcessedBlob(null);

    if (files.length === 0 && selectedFiles.length === 1) {
      try {
        const doc = await loadPdf(selectedFiles[0]);
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error('Error loading PDF', err);
        toast.error('Failed to load PDF file.');
        setFiles([]);
      }
    } else {
      pdfDoc?.destroy?.();
      setPdfDoc(null);
      setTotalPages(0);
    }
  };

  const handleClear = () => {
    pdfDoc?.destroy?.();
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setProcessedBlob(null);
    setResultName('');
    setPassword('');
    setConfirmPassword('');
  };

  const encryptSinglePdf = async (file) => {
    const fileBytes = await file.arrayBuffer();
    const encryptedBytes = await encryptPdf(fileBytes, {
      userPassword: password,
      ownerPassword: `${password}_owner`,
      permissions: {
        printing: allowPrinting ? 'full' : 'none',
        copying: allowCopying,
        modifying: allowModifying,
      },
    });
    return new Blob([encryptedBytes], { type: 'application/pdf' });
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    if (!password) {
      toast.error('Please enter a password.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setProcessing(true);
    setModalOpen(true);

    try {
      if (files.length === 1) {
        const blob = await encryptSinglePdf(files[0]);
        setResultName(`${files[0].name.replace(/\.pdf$/i, '')}_protected.pdf`);
        setProcessedBlob(blob);
      } else {
        const outputs = [];
        for (const file of files) {
          const blob = await encryptSinglePdf(file);
          outputs.push({
            name: `${file.name.replace(/\.pdf$/i, '')}_protected.pdf`,
            blob,
          });
        }
        const zipBlob = await createBatchZip(outputs);
        setResultName('protected_pdfs.zip');
        setProcessedBlob(zipBlob);
      }
      setProcessing(false);
    } catch (err) {
      console.error('Encryption error:', err);
      toast.error(err?.message || 'Failed to encrypt PDF file.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, resultName || 'protected_document.pdf');
  };

  const leftPane =
    files.length === 1 && pdfDoc ? (
      <div style={{ width: '100%' }}>
        <div className="preview-grid">
          {Array.from({ length: totalPages }, (_, i) => (
            <PagePreview
              key={i}
              pdfDoc={pdfDoc}
              pageNum={i + 1}
              label={(i + 1).toString()}
            />
          ))}
        </div>
      </div>
    ) : files.length > 0 ? (
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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>AES-256 Queue</span>
          </div>
        ))}
      </div>
    ) : null;

  const totalInputSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <>
      <Workspace
        title="Protect PDF"
        icon={Lock}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={files.length > 1 ? `Encrypt ${files.length} PDFs` : 'Encrypt PDF'}
        processing={processing}
        multiple={true}
        leftPane={leftPane}
      >
        <h3 className="options-title">Security Password</h3>

        <div className="options-group">
          <label className="options-label">Enter Password</label>
          <input
            type="password"
            className="options-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type password..."
          />
        </div>

        <div className="options-group">
          <label className="options-label">Confirm Password</label>
          <input
            type="password"
            className="options-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Retype password..."
          />
        </div>

        <div className="options-group">
          <label className="options-label">Document Permissions (AES-256)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowPrinting}
                onChange={(e) => setAllowPrinting(e.target.checked)}
              />
              <span>Allow printing</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowCopying}
                onChange={(e) => setAllowCopying(e.target.checked)}
              />
              <span>Allow copying text &amp; graphics</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowModifying}
                onChange={(e) => setAllowModifying(e.target.checked)}
              />
              <span>Allow editing &amp; annotations</span>
            </label>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Adds client-side AES-256 encryption using WebAssembly. Drop multiple PDFs to protect a batch into a single ZIP.
        </p>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Encrypting PDF..."
        description="Setting security credentials and locks on the document..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel={files.length > 1 ? 'Download Batch ZIP' : 'Download Protected PDF'}
        resultBlob={processedBlob}
        resultFileName={resultName || 'protected_document.pdf'}
        currentToolId="protect"
        inputSize={totalInputSize}
      />
    </>
  );
}
