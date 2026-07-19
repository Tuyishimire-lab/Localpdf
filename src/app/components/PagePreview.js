'use client';

import { useEffect, useState, useRef } from 'react';
import { renderPageToDataUrl } from '../../lib/pdfEngine';
import { RotateCw, Trash2 } from 'lucide-react';

export default function PagePreview({
  pdfDoc,
  pageNum,
  rotation = 0,
  onRotate,
  showRemove = false,
  onRemove,
  label = ""
}) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    async function renderThumbnail() {
      if (!pdfDoc) return;
      try {
        setLoading(true);
        // Render at 0.4 scale for preview thumbnails
        const url = await renderPageToDataUrl(pdfDoc, pageNum, 0.4);
        if (isMounted.current) {
          setImgSrc(url);
          setLoading(false);
        }
      } catch (err) {
        console.error("Thumbnail render error:", err);
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }

    renderThumbnail();

    return () => {
      isMounted.current = false;
    };
  }, [pdfDoc, pageNum]);

  return (
    <div className="preview-card">
      <div className="preview-badge">{label || pageNum}</div>
      
      {showRemove && onRemove && (
        <button 
          className="preview-remove-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          type="button"
          title="Remove"
        >
          <Trash2 size={12} />
        </button>
      )}

      <div className="preview-image-container">
        {loading ? (
          <div className="modal-spinner" style={{ width: '24px', height: '24px', borderWidth: '2px' }}></div>
        ) : (
          <img 
            src={imgSrc} 
            alt={`Page ${pageNum}`} 
            className="preview-image"
            style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease' }}
          />
        )}
      </div>

      <div className="preview-name">Page {pageNum}</div>
      {rotation !== 0 && (
        <div className="preview-meta">{rotation}° rotated</div>
      )}

      {onRotate && (
        <div className="rotate-actions">
          <button 
            type="button" 
            className="rotate-card-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRotate();
            }}
            title="Rotate Page"
          >
            <RotateCw size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
