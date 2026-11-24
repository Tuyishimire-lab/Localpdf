'use client';

import { useState, useEffect } from 'react';
import { RotateCw, FileText } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { loadPdfLibSafely } from '../../../lib/pdfGuard';
import { createBatchZip } from '../../../lib/batchZip';
import { downloadFile, formatBytes } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';
import { degrees } from 'pdf-lib';

export default function RotateTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageRotations, setPageRotations] = useState({});
  const [batchRotation, setBatchRotation] = useState(90);

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

        const rotations = {};
        for (let i = 0; i < doc.numPages; i++) {
          rotations[i] = 0;
        }
        setPageRotations(rotations);
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
    setPageRotations({});
    setProcessedBlob(null);
    setResultName('');
  };

  const handleRotatePage = (index) => {
    setPageRotations((prev) => ({
      ...prev,
      [index]: (prev[index] + 90) % 360,
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

  const rotateSingleFile = async (file, perPageMap, fallbackAngle) => {
    const fileBytes = await file.arrayBuffer();
    const targetPdf = await loadPdfLibSafely(fileBytes);
    const pages = targetPdf.getPages();

    for (let i = 0; i < pages.length; i++) {
      const extraRotation = perPageMap ? perPageMap[i] || 0 : fallbackAngle;
      if (extraRotation === 0) continue;
      const page = pages[i];
      const currentRotation = page.getRotation().angle;
      const newRotation = (((currentRotation + extraRotation) % 360) + 360) % 360;
      page.setRotation(degrees(newRotation));
    }

    const pdfBytes = await targetPdf.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setModalOpen(true);

    try {
      if (files.length === 1) {
        const blob = await rotateSingleFile(files[0], pageRotations, batchRotation);
        setResultName(`${files[0].name.replace(/\.pdf$/i, '')}_rotated.pdf`);
        setProcessedBlob(blob);
      } else {
        const outputs = [];
        for (const file of files) {
          const blob = await rotateSingleFile(file, null, batchRotation);
          outputs.push({
            name: `${file.name.replace(/\.pdf$/i, '')}_rotated.pdf`,
            blob,
          });
        }
        const zipBlob = await createBatchZip(outputs);
        setResultName('rotated_pdfs.zip');
        setProcessedBlob(zipBlob);
      }
      setProcessing(false);
    } catch (err) {
      console.error('Rotation error:', err);
      toast.error(err?.message || 'Failed to rotate PDF pages.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    downloadFile(processedBlob, resultName || 'rotated_document.pdf');
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
              rotation={pageRotations[i] || 0}
              onRotate={() => handleRotatePage(i)}
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
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rotate {batchRotation}°</span>
          </div>
        ))}
      </div>
    ) : null;

  const totalInputSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <>
      <Workspace
        title="Rotate PDF"
        icon={RotateCw}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={files.length > 1 ? `Rotate ${files.length} PDFs` : 'Save Rotations'}
        processing={processing}
        multiple={true}
        leftPane={leftPane}
      >
        <h3 className="options-title">Rotate Settings</h3>

        {files.length > 1 ? (
          <div className="options-group">
            <label className="options-label">Batch Rotation Angle (All Files)</label>
            <select
              className="options-select"
              value={batchRotation}
              onChange={(e) => setBatchRotation(parseInt(e.target.value, 10))}
            >
              <option value={90}>90° Clockwise</option>
              <option value={180}>180° Flip</option>
              <option value={270}>90° Counter-Clockwise</option>
            </select>
          </div>
        ) : (
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
        )}

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Rotate single-document pages individually or queue multiple PDFs for batch rotation & ZIP download.
        </p>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Applying Rotations..."
        description="Setting rotation properties for PDF pages..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel={files.length > 1 ? 'Download Batch ZIP' : 'Download Rotated PDF'}
        resultBlob={processedBlob}
        resultFileName={resultName || 'rotated_document.pdf'}
        currentToolId="rotate"
        inputSize={totalInputSize}
      />
    </>
  );
}
