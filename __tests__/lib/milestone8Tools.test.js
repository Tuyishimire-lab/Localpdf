/**
 * @jest-environment node
 *
 * Unit tests for Milestone 8 PDF tool engines.
 */

import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import {
  extractTableRowsFromTextItems,
  rowsToCsv,
  buildMinimalXlsx,
} from '../../src/lib/pdfTableExtractor';
import { applyCropMarginsToPdf, rgbaToGrayscale } from '../../src/lib/pdfCropAndGray';
import {
  readPdfMetadata,
  updatePdfMetadata,
  applyBatesAndHeaders,
} from '../../src/lib/pdfMetadataAndBates';
import { splitPdfByMaxSize, computeBookmarkRanges } from '../../src/lib/pdfSplitBySize';
import { inspectAcroFormFields, fillAcroFormFields } from '../../src/lib/pdfFormAndImages';

async function createSamplePdf(pagesCount = 3) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pagesCount; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`Sample content page ${i + 1}`, { x: 60, y: 700, size: 16, font });
  }
  doc.setTitle('Quarterly Report');
  doc.setAuthor('Alice');
  return doc.save();
}

describe('Milestone 8 PDF tools pure engines', () => {
  test('pdfTableExtractor aligns columns, formats RFC 4180 CSV, and creates valid .xlsx ZIP', async () => {
    const textItems = [
      { str: 'Item', transform: [12, 0, 0, 12, 50, 700], width: 25 },
      { str: 'Qty', transform: [12, 0, 0, 12, 200, 700], width: 20 },
      { str: 'Total', transform: [12, 0, 0, 12, 320, 700], width: 30 },
      { str: 'Widget, A', transform: [12, 0, 0, 12, 50, 680], width: 55 },
      { str: '2', transform: [12, 0, 0, 12, 200, 680], width: 8 },
      { str: '19.50', transform: [12, 0, 0, 12, 320, 680], width: 32 },
    ];

    const table = extractTableRowsFromTextItems(textItems);
    expect(table.rowCount).toBe(2);
    expect(table.columnCount).toBe(3);
    expect(table.rows[0]).toEqual(['Item', 'Qty', 'Total']);
    expect(table.rows[1]).toEqual(['Widget, A', '2', '19.50']);

    const csv = rowsToCsv(table.rows);
    expect(csv).toContain('"Widget, A",2,19.50');

    const xlsxBlob = await buildMinimalXlsx([{ name: 'Invoice:1/2', rows: table.rows }]);
    const zip = await JSZip.loadAsync(await xlsxBlob.arrayBuffer());
    expect(zip.file('[Content_Types].xml')).toBeTruthy();
    expect(zip.file('xl/workbook.xml')).toBeTruthy();
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');
    expect(sheetXml).toContain('Widget, A');
    expect(sheetXml).toContain('<c r="C2"><v>19.50</v></c>');
  });

  test('pdfCropAndGray crops CropBox cleanly across rotation and applies BT.709 grayscale', async () => {
    const doc = await PDFDocument.create();
    const p1 = doc.addPage([600, 800]);
    p1.setRotation(degrees(90));
    const outBytes = await applyCropMarginsToPdf(await doc.save(), {
      top: 50,
      right: 30,
      bottom: 40,
      left: 20,
    });
    const reloaded = await PDFDocument.load(outBytes);
    const crop = reloaded.getPages()[0].getCropBox();
    // Under 90deg rotation: pdfLeft=top(50), pdfRight=bottom(40), pdfBottom=left(20), pdfTop=right(30)
    expect(crop.x).toBe(50);
    expect(crop.y).toBe(20);
    expect(crop.width).toBe(600 - 50 - 40);
    expect(crop.height).toBe(800 - 20 - 30);

    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    rgbaToGrayscale(rgba, 1.0);
    // Red luminance ~= 0.2126 * 255 = 54
    expect(rgba[0]).toBe(54);
    expect(rgba[1]).toBe(54);
    expect(rgba[2]).toBe(54);
    expect(rgba[3]).toBe(255);
  });

  test('pdfMetadataAndBates reads, edits, scrubs metadata and stamps continuous Bates IDs', async () => {
    const bytes = await createSamplePdf(2);
    const initial = await readPdfMetadata(bytes);
    expect(initial.title).toBe('Quarterly Report');
    expect(initial.author).toBe('Alice');
    expect(initial.pageCount).toBe(2);

    const editedBytes = await updatePdfMetadata(bytes, {
      title: 'Public Release',
      keywords: 'finance, 2026',
    });
    const editedMeta = await readPdfMetadata(editedBytes);
    expect(editedMeta.title).toBe('Public Release');
    expect(editedMeta.keywords).toContain('finance');

    const scrubbedBytes = await updatePdfMetadata(editedBytes, {}, { scrubAll: true });
    const scrubbedMeta = await readPdfMetadata(scrubbedBytes);
    expect(scrubbedMeta.title).toBe('');
    expect(scrubbedMeta.author).toBe('');

    const bates = await applyBatesAndHeaders(bytes, {
      prefix: 'DOC-',
      startNumber: 10,
      digits: 5,
      headerCenter: 'Page {page} of {total}',
    });
    expect(bates.firstBates).toBe('DOC-00010');
    expect(bates.lastBates).toBe('DOC-00011');
    expect(bates.nextStartNumber).toBe(12);
    const reloaded = await PDFDocument.load(bates.bytes);
    expect(reloaded.getPageCount()).toBe(2);
  });

  test('pdfSplitBySize splits multi-page PDFs by byte budget and computes bookmark ranges', async () => {
    const bytes = await createSamplePdf(4);
    // Tiny budget forces single-page parts without dropping any page
    const parts = await splitPdfByMaxSize(bytes, 1200);
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts[0].startPage).toBe(1);
    expect(parts[parts.length - 1].endPage).toBe(4);

    const ranges = computeBookmarkRanges(
      [
        { title: 'Ch 2', page: 5 },
        { title: 'Ch 1', page: 1 },
      ],
      10
    );
    expect(ranges).toEqual([
      { title: 'Ch 1', startPage: 1, endPage: 4 },
      { title: 'Ch 2', startPage: 5, endPage: 10 },
    ]);
  });

  test('pdfFormAndImages inspects, fills, and optionally flattens AcroForm fields', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 500]);
    const form = doc.getForm();
    const nameField = form.createTextField('fullName');
    nameField.addToPage(page, { x: 50, y: 400, width: 200, height: 25 });
    const agreeBox = form.createCheckBox('agreeTerms');
    agreeBox.addToPage(page, { x: 50, y: 350, width: 20, height: 20 });
    const roleDrop = form.createDropdown('role');
    roleDrop.addOptions(['Admin', 'Member']);
    roleDrop.addToPage(page, { x: 50, y: 300, width: 150, height: 25 });

    const srcBytes = await doc.save();
    const inspected = await inspectAcroFormFields(srcBytes);
    expect(inspected.map((f) => `${f.name}:${f.type}`)).toEqual([
      'fullName:text',
      'agreeTerms:checkbox',
      'role:dropdown',
    ]);

    const filledBytes = await fillAcroFormFields(srcBytes, {
      fullName: 'Ada Lovelace',
      agreeTerms: true,
      role: 'Admin',
    });
    const afterFill = await inspectAcroFormFields(filledBytes);
    expect(afterFill.find((f) => f.name === 'fullName').value).toBe('Ada Lovelace');
    expect(afterFill.find((f) => f.name === 'agreeTerms').value).toBe(true);
    expect(afterFill.find((f) => f.name === 'role').value).toBe('Admin');

    const flattenedBytes = await fillAcroFormFields(
      srcBytes,
      { fullName: 'Ada Lovelace', agreeTerms: true, role: 'Admin' },
      { flattenAfterFill: true }
    );
    const afterFlatten = await inspectAcroFormFields(flattenedBytes);
    expect(afterFlatten).toHaveLength(0);
  });
});

