/**
 * @jest-environment node
 */

import { PDFDocument } from 'pdf-lib';
import { EncryptedPdfError, loadPdfLibSafely } from '../../src/lib/pdfGuard.js';
import { encryptPdf } from '../../src/lib/qpdfEngine.js';

async function makeSimplePdfBytes() {
  const doc = await PDFDocument.create();
  doc.addPage([300, 300]);
  return doc.save();
}

describe('pdfGuard (loadPdfLibSafely)', () => {
  test('loads unencrypted PDFs directly', async () => {
    const bytes = await makeSimplePdfBytes();
    const loaded = await loadPdfLibSafely(bytes);
    expect(loaded.getPageCount()).toBe(1);
  });

  test('transparently unlocks owner-restricted PDFs (empty user password)', async () => {
    const bytes = await makeSimplePdfBytes();
    const ownerProtected = await encryptPdf(bytes, {
      userPassword: '',
      ownerPassword: 'admin-password',
      permissions: { printing: 'none', copying: false, modifying: false },
    });

    const loaded = await loadPdfLibSafely(ownerProtected);
    expect(loaded.getPageCount()).toBe(1);
  });

  test('throws EncryptedPdfError for user-password-protected PDFs', async () => {
    const bytes = await makeSimplePdfBytes();
    const userProtected = await encryptPdf(bytes, {
      userPassword: 'user-secret',
      ownerPassword: 'owner-secret',
    });

    await expect(loadPdfLibSafely(userProtected)).rejects.toThrow(EncryptedPdfError);
  });
});

