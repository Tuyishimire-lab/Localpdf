'use client';

import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

export default function DragDropZone({ 
  onFilesSelected, 
  accept = "application/pdf", 
  multiple = true,
  title = "Select PDF files",
  description = "or drag and drop them here"
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      // Reset input value so same file can be selected again
      e.target.value = null;
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  return (
    <div 
      className={`dropzone ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={inputRef}
        type="file"
        className="file-input"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
      />
      <div className="dropzone-icon">
        <Upload size={32} />
      </div>
      <div>
        <p className="dropzone-title">{title}</p>
        <p className="dropzone-desc">{description}</p>
      </div>
    </div>
  );
}
