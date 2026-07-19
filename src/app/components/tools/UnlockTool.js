'use client';

import { useState } from 'react';
import { Unlock, ShieldAlert } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

export default function UnlockTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  
  const [password, setPassword] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [decryptSuccess, setDecryptSuccess] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setIsLocked(false);
    setDecryptSuccess(false);

    try {
      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setIsLocked(false);
    } catch (err) {
      console.log("PDF load error details:", err);
      if (err.name === 'PasswordException' || err.message?.toLowerCase().includes('password') || err.message?.toLowerCase().includes('encrypt')) {
        setIsLocked(true);
        setTotalPages(0);
      } else {
        alert("Failed to load PDF file. The file may be corrupt.");
        setFiles([]);
      }
    }
  };

  const handleClear = () => {
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setPassword('');
    setIsLocked(false);
    setDecryptSuccess(false);
    setProcessedBlob(null);
  };

  const handleTestPassword = async () => {
    if (!password) {
      alert("Please enter a password.");
      return;
    }

    try {
      const fileBytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(fileBytes, { password: password });
      
      const arrayBuffer = await files[0].arrayBuffer();
      const pdfjsDoc = await pdfjsLib.getDocument({ data: arrayBuffer, password: password }).promise;
      
      setPdfDoc(pdfjsDoc);
      setTotalPages(pdfjsDoc.numPages);
      setDecryptSuccess(true);
      alert("Password verified! Previews loaded.");
    } catch (err) {
      console.error("Verification error:", err);
      alert("Incorrect password. Please try again.");
    }
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setModalOpen(true);

    try {
      const fileBytes = await files[0].arrayBuffer();
      let srcPdf;
      
      if (isLocked) {
        srcPdf = await PDFDocument.load(fileBytes, { password: password });
      } else {
        srcPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      }

      const targetPdf = await PDFDocument.create();
      const copiedPages = await targetPdf.copyPages(srcPdf, srcPdf.getPageIndices());
      copiedPages.forEach((page) => targetPdf.addPage(page));

      const pdfBytes = await targetPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Decryption error:", err);
      alert("Failed to unlock PDF. Ensure the password is correct.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    downloadFile(processedBlob, `${name}_unlocked.pdf`);
  };

  const leftPane = (
    <div style={{ width: '100%' }}>
      {isLocked && !decryptSuccess ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '3rem 2rem',
          textAlign: 'center',
          gap: '1rem',
          border: '1px solid rgba(255, 107, 129, 0.2)',
          background: 'rgba(255, 107, 129, 0.02)',
          borderRadius: 'var(--border-radius-lg)'
        }}>
          <div className="dropzone-icon" style={{ background: 'rgba(255, 107, 129, 0.08)', color: 'var(--error-color)' }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>This File is Password Protected</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '350px' }}>
            Please enter the correct password in the options sidebar to preview and unlock the pages.
          </p>
        </div>
      ) : (
        pdfDoc && (
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
        )
      )}
    </div>
  );

  return (
    <>
      <Workspace
        title="Unlock PDF"
        icon={Unlock}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={isLocked ? "Decrypt & Save PDF" : "Remove Restrictions"}
        processing={processing || (isLocked && !decryptSuccess)}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Decryption Settings</h3>

        {isLocked ? (
          <div className="options-group">
            <label className="options-label">Enter PDF Password</label>
            <input 
              type="password" 
              className="options-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
            />
            {!decryptSuccess ? (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleTestPassword}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Verify Password
              </button>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', display: 'block', marginTop: '0.25rem' }}>
                ✓ Password verified and loaded.
              </span>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            This document does not seem to require an open password. You can run the process to strip any owner permissions, print blocks, or meta locks immediately.
          </p>
        )}
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Unlocking PDF..."
        description="Removing locks, permissions restrictions and saving document..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Unlocked PDF"
      />
    </>
  );
}
