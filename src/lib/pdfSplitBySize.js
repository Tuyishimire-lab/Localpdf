/**
 * pdfSplitBySize.js – Splits PDFs cleanly by maximum part byte size or bookmark ranges.
 */

import { PDFDocument } from 'pdf-lib';
import { loadPdfLibSafely } from './pdfGuard';

export async function splitPdfByMaxSize(pdfBytes, maxBytes) {
  const limit = Math.max(1024, Number(maxBytes) || 10 * 1024 * 1024);
  const srcDoc = await loadPdfLibSafely(pdfBytes);
  const totalPages = srcDoc.getPageCount();
  const parts = [];

  let chunkIndices = [];
  let partNumber = 1;

  for (let i = 0; i < totalPages; i++) {
    const candidateIndices = [...chunkIndices, i];
    const probeDoc = await PDFDocument.create();
    const copied = await probeDoc.copyPages(srcDoc, candidateIndices);
    copied.forEach((p) => probeDoc.addPage(p));
    const candidateBytes = await probeDoc.save();

    if (chunkIndices.length > 0 && candidateBytes.length > limit) {
      const flushDoc = await PDFDocument.create();
      const flushPages = await flushDoc.copyPages(srcDoc, chunkIndices);
      flushPages.forEach((p) => flushDoc.addPage(p));
      const flushBytes = await flushDoc.save();
      parts.push({
        partNumber,
        startPage: chunkIndices[0] + 1,
        endPage: chunkIndices[chunkIndices.length - 1] + 1,
        bytes: flushBytes,
        size: flushBytes.length,
      });
      partNumber++;
      chunkIndices = [i];
    } else {
      chunkIndices = candidateIndices;
    }
  }

  if (chunkIndices.length > 0) {
    const finalDoc = await PDFDocument.create();
    const finalPages = await finalDoc.copyPages(srcDoc, chunkIndices);
    finalPages.forEach((p) => finalDoc.addPage(p));
    const finalBytes = await finalDoc.save();
    parts.push({
      partNumber,
      startPage: chunkIndices[0] + 1,
      endPage: chunkIndices[chunkIndices.length - 1] + 1,
      bytes: finalBytes,
      size: finalBytes.length,
    });
  }

  return parts;
}

export function computeBookmarkRanges(bookmarks = [], totalPages = 1) {
  const valid = (bookmarks || [])
    .filter((b) => b && Number.isFinite(b.page) && b.page >= 1 && b.page <= totalPages)
    .sort((a, b) => a.page - b.page);

  if (valid.length === 0) return [];

  // Deduplicate bookmarks starting on the same page
  const unique = [];
  for (const b of valid) {
    if (!unique.some((u) => u.page === b.page)) {
      unique.push({
        title: String(b.title || `Section ${b.page}`).trim(),
        page: b.page,
      });
    }
  }

  return unique.map((entry, idx) => {
    const nextStart = unique[idx + 1]?.page;
    return {
      title: entry.title,
      startPage: entry.page,
      endPage: nextStart ? nextStart - 1 : totalPages,
    };
  });
}

