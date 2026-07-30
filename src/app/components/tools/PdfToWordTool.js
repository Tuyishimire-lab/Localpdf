'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { downloadFile } from '../../../lib/utils';

export default function PdfToWordTool() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');

  const handleFilesSelected = (selected) => {
    setFiles([selected[0]]);
    setResultBlob(null);
  };

  const handleClear = () => {
    setFiles([]);
    setResultBlob(null);
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setModalOpen(true);
    setResultBlob(null);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
      ).toString();

      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const pageTexts = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const lines = [];
        let currentLine = [];
        let lastY = null;

        const sorted = [...textContent.items].sort((a, b) => {
          const ay = Math.round(a.transform[5]);
          const by = Math.round(b.transform[5]);
          return by - ay;
        });

        for (const item of sorted) {
          if (!('str' in item)) continue;
          const y = Math.round(item.transform[5]);
          if (lastY === null || Math.abs(y - lastY) < 5) {
            currentLine.push(item.str);
          } else {
            if (currentLine.length) lines.push(currentLine.join(' ').trim());
            currentLine = [item.str];
          }
          lastY = y;
        }
        if (currentLine.length) lines.push(currentLine.join(' ').trim());
        pageTexts.push(lines.filter(Boolean));
      }

      const { Document, Packer, Paragraph, TextRun, PageBreak } = await import('docx');

      const children = [];
      for (let p = 0; p < pageTexts.length; p++) {
        for (const line of pageTexts[p]) {
          const isHeading = line.length < 80 && /^[A-Z0-9]/.test(line);
          children.push(
            new Paragraph({
              children: [new TextRun({ text: line, bold: isHeading, size: isHeading ? 28 : 24 })],
              spacing: { after: isHeading ? 240 : 120 },
            })
          );
        }
        if (p < pageTexts.length - 1) {
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
      alert('Conversion failed. The PDF may be image-only (scanned). Try the OCR tool first.');
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
                <FileText size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{files[0].name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{(files[0].size / 1024).toFixed(0)} KB</div>
                </div>
              </div>
            </div>
          ) : null
        }
      >
        <h3 className="options-title">Conversion Notes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <div style={{ background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            Best results on digitally-created PDFs. Text and basic formatting are preserved.
          </div>
          <div style={{ background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            Scanned PDFs must go through the OCR tool first before converting to Word.
          </div>
          <div style={{ background: 'rgba(255,71,87,0.04)', border: '1px solid rgba(255,71,87,0.15)', borderRadius: '8px', padding: '0.75rem' }}>
            Complex layouts (columns, tables) may simplify during conversion.
          </div>
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Converting PDF to Word..."
        description="Extracting text and building Word document..."
        isComplete={!!resultBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download .docx"
      />
    </>
  );
}
