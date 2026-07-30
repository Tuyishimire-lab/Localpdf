'use client';

import { useState } from 'react';
import { Layers, Info } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { downloadFile } from '../../../lib/utils';

export default function FlattenTool() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [stats, setStats] = useState(null);

  const handleFilesSelected = (selected) => {
    setFiles([selected[0]]);
    setResultBlob(null);
    setStats(null);
  };

  const handleClear = () => {
    setFiles([]);
    setResultBlob(null);
    setStats(null);
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setModalOpen(true);
    setResultBlob(null);

    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const arrayBuffer = await files[0].arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      const form = pdfDoc.getForm();
      const fields = form.getFields();
      let fieldsFlattened = 0;

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const field of fields) {
        try {
          const fieldType = field.constructor.name;
          if (fieldType === 'PDFTextField') {
            const value = field.getText() || '';
            const widgets = field.acroField.getWidgets();
            for (const widget of widgets) {
              const rect = widget.getRectangle();
              const pageRef = widget.P();
              if (!pageRef || !value) continue;
              const pages = pdfDoc.getPages();
              for (const page of pages) {
                if (page.ref === pageRef) {
                  page.drawText(value, {
                    x: rect.x + 2,
                    y: rect.y + 2,
                    size: 10,
                    font,
                    color: rgb(0, 0, 0),
                    maxWidth: rect.width - 4,
                  });
                  break;
                }
              }
            }
          }
          fieldsFlattened++;
        } catch {
          // skip individual field errors
        }
      }

      form.flatten();

      const flatBytes = await pdfDoc.save();
      const blob = new Blob([flatBytes], { type: 'application/pdf' });
      const name = files[0].name.replace(/\.pdf$/i, '_flattened.pdf');

      setResultBlob(blob);
      setResultName(name);
      setStats({ fields: fieldsFlattened, outputKb: (flatBytes.length / 1024).toFixed(0) });
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setProcessing(false);
      setModalOpen(false);
      alert('Failed to flatten the PDF. It may be password-protected or corrupted.');
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadFile(resultBlob, resultName);
  };

  return (
    <>
      <Workspace
        title="Flatten PDF"
        icon={Layers}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel="Flatten PDF"
        processing={processing}
        multiple={false}
        leftPane={
          files[0] ? (
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                <Layers size={20} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{files[0].name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{(files[0].size / 1024).toFixed(0)} KB</div>
                </div>
              </div>
              {stats && (
                <div style={{ marginTop: '1rem', background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  ✓ {stats.fields} field{stats.fields !== 1 ? 's' : ''} flattened · Output: {stats.outputKb} KB
                </div>
              )}
            </div>
          ) : null
        }
      >
        <h3 className="options-title">About Flattening</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'rgba(46,213,115,0.06)', border: '1px solid rgba(46,213,115,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--success-color)' }} />
            <span>Form fields and annotations are permanently removed and rendered as static page content.</span>
          </div>
          <div style={{ background: 'rgba(255,204,0,0.06)', border: '1px solid rgba(255,204,0,0.2)', borderRadius: '8px', padding: '0.75rem' }}>
            This action is irreversible. Keep a copy of the original if you may need to edit it later.
          </div>
          <div style={{ background: 'rgba(255,71,87,0.04)', border: '1px solid rgba(255,71,87,0.15)', borderRadius: '8px', padding: '0.75rem' }}>
            Cryptographic digital signatures become invalid after flattening.
          </div>
        </div>
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Flattening PDF..."
        description="Removing interactive layers and locking in field values..."
        isComplete={!!resultBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Flattened PDF"
      />
    </>
  );
}
