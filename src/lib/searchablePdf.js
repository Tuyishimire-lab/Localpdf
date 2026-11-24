/**
 * searchablePdf.js – Embeds invisible OCR text layers onto PDF pages cleanly.
 */

import { StandardFonts, degrees } from 'pdf-lib';
import { loadPdfLibSafely } from './pdfGuard';
import { mapNormalizedRectToPdf } from './pdfCoords';

export function sanitizeWinAnsiText(text = '') {
  return String(text ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

/**
 * Builds a searchable PDF by overlaying opacity-0 WinAnsi OCR text tokens onto existing pages.
 * @param {ArrayBuffer|Uint8Array} originalPdfBytes
 * @param {Array<{ pageIndex: number, imageWidth: number, imageHeight: number, words?: Array, lines?: Array, text?: string }>} ocrPages
 * @returns {Promise<Uint8Array>}
 */
export async function buildSearchablePdf(originalPdfBytes, ocrPages = []) {
  const pdfDoc = await loadPdfLibSafely(originalPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const entry of ocrPages) {
    if (!entry) continue;
    const page = pages[entry.pageIndex];
    if (!page) continue;

    const imgW = entry.imageWidth || 1;
    const imgH = entry.imageHeight || 1;
    const tokens =
      Array.isArray(entry.words) && entry.words.length > 0
        ? entry.words
        : Array.isArray(entry.lines) && entry.lines.length > 0
        ? entry.lines
        : [];

    if (tokens.length > 0) {
      for (const token of tokens) {
        const clean = sanitizeWinAnsiText(token?.text || '').trim();
        const bbox = token?.bbox;
        if (!clean || !bbox) continue;

        const normX = Math.max(0, Math.min(1, bbox.x0 / imgW));
        const normY = Math.max(0, Math.min(1, bbox.y0 / imgH));
        const normW = Math.max(0.005, Math.min(1, (bbox.x1 - bbox.x0) / imgW));
        const normH = Math.max(0.005, Math.min(1, (bbox.y1 - bbox.y0) / imgH));

        const mapped = mapNormalizedRectToPdf(page, {
          x: normX,
          y: normY,
          width: normW,
          height: normH,
        });

        const targetSize = Math.max(4, Math.min(72, mapped.height * 0.82));
        const measured = font.widthOfTextAtSize(clean, targetSize);
        const scaledSize =
          measured > 0 && mapped.width > 0
            ? Math.max(3, Math.min(targetSize, targetSize * (mapped.width / measured)))
            : targetSize;

        page.drawText(clean, {
          x: mapped.x,
          y: mapped.y,
          size: scaledSize,
          font,
          opacity: 0,
          rotate: degrees(mapped.rotateAngle),
        });
      }
    } else if (entry.text) {
      const lines = sanitizeWinAnsiText(entry.text)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const step = 1 / Math.max(12, lines.length + 2);
      lines.forEach((line, idx) => {
        const mapped = mapNormalizedRectToPdf(page, {
          x: 0.05,
          y: Math.min(0.95, 0.05 + idx * step),
          width: 0.9,
          height: Math.max(0.015, step * 0.7),
        });
        page.drawText(line, {
          x: mapped.x,
          y: mapped.y,
          size: Math.max(6, Math.min(12, mapped.height)),
          font,
          opacity: 0,
          rotate: degrees(mapped.rotateAngle),
        });
      });
    }
  }

  return pdfDoc.save();
}

