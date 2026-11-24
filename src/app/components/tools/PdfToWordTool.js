'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, AlertTriangle } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf } from '../../../lib/pdfEngine';
import { extractStructuredLines } from '../../../lib/pdfLayout';
import { downloadFile } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export default function PdfToWordTool() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [scannedWarning, setScannedWarning] = useState(false);

  const handleFilesSelected = (selected) => {
    setFiles([selected[0]]);
    setResultBlob(null);
    setScannedWarning(false);
  };

  const handleClear = () => {
    setFiles([]);
    setResultBlob(null);
    setScannedWarning(false);
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setModalOpen(true);
    setResultBlob(null);
    setScannedWarning(false);

    let pdf = null;
    try {
      pdf = await loadPdf(files[0]);
      const numPages = pdf.numPages;

      const pageLines = [];
      let totalChars = 0;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        try {
          const viewport = page.getViewport({ scale: 1.0 });
          const textContent = await page.getTextContent();
          const structured = extractStructuredLines(textContent.items, viewport.width);
          totalChars += structured.totalChars;
          pageLines.push(structured.lines);
        } finally {
          page.cleanup?.();
        }
      }

      if (totalChars === 0) {
        setScannedWarning(true);
        setProcessing(false);
        setModalOpen(false);
        toast.error('This PDF appears to be scanned with no embedded text. Run OCR PDF first.');
        return;
      }

      if (totalChars < 20) {
        setScannedWarning(true);
        toast.info('Very little selectable text found. If output is incomplete, try OCR PDF first.');
      }

      const { Document, Packer, Paragraph, TextRun, PageBreak } = await import('docx');

      const children = [];
      for (let p = 0; p < pageLines.length; p++) {
        for (const line of pageLines[p]) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.text,
                  bold: line.isHeading,
                  size: line.isHeading ? 28 : 24,
                }),
              ],
              spacing: { after: line.isHeading ? 220 : 120 },
            })
          );
        }
        if (p < pageLines.length - 1) {
          children.push(new Paragraph({ children: [new PageBreak()] }));
        }
      }

      const doc = new Document({
        creator: 'LocalPDF',
        description: `Converted from ${files[0].name}`,
        sections: [{ children }],
      });

      const blob = await Packer.toBlob(doc);
      const name = files[0].name.replace(/\.pdf$/i, '.docx');
      setResultBlob(blob);
      setResultName(name);
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setProcessing(false);
      setModalOpen(false);
      toast.error('Conversion failed. The PDF may be image-only (scanned). Try the OCR tool first.');
    } finally {
      await pdf?.destroy?.();
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadFile(resultBlob, resultName);
  };

  return (
    <>
      <Workspace
        title="PDF to Word"
        icon={FileText}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Convert to Word"
        processing={processing}
        multiple={false}
        leftPane={
          files[0] ? (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <FileText size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{files[0].name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{(files[0].size / 1024).toFixed(0)} KB</div>
                </div>
              </div>
              {scannedWarning && (
                <div style={{ marginTop: '1rem', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 204, 0, 0.35)', background: 'rgba(255, 204, 0, 0.08)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={18} style={{ color: '#ffcc00', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                    <strong>Scanned PDF detected:</strong> No selectable text layer was found.{' '}
                    <Link href="/tools/ocr" style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'underline' }}>
                      Run OCR PDF to extract text or build a searchable PDF →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : null
        }
      >
        <h3 className="options-title">Conversion Notes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <div style={{ background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            Column-aware extraction detects multi-column layouts and heading hierarchy automatically.
          </div>
          <div style={{ background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            Scanned image-only PDFs should go through the <Link href="/tools/ocr" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>OCR PDF</Link> tool first.
          </div>
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Converting PDF to Word..."
        description="Analyzing layout and building Word document..."
        isComplete={!!resultBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download .docx"
        resultBlob={resultBlob}
        resultFileName={resultName || 'document.docx'}
        currentToolId="pdf-to-word"
        inputSize={files[0]?.size}
      />
    </>
  );
}
