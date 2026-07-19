'use client';

import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf, renderPageToBlob } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import JSZip from 'jszip';

export default function PdfToJpgTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [imageFormat, setImageFormat] = useState('jpg');
  
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
  };

  const handleProcess = async () => {
    if (!pdfDoc || files.length === 0) return;
    setProcessing(true);
    setModalOpen(true);

    try {
      const zip = new JSZip();
      const ext = imageFormat === 'jpg' ? 'jpg' : 'png';
      
      for (let i = 1; i <= totalPages; i++) {
        const imageBlob = await renderPageToBlob(pdfDoc, i, 2.0);
        zip.file(`${files[0].name.replace('.pdf', '')}_page_${i}.${ext}`, imageBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      setProcessedBlob(zipBlob);
      setProcessing(false);
    } catch (err) {
      console.error("Image conversion error:", err);
      alert("Failed to convert PDF pages to images.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    downloadFile(processedBlob, `${name}_images.zip`);
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
        title="PDF to JPG"
        icon={ImageIcon}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Convert to JPG"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Image Export Settings</h3>
        
        <div className="options-group">
          <label className="options-label">Output Format</label>
          <div className="segment-control">
            <button 
              className={`segment-btn ${imageFormat === 'jpg' ? 'active' : ''}`}
              onClick={() => setImageFormat('jpg')}
            >
              JPG (Compressed)
            </button>
            <button 
              className={`segment-btn ${imageFormat === 'png' ? 'active' : ''}`}
              onClick={() => setImageFormat('png')}
            >
              PNG (Lossless)
            </button>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Every page of the PDF will be rendered at 2x resolution to ensure clear text and graphics. All pages will be exported as standard image files and compiled into a single ZIP archive.
        </p>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Converting PDF to Images..."
        description="Rendering each page as high-resolution graphics and archiving..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Images (ZIP)"
      />
    </>
  );
}
