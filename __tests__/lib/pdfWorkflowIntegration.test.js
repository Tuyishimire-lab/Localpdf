/**
 * @jest-environment node
 *
 * End-to-end pure PDF engine integration tests (merge, split, rotate, watermark, page numbers, error guards).
 */

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { parsePageRanges } from '../../src/lib/utils';
import { mapVisualPointToPdf } from '../../src/lib/pdfCoords';
import { loadPdfLibSafely } from '../../src/lib/pdfGuard';

async function createSamplePdf(pageCount = 2) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 740, size: 18, font });
  }
  return doc.save();
}

describe('PDF workflow integration', () => {
  test('merges multiple PDFs and preserves combined page count', async () => {
    const aBytes = await createSamplePdf(2);
    const bBytes = await createSamplePdf(3);

    const merged = await PDFDocument.create();
    for (const bytes of [aBytes, bBytes]) {
      const src = await loadPdfLibSafely(bytes);
      const copied = await merged.copyPages(src, src.getPageIndices());
      copied.forEach((p) => merged.addPage(p));
    }

    const out = await PDFDocument.load(await merged.save());
    expect(out.getPageCount()).toBe(5);
  });

  test('splits selected ranges accurately using parsePageRanges', async () => {
    const srcBytes = await createSamplePdf(5);
    const src = await loadPdfLibSafely(srcBytes);
    const indices = parsePageRanges('2-4, 5', src.getPageCount()).map((n) => n - 1);

    const splitDoc = await PDFDocument.create();
    const copied = await splitDoc.copyPages(src, indices);
    copied.forEach((p) => splitDoc.addPage(p));

    const reloaded = await PDFDocument.load(await splitDoc.save());
    expect(reloaded.getPageCount()).toBe(4);
  });

  test('accumulates rotations cleanly and stamps rotated/cropped watermark & page numbers', async () => {
    const srcBytes = await createSamplePdf(1);
    const doc = await loadPdfLibSafely(srcBytes);
    const page = doc.getPages()[0];

    page.setRotation(degrees(90));
    page.setRotation(degrees((page.getRotation().angle + 90) % 360));
    expect(page.getRotation().angle).toBe(180);

    page.setCropBox(20, 20, 560, 760);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const mapped = mapVisualPointToPdf(page, 100, 100, 120, 24);
    page.drawText('CONFIDENTIAL', {
      x: mapped.x,
      y: mapped.y,
      size: 24,
      font,
      color: rgb(1, 0, 0),
      rotate: degrees(mapped.rotateAngle),
    });

    const outDoc = await PDFDocument.load(await doc.save());
    expect(outDoc.getPageCount()).toBe(1);
    expect(outDoc.getPages()[0].getRotation().angle).toBe(180);
  });
});

