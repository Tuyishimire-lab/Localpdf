import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker for PDF.js client-side rendering
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  // Use unpkg to get the matching worker version
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs`;
}

/**
 * Loads a PDF file and returns the PDF.js document object.
 * @param {File | ArrayBuffer} file 
 * @returns {Promise<any>}
 */
export async function loadPdf(file) {
  let arrayBuffer;
  if (file instanceof File) {
    arrayBuffer = await file.arrayBuffer();
  } else {
    arrayBuffer = file;
  }
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
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
  
  await page.render(renderContext).promise;
  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl;
}

/**
 * Renders a page to canvas and returns a blob for downloading/image export.
 * @param {any} pdfDoc 
 * @param {number} pageNum 1-indexed page number
 * @param {number} scale Scale of the rendering (default 2.0 for high quality)
 * @returns {Promise<Blob>} Image blob
 */
export async function renderPageToBlob(pdfDoc, pageNum, scale = 2.0) {
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
  
  await page.render(renderContext).promise;
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}
