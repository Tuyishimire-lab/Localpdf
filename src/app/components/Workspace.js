'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';
import DragDropZone from './DragDropZone';
import MetadataViewer from './MetadataViewer';
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
  accept = "application/pdf",
  multiple = true,
  leftPane,
  children // Settings options panel
}) {
  const { sharedFile, clearFile } = useSharedFile();

  // Auto load file if routed from landing page drag-drop
  useEffect(() => {
    if (sharedFile && files.length === 0) {
      onFilesSelected([sharedFile]);
      clearFile();
    }
  }, [sharedFile, files, onFilesSelected, clearFile]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" className="btn-secondary" style={{ display: 'inline-flex', marginBottom: '1rem' }}>
          <ArrowLeft size={16} />
          Back to Tools
        </Link>
        <h1 className="workspace-title">
          {IconComponent && <IconComponent size={28} style={{ color: 'var(--primary-color)' }} />}
          {title}
        </h1>
      </div>

      {files.length === 0 ? (
        <div style={{ maxWidth: '650px', margin: '3rem auto', width: '100%' }}>
          <DragDropZone
            onFilesSelected={onFilesSelected}
            accept={accept}
            multiple={multiple}
          />
        </div>
      ) : (
        <div className="workspace-container">
          {/* Left panel: File queue or previews */}
          <div className="workspace-left" style={{ justifyContent: 'flex-start', alignItems: 'stretch' }}>
            <div className="workspace-actions-bar">
              <h3>
                {files.length} {files.length === 1 ? 'file' : 'files'} selected
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {multiple && (
                  <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                    <Plus size={16} />
                    Add Files
                    <input
                      type="file"
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
                  </label>
                )}
                <button className="btn-secondary" onClick={onClear} style={{ color: 'var(--error-color)', borderColor: 'rgba(255, 107, 129, 0.2)' }}>
                  <Trash2 size={16} />
                  Clear All
                </button>
              </div>
            </div>

            {leftPane}
          </div>

          {/* Right panel: Operations options */}
          <aside className="workspace-right">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, width: '100%' }}>
              {children}
              
              {/* PDF metadata accordion */}
              {files[0]?.type === 'application/pdf' && (
                <MetadataViewer file={files[0]} />
              )}
            </div>
            
            <button 
              className="btn-primary" 
              onClick={onProcess}
              disabled={processing || files.length === 0}
              style={{ marginTop: '1.5rem', width: '100%' }}
            >
              {processLabel}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
