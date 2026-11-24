import { QpdfExecutionError, runQpdfCommand } from './qpdfRunner.js';

let workerInstance = null;
const pendingJobs = new Map();

function resetWorker(err) {
  if (workerInstance) {
    try {
      workerInstance.terminate();
    } catch {
      // ignore termination errors
    }
    workerInstance = null;
  }
  if (err) {
    for (const [, job] of pendingJobs) {
      job.reject(err);
    }
    pendingJobs.clear();
  }
}

function getWorker() {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker(new URL('../workers/qpdf.worker.js', import.meta.url), {
    type: 'module',
  });

  workerInstance.onmessage = (event) => {
    const { id, ok, buffer, exitCode, logs, error, code } = event.data || {};
    const job = pendingJobs.get(id);
    if (!job) return;
    pendingJobs.delete(id);

    if (ok) {
      job.resolve({ buffer, exitCode, logs: logs || [] });
    } else {
      job.reject(new QpdfExecutionError(error || 'QPDF failed.', code || 'QPDF_ERROR', logs || [], exitCode ?? null));
    }
  };

  workerInstance.onerror = (event) => {
    resetWorker(
      new QpdfExecutionError(event?.message || 'QPDF Web Worker crashed.', 'WORKER_CRASH')
    );
  };

  return workerInstance;
}

async function executeQpdf(action, arrayBuffer, options = {}) {
  const sourceView = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer);

  if (typeof Worker === 'undefined') {
    return runQpdfCommand({ action, bytes: sourceView, options });
  }

  // Clone input buffer before transferring to keep caller's buffer intact.
  const clonedBuffer = sourceView.slice().buffer;
  const worker = getWorker();
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  return new Promise((resolve, reject) => {
    pendingJobs.set(id, { resolve, reject });
    try {
      worker.postMessage({ id, action, bytes: clonedBuffer, options }, [clonedBuffer]);
    } catch (err) {
      pendingJobs.delete(id);
      reject(new QpdfExecutionError(err?.message || 'Failed to dispatch QPDF job.', 'WORKER_POST_FAILED'));
    }
  });
}

/**
 * Encrypts a PDF with AES-256 using QPDF WASM.
 * @param {ArrayBuffer|Uint8Array} arrayBuffer
 * @param {{ userPassword: string, ownerPassword?: string, permissions?: { printing?: 'full'|'low'|'none', modifying?: boolean, copying?: boolean } }} options
 * @returns {Promise<Uint8Array>}
 */
export async function encryptPdf(arrayBuffer, options) {
  const result = await executeQpdf('encrypt', arrayBuffer, options);
  return new Uint8Array(result.buffer);
}

/**
 * Decrypts a PDF or strips owner restrictions using QPDF WASM.
 * @param {ArrayBuffer|Uint8Array} arrayBuffer
 * @param {string} [password='']
 * @returns {Promise<Uint8Array>}
 */
export async function decryptPdf(arrayBuffer, password = '') {
  const result = await executeQpdf('decrypt', arrayBuffer, { password });
  return new Uint8Array(result.buffer);
}

/**
 * Checks whether a password opens/validates an encrypted PDF.
 * @param {ArrayBuffer|Uint8Array} arrayBuffer
 * @param {string} [password='']
 * @returns {Promise<{ valid: boolean, logs: string[] }>}
 */
export async function verifyPdfPassword(arrayBuffer, password = '') {
  try {
    const result = await executeQpdf('verifyPassword', arrayBuffer, { password });
    return { valid: true, logs: result.logs || [] };
  } catch (err) {
    if (err?.code === 'INVALID_PASSWORD') {
      return { valid: false, logs: err.logs || [] };
    }
    throw err;
  }
}

/**
 * Performs lossless structural compression & linearization via QPDF WASM.
 * @param {ArrayBuffer|Uint8Array} arrayBuffer
 * @returns {Promise<{ bytes: Uint8Array, logs: string[] }>}
 */
export async function compressPdfLossless(arrayBuffer) {
  const result = await executeQpdf('compress', arrayBuffer);
  return { bytes: new Uint8Array(result.buffer), logs: result.logs || [] };
}

/**
 * Rebuilds damaged xref tables and recovers PDF structure via QPDF WASM.
 * @param {ArrayBuffer|Uint8Array} arrayBuffer
 * @returns {Promise<{ bytes: Uint8Array, logs: string[] }>}
 */
export async function repairPdfStructure(arrayBuffer) {
  const result = await executeQpdf('repair', arrayBuffer);
  return { bytes: new Uint8Array(result.buffer), logs: result.logs || [] };
}

/**
 * Flattens all PDF annotations into static page content via QPDF WASM.
 * @param {ArrayBuffer|Uint8Array} arrayBuffer
 * @returns {Promise<{ bytes: Uint8Array, logs: string[] }>}
 */
export async function flattenPdfAnnotations(arrayBuffer) {
  const result = await executeQpdf('flattenAnnotations', arrayBuffer);
  return { bytes: new Uint8Array(result.buffer), logs: result.logs || [] };
}

