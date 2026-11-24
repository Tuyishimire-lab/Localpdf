'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileCheck2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import Workspace from '../Workspace';
import ProgressModal from '../ProgressModal';
import { loadPdf, renderPageToDataUrl } from '../../../lib/pdfEngine';
import { inspectAcroFormFields, fillAcroFormFields } from '../../../lib/pdfFormAndImages';
import { downloadFile } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

export default function FillFormTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const [pageImg, setPageImg] = useState(null);

  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [flattenAfterFill, setFlattenAfterFill] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    return () => {
      pdfDoc?.destroy?.();
    };
  }, [pdfDoc]);

  useEffect(() => {
    let cancelled = false;
    async function renderPreview() {
      if (!pdfDoc) return;
      try {
        const url = await renderPageToDataUrl(pdfDoc, activePage + 1, 1.1);
        if (!cancelled) setPageImg(url);
      } catch (err) {
        console.error('Form preview error:', err);
      }
    }
    renderPreview();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, activePage]);

  const handleFilesSelected = async (selected) => {
    const file = selected?.[0];
    if (!file) return;
    pdfDoc?.destroy?.();
    setFiles([file]);
    setActivePage(0);
    setProcessedBlob(null);
    setFields([]);
    setValues({});

    try {
      const [doc, buf] = await Promise.all([loadPdf(file), file.arrayBuffer()]);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);

      const inspected = await inspectAcroFormFields(buf);
      setFields(inspected);
      const initialValues = {};
      inspected.forEach((f) => {
        initialValues[f.name] = f.value;
      });
      setValues(initialValues);
    } catch (err) {
      console.error('Inspect form error:', err);
      toast.error(err?.message || 'Failed to inspect PDF form fields.');
      setFiles([]);
    }
  };

  const handleClear = () => {
    pdfDoc?.destroy?.();
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setActivePage(0);
    setPageImg(null);
    setFields([]);
    setValues({});
    setProcessedBlob(null);
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setModalOpen(true);
    setProcessedBlob(null);

    try {
      const bytes = await files[0].arrayBuffer();
      const outBytes = await fillAcroFormFields(bytes, values, { flattenAfterFill });
      setProcessedBlob(new Blob([outBytes], { type: 'application/pdf' }));
      setProcessing(false);
    } catch (err) {
      console.error('Fill form error:', err);
      toast.error(err?.message || 'Failed to fill PDF form fields.');
      setModalOpen(false);
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob || !files[0]) return;
    const stem = files[0].name.replace(/\.pdf$/i, '');
    downloadFile(processedBlob, `${stem}_filled.pdf`);
  };

  const leftPane =
    files.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '1rem' }}>
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(7,7,20,0.8)', padding: '0.5rem 1rem', borderRadius: 'var(--border-radius-md)' }}>
            <button
              type="button"
              className="rotate-card-btn"
              disabled={activePage === 0}
              onClick={() => setActivePage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              Page {activePage + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="rotate-card-btn"
              disabled={activePage === totalPages - 1}
              onClick={() => setActivePage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}
        {pageImg && (
          <div style={{ background: '#ffffff', borderRadius: '4px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pageImg}
              alt={`Form page ${activePage + 1}`}
              style={{ display: 'block', maxWidth: '100%', maxHeight: '62vh', height: 'auto' }}
            />
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      <Workspace
        title="Fill PDF Forms"
        icon={FileCheck2}
        files={files}
        onFilesSelected={handleFilesSelected}
        onClear={handleClear}
        onProcess={handleProcess}
        processLabel={flattenAfterFill ? 'Save & Flatten Form' : 'Save Filled Form'}
        processing={processing || fields.length === 0}
        multiple={false}
        leftPane={leftPane}
      >
        <h3 className="options-title">Detected Form Fields ({fields.length})</h3>

        {fields.length === 0 ? (
          <div style={{ padding: '0.9rem', borderRadius: '8px', border: '1px solid rgba(255,204,0,0.3)', background: 'rgba(255,204,0,0.06)', fontSize: '0.84rem', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              <AlertTriangle size={16} style={{ color: '#ffcc00' }} aria-hidden="true" />
              No AcroForm Fields Found
            </div>
            This PDF uses flat visual lines rather than fillable AcroForm fields. Use{' '}
            <Link href="/tools/edit" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Edit PDF</Link>{' '}
            or <Link href="/tools/sign" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>Sign PDF</Link> to type or sign anywhere on the page.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '42vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {fields.map((field) => (
                <div key={field.name} className="options-group" style={{ marginBottom: 0 }}>
                  {field.type === 'checkbox' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(values[field.name])}
                        disabled={field.readOnly}
                        onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.checked }))}
                        style={{ accentColor: 'var(--primary-color)' }}
                      />
                      <span>{field.name}</span>
                    </label>
                  ) : field.type === 'dropdown' || field.type === 'radio' ? (
                    <>
                      <label className="options-label">{field.name}</label>
                      <select
                        className="options-select"
                        value={values[field.name] || ''}
                        disabled={field.readOnly}
                        onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                      >
                        <option value="">-- Select --</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </>
                  ) : field.type === 'text' ? (
                    <>
                      <label className="options-label">{field.name}</label>
                      <input
                        type="text"
                        className="options-input"
                        value={values[field.name] || ''}
                        disabled={field.readOnly}
                        onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        placeholder="Enter value..."
                      />
                    </>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {field.name} (signature / unsupported field type)
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="options-group" style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={flattenAfterFill}
                  onChange={(e) => setFlattenAfterFill(e.target.checked)}
                  style={{ accentColor: 'var(--primary-color)' }}
                />
                Flatten form fields (lock values as static text)
              </label>
            </div>
          </>
        )}
      </Workspace>

      <ProgressModal
        isOpen={modalOpen}
        title="Saving PDF Form..."
        description="Writing filled values into AcroForm fields..."
        isComplete={!!processedBlob}
        onDownload={handleDownload}
        onClose={() => setModalOpen(false)}
        downloadLabel="Download Filled PDF"
        resultBlob={processedBlob}
        resultFileName={files[0] ? `${files[0].name.replace(/\.pdf$/i, '')}_filled.pdf` : 'filled_form.pdf'}
        currentToolId="fill-form"
        inputSize={files[0]?.size}
      />
    </>
  );
}

