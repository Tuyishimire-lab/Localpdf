import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker for PDF.js client-side rendering (self-hosted for offline/PWA support)
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.mjs';
}

/**
 * Loads a PDF file and returns the PDF.js document object.
 * @param {File | ArrayBuffer} file 
 * @param {string} [password]
 * @returns {Promise<any>}
 */
export async function loadPdf(file, password) {
  let arrayBuffer;
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }
  
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    ...(password ? { password } : {}),
  });
  return loadingTask.promise;
}

/**
 * Renders a PDF page to a canvas and returns its data URL (PNG format).
 * @param {any} pdfDoc 
 * @param {number} pageNum 1-indexed page number
 * @param {number} scale Zoom scale (default 0.5 for thumbnails)
 * @returns {Promise<string>} Data URL of the rendered page
 */
export async function renderPageToDataUrl(pdfDoc, pageNum, scale = 0.5) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };

  try {
    await page.render(renderContext).promise;
    return canvas.toDataURL('image/png');
  } finally {
    page.cleanup?.();
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Renders a page to canvas and returns a blob for downloading/image export.
 * @param {any} pdfDoc 
 * @param {number} pageNum 1-indexed page number
 * @param {number} scale Scale of the rendering (default 2.0 for high quality)
 * @param {string} format MIME type ('image/jpeg' | 'image/png' | 'image/webp')
 * @param {number} quality Compression quality for lossy formats (0..1)
 * @returns {Promise<Blob>} Image blob
 */
export async function renderPageToBlob(pdfDoc, pageNum, scale = 2.0, format = 'image/jpeg', quality = 0.9) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };

  try {
    await page.render(renderContext).promise;

    return await new Promise((resolve, reject) => {
      const cleanupCanvas = () => {
        canvas.width = 0;
        canvas.height = 0;
      };
      const onBlob = (blob) => {
        cleanupCanvas();
        if (!blob) {
          reject(new Error('Failed to render page to image blob.'));
          return;
        }
        resolve(blob);
      };

      if (format === 'image/png') {
        canvas.toBlob(onBlob, 'image/png');
      } else {
        canvas.toBlob(onBlob, format, quality);
      }
    });
  } catch (err) {
    canvas.width = 0;
    canvas.height = 0;
    throw err;
  } finally {
    page.cleanup?.();
  }
}
