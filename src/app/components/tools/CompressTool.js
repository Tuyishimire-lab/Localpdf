'use client';

import { useState } from 'react';
import { Minimize2 } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf, renderPageToBlob } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { PDFDocument } from 'pdf-lib';

export default function CompressTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState('recommended');
  
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
      let scale = 1.0;
      let quality = 0.7;

      if (compressionLevel === 'extreme') {
        scale = 0.8;
        quality = 0.55;
      } else if (compressionLevel === 'low') {
        scale = 1.4;
        quality = 0.85;
      }

      const compressedPdf = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        const imageBlob = await renderPageToBlob(pdfDoc, i, scale);
        const imageBytes = await imageBlob.arrayBuffer();
        const embeddedImage = await compressedPdf.embedJpg(imageBytes);
        
        const { width, height } = embeddedImage.scale(1.0);
        const page = compressedPdf.addPage([width, height]);
        
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: width,
          height: height
        });
      }

      const pdfBytes = await compressedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      setProcessedBlob(blob);
      setProcessing(false);
    } catch (err) {
      console.error("Compression error:", err);
      alert("Failed to compress PDF.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    downloadFile(processedBlob, `${name}_compressed.pdf`);
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
        title="Compress PDF"
        icon={Minimize2}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Compress PDF"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Compression Settings</h3>
        
        <div className="options-group">
          <label className="options-label">Compression Level</label>
          
          <div 
            className={`tool-card ${compressionLevel === 'extreme' ? 'active' : ''}`}
            style={{ 
              padding: '1rem', 
              cursor: 'pointer',
              borderColor: compressionLevel === 'extreme' ? 'var(--primary-color)' : 'var(--border-color)',
              background: compressionLevel === 'extreme' ? 'rgba(255, 71, 87, 0.05)' : 'var(--bg-card)'
            }}
            onClick={() => setCompressionLevel('extreme')}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Extreme Compression</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Less quality, high file size reduction. Ideal for scans.
            </div>
          </div>

          <div 
            className={`tool-card ${compressionLevel === 'recommended' ? 'active' : ''}`}
            style={{ 
              padding: '1rem', 
              cursor: 'pointer',
              borderColor: compressionLevel === 'recommended' ? 'var(--primary-color)' : 'var(--border-color)',
              background: compressionLevel === 'recommended' ? 'rgba(255, 71, 87, 0.05)' : 'var(--bg-card)'
            }}
            onClick={() => setCompressionLevel('recommended')}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Recommended Compression</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Good quality, good file size reduction. Default choice.
            </div>
          </div>

          <div 
            className={`tool-card ${compressionLevel === 'low' ? 'active' : ''}`}
            style={{ 
              padding: '1rem', 
              cursor: 'pointer',
              borderColor: compressionLevel === 'low' ? 'var(--primary-color)' : 'var(--border-color)',
              background: compressionLevel === 'low' ? 'rgba(255, 71, 87, 0.05)' : 'var(--bg-card)'
            }}
            onClick={() => setCompressionLevel('low')}
          >
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Less Compression</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              High quality, lower file size reduction. Maintains maximum detail.
            </div>
          </div>
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Compressing PDF..."
        description="Scaling and optimizing document pages..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Compressed PDF"
      />
    </>
  );
}
