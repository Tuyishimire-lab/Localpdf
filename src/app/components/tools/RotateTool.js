'use client';

import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { PDFDocument, degrees } from 'pdf-lib';

export default function RotateTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRotations, setPageRotations] = useState({});
  
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
      
      const rotations = {};
      for (let i = 0; i < doc.numPages; i++) {
        rotations[i] = 0;
      }
      setPageRotations(rotations);
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
    setPageRotations({});
    setProcessedBlob(null);
  };

  const handleRotatePage = (index) => {
    setPageRotations((prev) => ({
      ...prev,
      [index]: (prev[index] + 90) % 360
    }));
  };

  const handleRotateAll = (amount) => {
    setPageRotations((prev) => {
      const updated = { ...prev };
      for (let i = 0; i < totalPages; i++) {
        updated[i] = (updated[i] + amount + 360) % 360;
      }
      return updated;
    });
  };

  const handleProcess = async () => {
    if (!pdfDoc || files.length === 0) return;
    setProcessing(true);
    setModalOpen(true);

    try {
      const fileBytes = await files[0].arrayBuffer();
      const targetPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const pages = targetPdf.getPages();

      for (let i = 0; i < totalPages; i++) {
        const extraRotation = pageRotations[i] || 0;
        if (extraRotation === 0) continue;

        const page = pages[i];
        const currentRotation = page.getRotation().angle;
        const newRotation = (currentRotation + extraRotation) % 360;
        page.setRotation(degrees(newRotation));
      }

      const pdfBytes = await targetPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Rotation error:", err);
      alert("Failed to rotate PDF pages.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    downloadFile(processedBlob, `${name}_rotated.pdf`);
  };

  const leftPane = pdfDoc ? (
    <div style={{ width: '100%' }}>
      <div className="preview-grid">
        {Array.from({ length: totalPages }, (_, i) => (
          <PagePreview
            key={i}
            pdfDoc={pdfDoc}
            pageNum={i + 1}
            rotation={pageRotations[i] || 0}
            onRotate={() => handleRotatePage(i)}
            label={(i + 1).toString()}
          />
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <Workspace
        title="Rotate PDF"
        icon={RotateCw}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Save Rotations"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Rotate Settings</h3>
        
        <div className="options-group">
          <label className="options-label">Bulk Operations</label>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => handleRotateAll(90)}
            style={{ width: '100%' }}
          >
            Rotate All Clockwise (90°)
          </button>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => handleRotateAll(-90)}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Rotate All Counter-Clockwise (90°)
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          You can rotate pages individually by clicking the rotate icon on each card, or rotate the entire document at once. All modifications will execute client-side.
        </p>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Applying Rotations..."
        description="Setting rotation properties for PDF pages..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Rotated PDF"
      />
    </>
  );
}
