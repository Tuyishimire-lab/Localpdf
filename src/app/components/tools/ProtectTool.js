'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { PDFDocument } from 'pdf-lib';

export default function ProtectTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);

    try {
      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.error("Error loading PDF", err);
      alert("Failed to load PDF file.");
      setFiles([]);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setProcessedBlob(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleProcess = async () => {
    if (!pdfDoc || files.length === 0) return;
    
    if (!password) {
      alert("Please enter a password.");
      return;
    }
    
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setProcessing(true);
    setModalOpen(true);

    try {
      const fileBytes = await files[0].arrayBuffer();
      const targetPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      
      targetPdf.encrypt({
        userPassword: password,
        ownerPassword: password + "_owner",
        permissions: {
          printing: 'highResolution',
          modifying: true,
          copying: true,
          annotating: true,
        }
      });

      const pdfBytes = await targetPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Encryption error:", err);
      alert("Failed to encrypt PDF file.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    downloadFile(processedBlob, `${name}_protected.pdf`);
  };

  const leftPane = pdfDoc ? (
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
  ) : null;

  return (
    <>
      <Workspace
        title="Protect PDF"
        icon={Lock}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Encrypt PDF"
        processing={processing}
        multiple={false}
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

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          This will add password encryption to your PDF document. Anyone trying to open the file will be prompted to enter the password. All encryption operations run completely locally.
        </p>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Encrypting PDF..."
        description="Setting security credentials and locks on the document..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Protected PDF"
      />
    </>
  );
}
