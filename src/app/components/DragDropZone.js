'use client';

import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

export default function DragDropZone({
  onFilesSelected,
  accept = 'application/pdf,.pdf',
  multiple = true,
  title = 'Select PDF files',
  description = 'or drag and drop them here',
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const resolvedAccept = accept === 'application/pdf' ? 'application/pdf,.pdf' : accept;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = '';
    }
  };

  const onButtonClick = (e) => {
    if (e?.target === inputRef.current) return;
    inputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onButtonClick(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={title}
      className={`dropzone ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        type="file"
        className="file-input"
        tabIndex={-1}
        aria-hidden="true"
        multiple={multiple}
        accept={resolvedAccept}
        onClick={(e) => e.stopPropagation()}
        onChange={handleChange}
      />
      <div className="dropzone-icon" aria-hidden="true">
        <Upload size={32} />
      </div>
      <div>
        <p className="dropzone-title">{title}</p>
        <p className="dropzone-desc">{description}</p>
      </div>
    </div>
  );
}
