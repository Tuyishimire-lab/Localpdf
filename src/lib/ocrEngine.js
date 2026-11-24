/**
 * Reusable client-side OCR worker manager (Tesseract.js v7).
 * Uses self-hosted worker/core assets and local English traineddata for offline PWA reliability.
 */

import { isAirGapped } from './airgap.js';

let workerPromise = null;
let workerLang = null;
let activeLogger = null;
let ocrQueue = Promise.resolve();

/**
 * Ensures non-local OCR CDN language packs are blocked when Strict Air-Gapped Mode is enabled.
 * @param {string} [lang='eng']
 */
export function assertOcrLanguageAllowed(lang = 'eng') {
  if (isAirGapped() && lang !== 'eng') {
    throw new Error(
      `Strict Air-Gapped Mode is active: OCR language "${lang}" requires downloading external traineddata. Switch to English (eng) or disable Strict Air-Gapped Mode.`
    );
  }
}

function buildWorkerOptions(lang) {
  const options = {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/core',
    logger: (message) => {
      if (typeof activeLogger === 'function') {
        activeLogger(message);
      }
    },
  };

  if (lang === 'eng') {
    options.langPath = '/tesseract/lang-data';
  }

  return options;
}

async function getOcrWorker(lang = 'eng') {
  assertOcrLanguageAllowed(lang);

  if (workerPromise && workerLang === lang) {
    return workerPromise;
  }

  if (workerPromise) {
    try {
      const oldWorker = await workerPromise;
      await oldWorker.terminate();
    } catch {
      // ignore termination failure
    }
    workerPromise = null;
    workerLang = null;
  }

  workerLang = lang;
  workerPromise = (async () => {
    const { createWorker } = await import('tesseract.js');
    return createWorker(lang, 1, buildWorkerOptions(lang));
  })().catch((err) => {
    workerPromise = null;
    workerLang = null;
    throw err;
  });

  return workerPromise;
}

/**
 * Runs OCR recognition on an image/canvas/data-URL using a reused worker.
 * Calls are serialized safely so logger callbacks and worker state never collide.
 * @param {any} image
 * @param {string} [lang='eng']
 * @param {(message: any) => void} [logger]
 */
export function recognizeImage(image, lang = 'eng', logger) {
  const next = ocrQueue.then(async () => {
    activeLogger = logger || null;
    try {
      const worker = await getOcrWorker(lang);
      return await worker.recognize(image);
    } finally {
      activeLogger = null;
    }
  });
  ocrQueue = next.catch(() => {});
  return next;
}

/**
 * Terminates the active OCR worker and releases WASM memory.
 */
export async function terminateOcrWorker() {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    // ignore
  } finally {
    workerPromise = null;
    workerLang = null;
    activeLogger = null;
  }
}

