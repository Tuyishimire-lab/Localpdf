/**
 * pdfMetadataAndBates.js – PDF metadata inspection/scrubbing and legal Bates numbering / headers.
 */

import { StandardFonts, rgb, degrees } from 'pdf-lib';
import { loadPdfLibSafely } from './pdfGuard';
import { getVisualPageBox, mapVisualPointToPdf } from './pdfCoords';
import { sanitizeWinAnsiText } from './searchablePdf';

export async function readPdfMetadata(pdfBytes) {
  const pdfDoc = await loadPdfLibSafely(pdfBytes);
  return {
    title: pdfDoc.getTitle() || '',
    author: pdfDoc.getAuthor() || '',
    subject: pdfDoc.getSubject() || '',
    keywords: (pdfDoc.getKeywords() || '').trim(),
    creator: pdfDoc.getCreator() || '',
    producer: pdfDoc.getProducer() || '',
    creationDate: pdfDoc.getCreationDate()?.toISOString?.() || '',
    modificationDate: pdfDoc.getModificationDate()?.toISOString?.() || '',
    pageCount: pdfDoc.getPageCount(),
  };
}

export async function updatePdfMetadata(pdfBytes, fields = {}, { scrubAll = false } = {}) {
  const pdfDoc = await loadPdfLibSafely(pdfBytes);

  if (scrubAll) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
    pdfDoc.setCreationDate(new Date(0));
    pdfDoc.setModificationDate(new Date(0));
  } else {
    if (fields.title !== undefined) pdfDoc.setTitle(String(fields.title));
    if (fields.author !== undefined) pdfDoc.setAuthor(String(fields.author));
    if (fields.subject !== undefined) pdfDoc.setSubject(String(fields.subject));
    if (fields.keywords !== undefined) {
      const kwList = Array.isArray(fields.keywords)
        ? fields.keywords
        : String(fields.keywords)
            .split(/[,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);
      pdfDoc.setKeywords(kwList);
    }
    if (fields.creator !== undefined) pdfDoc.setCreator(String(fields.creator));
    if (fields.producer !== undefined) pdfDoc.setProducer(String(fields.producer));
    pdfDoc.setModificationDate(new Date());
  }

  return pdfDoc.save();
}

function hexToRgb(hex = '#111111') {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return rgb(0.1, 0.1, 0.1);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(Number.isNaN(r) ? 0 : r, Number.isNaN(g) ? 0 : g, Number.isNaN(b) ? 0 : b);
}

function drawAlignedVisualText(page, font, rawText, { position, fontSize, colorRgb, margin = 24 }) {
  const text = sanitizeWinAnsiText(rawText).trim();
  if (!text) return;

  const { visualWidth, visualHeight } = getVisualPageBox(page);
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize;
  const [row, col] = String(position || 'bottom-right').split('-');

  let vx = (visualWidth - textWidth) / 2;
  if (col === 'left') vx = margin;
  else if (col === 'right') vx = Math.max(margin, visualWidth - textWidth - margin);

  let vy = Math.max(margin, visualHeight - textHeight - margin);
  if (row === 'top') vy = margin;

  const mapped = mapVisualPointToPdf(page, vx, vy, textWidth, textHeight);
  page.drawText(text, {
    x: mapped.x,
    y: mapped.y,
    size: fontSize,
    font,
    color: colorRgb,
    rotate: degrees(mapped.rotateAngle),
  });
}

export async function applyBatesAndHeaders(
  pdfBytes,
  {
    prefix = 'CONF-',
    startNumber = 1,
    digits = 6,
    suffix = '',
    batesPosition = 'bottom-right',
    fontSize = 10,
    color = '#000000',
    headerLeft = '',
    headerCenter = '',
    headerRight = '',
    footerLeft = '',
    footerCenter = '',
    footerRight = '',
  } = {}
) {
  const pdfDoc = await loadPdfLibSafely(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const colorRgb = hexToRgb(color);
  const margin = 24;

  const padLen = Math.max(1, Math.min(12, parseInt(digits, 10) || 6));
  const start = Math.max(0, parseInt(startNumber, 10) || 1);

  let firstBates = '';
  let lastBates = '';

  const expandVars = (tpl, pageNumber) =>
    String(tpl || '')
      .replace(/\{page\}/gi, String(pageNumber))
      .replace(/\{total\}/gi, String(totalPages));

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const batesNum = start + i;
    const batesLabel = `${prefix}${String(batesNum).padStart(padLen, '0')}${suffix}`;
    if (i === 0) firstBates = batesLabel;
    lastBates = batesLabel;

    drawAlignedVisualText(page, font, batesLabel, {
      position: batesPosition,
      fontSize,
      colorRgb,
      margin,
    });

    const pNum = i + 1;
    const slots = [
      { pos: 'top-left', text: expandVars(headerLeft, pNum) },
      { pos: 'top-center', text: expandVars(headerCenter, pNum) },
      { pos: 'top-right', text: expandVars(headerRight, pNum) },
      { pos: 'bottom-left', text: expandVars(footerLeft, pNum) },
      { pos: 'bottom-center', text: expandVars(footerCenter, pNum) },
      { pos: 'bottom-right', text: expandVars(footerRight, pNum) },
    ];

    for (const slot of slots) {
      if (!slot.text || !slot.text.trim()) continue;
      // Avoid overwriting the Bates stamp if both occupy the same slot
      if (slot.pos === batesPosition) continue;
      drawAlignedVisualText(page, regularFont, slot.text, {
        position: slot.pos,
        fontSize: Math.max(8, fontSize - 1),
        colorRgb,
        margin,
      });
    }
  }

  const bytes = await pdfDoc.save();
  return {
    bytes,
    firstBates,
    lastBates,
    nextStartNumber: start + totalPages,
  };
}

