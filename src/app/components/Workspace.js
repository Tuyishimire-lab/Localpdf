'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';
import DragDropZone from './DragDropZone';
import MetadataViewer from './MetadataViewer';
import PrivacyProofBadge from './PrivacyProofBadge';
import { useSharedFile } from '../../context/FileContext';

export default function Workspace({
  title,
  icon: IconComponent,
  files,
  onFilesSelected,
  onClear,
  onProcess,
  processLabel,
  processing,
  accept = 'application/pdf',
  multiple = true,
  containerClassName = '',
  leftPane,
  children,
}) {
  const { sharedFiles, clearFile } = useSharedFile();
  const addInputRef = useRef(null);

  // Auto load files if routed from landing page drag-drop or workflow chaining
  useEffect(() => {
    if (sharedFiles.length > 0 && files.length === 0) {
      onFilesSelected(multiple ? sharedFiles : [sharedFiles[0]]);
      clearFile();
    }
  }, [sharedFiles, files, multiple, onFilesSelected, clearFile]);

  const firstFileIsPdf =
    files[0]?.type === 'application/pdf' || /\.pdf$/i.test(files[0]?.name || '');

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h1 className="workspace-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {IconComponent && <IconComponent size={24} style={{ color: 'var(--primary-color)' }} aria-hidden="true" />}
          {title}
        </h1>
        <Link
          href="/"
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
          }}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to Tools
        </Link>
      </div>

      {files.length === 0 ? (
        <div style={{ maxWidth: '650px', margin: '2rem auto', width: '100%' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <PrivacyProofBadge />
          </div>
          <DragDropZone
            onFilesSelected={onFilesSelected}
            accept={accept}
            multiple={multiple}
          />
        </div>
      ) : (
        <div className={`workspace-container ${containerClassName}`.trim()}>
          {/* Left panel: File queue or previews */}
          <div className="workspace-left" style={{ justifyContent: 'flex-start', alignItems: 'stretch' }}>
            <div className="workspace-actions-bar">
              <h3>
                {files.length} {files.length === 1 ? 'file' : 'files'} selected
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {multiple && (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => addInputRef.current?.click()}
                    >
                      <Plus size={16} aria-hidden="true" />
                      Add Files
                    </button>
                    <input
                      ref={addInputRef}
                      type="file"
                      tabIndex={-1}
                      aria-hidden="true"
                      multiple={multiple}
                      accept={accept}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          onFilesSelected(Array.from(e.target.files));
                          e.target.value = null;
                        }
                      }}
                    />
                  </>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClear}
                  style={{ color: 'var(--error-color)', borderColor: 'rgba(255, 107, 129, 0.2)' }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Clear All
                </button>
              </div>
            </div>

            {leftPane}
          </div>

          {/* Right panel: Operations options */}
          <aside className="workspace-right">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, width: '100%' }}>
              <PrivacyProofBadge compact={true} />
              {children}

              {/* PDF metadata accordion */}
              {firstFileIsPdf && <MetadataViewer file={files[0]} />}
            </div>

            {onProcess && processLabel && (
              <button
                type="button"
                className="btn-primary"
                onClick={onProcess}
                disabled={processing || files.length === 0}
                style={{ marginTop: '1.5rem', width: '100%' }}
              >
                {processLabel}
              </button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
