/**
 * @jest-environment node
 */

import { PDFDocument, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import {
  encryptPdf,
  decryptPdf,
  verifyPdfPassword,
  compressPdfLossless,
  repairPdfStructure,
  flattenPdfAnnotations,
} from '../../src/lib/qpdfEngine.js';

async function createSamplePdfBytes(pageCount = 2) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([400, 400]);
    page.drawText(`Sample LocalPDF Page ${i + 1}`, { x: 40, y: 300, size: 16, font });
  }
  return doc.save({ useObjectStreams: false });
}

describe('qpdfEngine (real QPDF WASM)', () => {
  test('encrypts with AES-256, verifies password, and decrypts back to original page count', async () => {
    const rawBytes = await createSamplePdfBytes(2);

    const encrypted = await encryptPdf(rawBytes, {
      userPassword: 'open-secret',
      ownerPassword: 'owner-secret',
      permissions: { printing: 'full', copying: false, modifying: false },
    });
    expect(encrypted).toBeInstanceOf(Uint8Array);
    expect(encrypted.byteLength).toBeGreaterThan(0);

    // pdf-lib refuses to load encrypted document without ignoreEncryption
    await expect(PDFDocument.load(encrypted)).rejects.toThrow(/encrypted/i);

    const wrongCheck = await verifyPdfPassword(encrypted, 'wrong-password');
    expect(wrongCheck.valid).toBe(false);

    const rightCheck = await verifyPdfPassword(encrypted, 'open-secret');
    expect(rightCheck.valid).toBe(true);

    const decrypted = await decryptPdf(encrypted, 'open-secret');
    const loaded = await PDFDocument.load(decrypted);
    expect(loaded.getPageCount()).toBe(2);
    expect(loaded.isEncrypted).toBe(false);
  });

  test('compressPdfLossless outputs a valid PDF preserving all pages', async () => {
    const rawBytes = await createSamplePdfBytes(3);
    const { bytes } = await compressPdfLossless(rawBytes);

    expect(bytes).toBeInstanceOf(Uint8Array);
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(3);
  });

  test('repairPdfStructure recovers a PDF with shifted offsets and missing %%EOF', async () => {
    const rawBytes = await createSamplePdfBytes(1);
    const rawStr = Buffer.from(rawBytes).toString('latin1');
    // Prepend bytes (shifting all xref offsets) and strip %%EOF marker
    const damagedStr = '  \n' + rawStr.replace(/%%EOF\s*$/, '');
    const damagedBytes = new Uint8Array(Buffer.from(damagedStr, 'latin1'));

    const { bytes: repaired } = await repairPdfStructure(damagedBytes);
    const repairedStr = Buffer.from(repaired).toString('latin1');
    expect(repairedStr).toContain('%%EOF');

    const loaded = await PDFDocument.load(repaired);
    expect(loaded.getPageCount()).toBe(1);
  });

  test('flattenPdfAnnotations flattens annotations into static page content', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 400]);

    const annotDict = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Text',
      Rect: [50, 50, 80, 80],
      Contents: PDFString.of('Review comment'),
    });
    const annotRef = doc.context.register(annotDict);
    page.node.set(PDFName.of('Annots'), doc.context.obj([annotRef]));

    const rawBytes = await doc.save();
    const { bytes: flattened } = await flattenPdfAnnotations(rawBytes);

    const loaded = await PDFDocument.load(flattened);
    expect(loaded.getPageCount()).toBe(1);
  });
});

