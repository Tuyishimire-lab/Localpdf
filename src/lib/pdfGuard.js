import { PDFDocument } from 'pdf-lib';
import { decryptPdf } from './qpdfEngine.js';

export class EncryptedPdfError extends Error {
  constructor(
    message = 'This PDF is password-protected. Please unlock it first using the Unlock PDF tool.'
  ) {
    super(message);
    this.name = 'EncryptedPdfError';
  }
}

function isPdfLibEncryptionError(err) {
  const msg = err?.message || '';
  return err?.name === 'EncryptedPDFError' || /encrypted/i.test(msg);
}

/**
 * Safely loads a PDF with pdf-lib without silently corrupting encrypted streams.
 * - Unencrypted PDFs load directly.
 * - Owner-restricted PDFs (empty user password) are transparently unlocked via QPDF WASM.
 * - User-password-protected PDFs throw EncryptedPdfError with a clear user prompt.
 * @param {ArrayBuffer|Uint8Array} arrayBuffer
 * @returns {Promise<import('pdf-lib').PDFDocument>}
 */
export async function loadPdfLibSafely(arrayBuffer) {
  try {
    return await PDFDocument.load(arrayBuffer);
  } catch (err) {
    if (!isPdfLibEncryptionError(err)) {
      throw err;
    }

    // Attempt transparent owner-restriction removal (no open password required)
    try {
      const decryptedBytes = await decryptPdf(arrayBuffer, '');
      return await PDFDocument.load(decryptedBytes);
    } catch {
      throw new EncryptedPdfError();
    }
  }
}

