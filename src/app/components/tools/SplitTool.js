'use client';

import { useState } from 'react';
import { Scissors } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import PagePreview from '../PagePreview';
import { loadPdf } from '../../../lib/pdfEngine';
import { parsePageRanges, downloadFile } from '../../../lib/utils';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export default function SplitTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [splitMode, setSplitMode] = useState('range');
  const [rangeInput, setRangeInput] = useState('');
  
  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [isZipOutput, setIsZipOutput] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);

    try {
      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setRangeInput(`1-${doc.numPages}`);
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
      const fileBytes = await files[0].arrayBuffer();
      const srcPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });

      if (splitMode === 'range') {
        const pagesToExtract = parsePageRanges(rangeInput, totalPages);
        if (pagesToExtract.length === 0) {
          throw new Error("No pages matched your range selection.");
        }

        const targetPdf = await PDFDocument.create();
        const zeroIndexedPages = pagesToExtract.map(p => p - 1);
        const copiedPages = await targetPdf.copyPages(srcPdf, zeroIndexedPages);
        
        copiedPages.forEach((page) => targetPdf.addPage(page));
        
        const pdfBytes = await targetPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        
        setProcessedBlob(blob);
        setIsZipOutput(false);
      } else {
        const zip = new JSZip();
        
        for (let i = 0; i < totalPages; i++) {
          const targetPdf = await PDFDocument.create();
          const [copiedPage] = await targetPdf.copyPages(srcPdf, [i]);
          targetPdf.addPage(copiedPage);
          
          const pdfBytes = await targetPdf.save();
          zip.file(`${files[0].name.replace('.pdf', '')}_page_${i + 1}.pdf`, pdfBytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setProcessedBlob(zipBlob);
        setIsZipOutput(true);
      }
      setProcessing(false);
    } catch (err) {
      console.error("Splitting error:", err);
      alert(err.message || "Failed to split PDF.");
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const name = files[0].name.replace('.pdf', '');
    if (isZipOutput) {
      downloadFile(processedBlob, `${name}_split.zip`);
    } else {
      downloadFile(processedBlob, `${name}_range.pdf`);
    }
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
        title="Split PDF"
        icon={Scissors}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Split PDF"
        processing={processing}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Split Configuration</h3>
        
        <div className="options-group">
          <label className="options-label">Split Mode</label>
          <div className="segment-control">
            <button 
              className={`segment-btn ${splitMode === 'range' ? 'active' : ''}`}
              onClick={() => setSplitMode('range')}
            >
              Extract Range
            </button>
            <button 
              className={`segment-btn ${splitMode === 'all' ? 'active' : ''}`}
              onClick={() => setSplitMode('all')}
            >
              Split All Pages
            </button>
          </div>
        </div>

        {splitMode === 'range' && (
          <div className="options-group">
            <label className="options-label">Page Ranges</label>
            <input 
              type="text" 
              className="options-input" 
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g. 1-3, 5"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Type ranges separated by commas. Max pages: {totalPages}.
            </span>
          </div>
        )}

        {splitMode === 'all' && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Every page will be split into a separate file. Output will be packaged in a ZIP.
          </p>
        )}
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title={splitMode === 'range' ? "Extracting Pages..." : "Splitting Document..."}
        description={splitMode === 'range' ? "Copying selected pages to a new PDF..." : "Extracting and archiving all pages into a ZIP file..."}
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel={isZipOutput ? "Download ZIP" : "Download Extracted PDF"}
      />
    </>
  );
}
