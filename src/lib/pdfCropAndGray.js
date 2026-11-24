/**
 * pdfCropAndGray.js – Rotation-aware CropBox margin trimming & ITU-R BT.709 grayscale conversion.
 */

import { loadPdfLibSafely } from './pdfGuard';
import { getVisualPageBox } from './pdfCoords';
import { parsePageRanges } from './utils';

export async function applyCropMarginsToPdf(
  pdfBytes,
  { top = 0, right = 0, bottom = 0, left = 0, pageRange = '' } = {}
) {
  const pdfDoc = await loadPdfLibSafely(pdfBytes);
  const pages = pdfDoc.getPages();
  const targetIndices = parsePageRanges(pageRange, pages.length).map((n) => n - 1);

  for (const idx of targetIndices) {
    const page = pages[idx];
    if (!page) continue;

    const { boxX, boxY, boxWidth, boxHeight, rotation } = getVisualPageBox(page);

    // Convert visual insets (top, right, bottom, left) to unrotated PDF box insets
    let pdfLeft = left;
    let pdfBottom = bottom;
    let pdfRight = right;
    let pdfTop = top;

    if (rotation === 90) {
      pdfLeft = top;
      pdfRight = bottom;
      pdfBottom = left;
      pdfTop = right;
    } else if (rotation === 180) {
      pdfLeft = right;
      pdfRight = left;
      pdfBottom = top;
      pdfTop = bottom;
    } else if (rotation === 270) {
      pdfLeft = bottom;
      pdfRight = top;
      pdfBottom = right;
      pdfTop = left;
    }

    const nextX = boxX + Math.max(0, pdfLeft);
    const nextY = boxY + Math.max(0, pdfBottom);
    const nextW = Math.max(36, boxWidth - Math.max(0, pdfLeft) - Math.max(0, pdfRight));
    const nextH = Math.max(36, boxHeight - Math.max(0, pdfBottom) - Math.max(0, pdfTop));

    page.setCropBox(nextX, nextY, nextW, nextH);
  }

  return pdfDoc.save();
}

export function rgbaToGrayscale(data, contrast = 1.0) {
  const factor = Number.isFinite(contrast) ? contrast : 1.0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (factor !== 1.0) {
      lum = (lum - 128) * factor + 128;
    }
    const clamped = Math.max(0, Math.min(255, Math.round(lum)));
    data[i] = clamped;
    data[i + 1] = clamped;
    data[i + 2] = clamped;
  }
  return data;
}

export async function renderPageToGrayscaleBlob(
  pdfDoc,
  pageNum,
  { scale = 2.0, quality = 0.88, contrast = 1.05 } = {}
) {
  const page = await pdfDoc.getPage(pageNum);
  const canvas = document.createElement('canvas');
  try {
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    rgbaToGrayscale(imgData.data, contrast);
    ctx.putImageData(imgData, 0, 0);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`Failed to encode grayscale page ${pageNum}.`));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });
  } finally {
    page.cleanup?.();
    canvas.width = 0;
    canvas.height = 0;
  }
}

