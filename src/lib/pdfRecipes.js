/**
 * pdfRecipes.js – Visual multi-step PDF workflow pipeline engine & local preset storage.
 * Executes chained transformations 100% locally in memory and persists user recipes in localStorage.
 */

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { loadPdfLibSafely } from './pdfGuard';
import { getVisualPageBox, mapVisualPointToPdf } from './pdfCoords';
import { sanitizeWinAnsiText } from './searchablePdf';
import { applyCropMarginsToPdf } from './pdfCropAndGray';
import { applyBatesAndHeaders, updatePdfMetadata } from './pdfMetadataAndBates';

export const RECIPES_STORAGE_KEY = 'localpdf_recipes';
export const RECIPES_EVENT = 'localpdf-recipes-change';

export const RECIPE_STEP_CATALOG = [
  {
    type: 'merge',
    label: 'Merge PDFs',
    description: 'Combine all dropped PDFs sequentially into one document.',
    defaultConfig: {},
  },
  {
    type: 'crop',
    label: 'Crop Margins',
    description: 'Trim uniform page margins using lossless CropBox bounds.',
    defaultConfig: { top: 18, right: 18, bottom: 18, left: 18, pageRange: '' },
  },
  {
    type: 'bates',
    label: 'Bates Numbering',
    description: 'Stamp sequential legal Bates IDs across every page.',
    defaultConfig: {
      prefix: 'CONF-',
      startNumber: 1,
      digits: 6,
      batesPosition: 'bottom-right',
      fontSize: 10,
      color: '#111111',
    },
  },
  {
    type: 'watermark',
    label: 'Watermark Text',
    description: 'Stamp centered or tiled diagonal watermark text.',
    defaultConfig: {
      text: 'CONFIDENTIAL',
      opacity: 0.25,
      fontSize: 42,
      color: '#ef4444',
      tileMode: false,
    },
  },
  {
    type: 'page-numbers',
    label: 'Page Numbers',
    description: 'Add customizable page numbering (supports {n} and {total}).',
    defaultConfig: {
      format: 'Page {n} of {total}',
      position: 'bottom-center',
      startNum: 1,
      fontSize: 10,
    },
  },
  {
    type: 'metadata-scrub',
    label: 'Scrub Metadata',
    description: 'Erase Title, Author, Subject, Keywords, Creator, Producer & timestamps.',
    defaultConfig: {},
  },
  {
    type: 'flatten',
    label: 'Flatten Forms & Annotations',
    description: 'Bake fillable AcroForm fields and optional annotations into static page content.',
    defaultConfig: { flattenAnnotations: true },
  },
  {
    type: 'compress',
    label: 'Lossless Compress (QPDF)',
    description: 'Optimize object streams and linearize for smaller fast-web PDFs.',
    defaultConfig: {},
  },
  {
    type: 'protect',
    label: 'Encrypt PDF (AES-256)',
    description: 'Lock the final PDF with 256-bit AES open password protection.',
    defaultConfig: { userPassword: '', ownerPassword: '' },
  },
];

export function createStepFromCatalog(type, overrideConfig = {}) {
  const meta = RECIPE_STEP_CATALOG.find((item) => item.type === type);
  if (!meta) {
    throw new Error(`Unsupported recipe step type: ${type}`);
  }
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: meta.type,
    label: meta.label,
    config: { ...meta.defaultConfig, ...overrideConfig },
  };
}

export const PRESET_RECIPES = [
  {
    id: 'legal-discovery',
    name: 'Legal Discovery Pack',
    description: 'Merge PDFs → Bates Numbering → Scrub Metadata → Lossless Compress',
    isPreset: true,
    steps: [
      { id: 'preset-merge-1', type: 'merge', label: 'Merge PDFs', config: {} },
      {
        id: 'preset-bates-2',
        type: 'bates',
        label: 'Bates Numbering',
        config: {
          prefix: 'EXH-',
          startNumber: 1,
          digits: 6,
          batesPosition: 'bottom-right',
          fontSize: 10,
          color: '#111111',
        },
      },
      { id: 'preset-scrub-3', type: 'metadata-scrub', label: 'Scrub Metadata', config: {} },
      { id: 'preset-compress-4', type: 'compress', label: 'Lossless Compress (QPDF)', config: {} },
    ],
  },
  {
    id: 'confidential-share',
    name: 'Confidential Client Share',
    description: 'Watermark ("CONFIDENTIAL") → Scrub Metadata → Lossless Compress → AES-256 Encrypt',
    isPreset: true,
    steps: [
      {
        id: 'preset-wm-1',
        type: 'watermark',
        label: 'Watermark Text',
        config: {
          text: 'CONFIDENTIAL',
          opacity: 0.22,
          fontSize: 42,
          color: '#ef4444',
          tileMode: false,
        },
      },
      { id: 'preset-scrub-2', type: 'metadata-scrub', label: 'Scrub Metadata', config: {} },
      { id: 'preset-compress-3', type: 'compress', label: 'Lossless Compress (QPDF)', config: {} },
      {
        id: 'preset-protect-4',
        type: 'protect',
        label: 'Encrypt PDF (AES-256)',
        config: { userPassword: '', ownerPassword: '' },
      },
    ],
  },
  {
    id: 'clean-archive',
    name: 'Clean Archive Prep',
    description: 'Crop Margins (18pt) → Page Numbers → Flatten → Lossless Compress',
    isPreset: true,
    steps: [
      {
        id: 'preset-crop-1',
        type: 'crop',
        label: 'Crop Margins',
        config: { top: 18, right: 18, bottom: 18, left: 18, pageRange: '' },
      },
      {
        id: 'preset-pn-2',
        type: 'page-numbers',
        label: 'Page Numbers',
        config: { format: 'Page {n} of {total}', position: 'bottom-center', startNum: 1, fontSize: 10 },
      },
      {
        id: 'preset-flatten-3',
        type: 'flatten',
        label: 'Flatten Forms & Annotations',
        config: { flattenAnnotations: true },
      },
      { id: 'preset-compress-4', type: 'compress', label: 'Lossless Compress (QPDF)', config: {} },
    ],
  },
];

function hexToRgbTuple(hex = '#111111') {
  const clean = String(hex || '').replace('#', '');
  if (clean.length !== 6) return rgb(0.1, 0.1, 0.1);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(Number.isNaN(r) ? 0.1 : r, Number.isNaN(g) ? 0.1 : g, Number.isNaN(b) ? 0.1 : b);
}

async function toUint8Array(item) {
  if (item instanceof Uint8Array) return item;
  if (item instanceof ArrayBuffer) return new Uint8Array(item);
  if (item?.bytes instanceof Uint8Array) return item.bytes;
  if (item?.bytes instanceof ArrayBuffer) return new Uint8Array(item.bytes);
  if (typeof item?.arrayBuffer === 'function') {
    const ab = await item.arrayBuffer();
    return new Uint8Array(ab);
  }
  throw new Error('Unsupported PDF input in recipe pipeline.');
}

async function mergePdfBuffers(buffers) {
  if (buffers.length === 1) return buffers[0];
  const merged = await PDFDocument.create();
  for (const bytes of buffers) {
    const src = await loadPdfLibSafely(bytes);
    const copied = await merged.copyPages(src, src.getPageIndices());
    copied.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}

async function applyWatermarkStep(pdfBytes, config = {}) {
  const pdfDoc = await loadPdfLibSafely(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();
  const text = sanitizeWinAnsiText(config.text || 'CONFIDENTIAL') || 'CONFIDENTIAL';
  const fontSize = Math.max(12, Math.min(120, Number(config.fontSize) || 42));
  const opacity = Math.max(0.05, Math.min(1, Number(config.opacity) || 0.25));
  const color = hexToRgbTuple(config.color || '#ef4444');
  const tileMode = Boolean(config.tileMode);

  for (const page of pages) {
    const { visualWidth, visualHeight } = getVisualPageBox(page);
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = fontSize;

    if (tileMode) {
      const cols = Math.max(2, Math.floor(visualWidth / Math.max(160, textWidth + 60)));
      const rows = Math.max(2, Math.floor(visualHeight / 170));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const vx = ((c + 0.5) / cols) * visualWidth - textWidth / 2;
          const vy = ((r + 0.5) / rows) * visualHeight - textHeight / 2;
          const mapped = mapVisualPointToPdf(page, vx, vy, textWidth, textHeight);
          page.drawText(text, {
            x: mapped.x,
            y: mapped.y,
            size: fontSize * 0.72,
            font,
            color,
            opacity,
            rotate: degrees(mapped.rotateAngle - 35),
          });
        }
      }
    } else {
      const vx = Math.max(12, (visualWidth - textWidth) / 2);
      const vy = Math.max(12, (visualHeight - textHeight) / 2);
      const mapped = mapVisualPointToPdf(page, vx, vy, textWidth, textHeight);
      page.drawText(text, {
        x: mapped.x,
        y: mapped.y,
        size: fontSize,
        font,
        color,
        opacity,
        rotate: degrees(mapped.rotateAngle - 35),
      });
    }
  }

  return pdfDoc.save();
}

async function applyPageNumbersStep(pdfBytes, config = {}) {
  const pdfDoc = await loadPdfLibSafely(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const startNum = Math.max(1, parseInt(config.startNum, 10) || 1);
  const fontSize = Math.max(7, Math.min(28, Number(config.fontSize) || 10));
  const format = String(config.format || 'Page {n} of {total}');
  const position = String(config.position || 'bottom-center');
  const margin = 24;

  pages.forEach((page, idx) => {
    const label = sanitizeWinAnsiText(
      format
        .replace(/\{n\}/gi, String(startNum + idx))
        .replace(/\{total\}/gi, String(totalPages))
    );
    const { visualWidth, visualHeight } = getVisualPageBox(page);
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const textHeight = fontSize;
    const [row, col] = position.split('-');

    let vx = (visualWidth - textWidth) / 2;
    if (col === 'left') vx = margin;
    else if (col === 'right') vx = Math.max(margin, visualWidth - textWidth - margin);

    let vy = Math.max(margin, visualHeight - textHeight - margin);
    if (row === 'top') vy = margin;

    const mapped = mapVisualPointToPdf(page, vx, vy, textWidth, textHeight);
    page.drawText(label, {
      x: mapped.x,
      y: mapped.y,
      size: fontSize,
      font,
      color: rgb(0.15, 0.15, 0.15),
      rotate: degrees(mapped.rotateAngle),
    });
  });

  return pdfDoc.save();
}

async function applyFlattenStep(pdfBytes, config = {}) {
  const pdfDoc = await loadPdfLibSafely(pdfBytes);
  try {
    pdfDoc.getForm().flatten();
  } catch {
    // Document may not contain AcroForms
  }
  let flattenedBytes = await pdfDoc.save();

  if (config.flattenAnnotations !== false) {
    try {
      const { flattenPdfAnnotations } = await import('./qpdfEngine.js');
      const res = await flattenPdfAnnotations(flattenedBytes);
      if (res?.bytes) flattenedBytes = res.bytes;
    } catch {
      // Retain pdf-lib form-flattened bytes if annotation flattening worker is unavailable
    }
  }

  return flattenedBytes;
}

/**
 * Executes an ordered list of local PDF transformation steps in memory.
 * @param {Array<File|Uint8Array|{ name?: string, bytes: Uint8Array }>} inputFiles
 * @param {Array<{ type: string, label?: string, config?: Record<string, any> }>} steps
 * @param {{ onStepProgress?: (info: { index: number, total: number, step: any, status: string }) => void, outputBaseName?: string }} [options]
 */
export async function runPdfRecipe(inputFiles, steps, options = {}) {
  if (!Array.isArray(inputFiles) || inputFiles.length === 0) {
    throw new Error('Select at least one PDF file to run a recipe.');
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('Add at least one step to the PDF recipe.');
  }

  const buffers = [];
  for (const item of inputFiles) {
    buffers.push(await toUint8Array(item));
  }

  const firstName = inputFiles[0]?.name || options.outputBaseName || 'document.pdf';
  const baseName = firstName.replace(/\.pdf$/i, '') || 'document';

  const hasExplicitMerge = steps.some((s) => s.type === 'merge');
  let currentBytes =
    buffers.length > 1 && !hasExplicitMerge ? await mergePdfBuffers(buffers) : buffers[0];

  const stepResults = [];
  const total = steps.length;

  for (let index = 0; index < total; index++) {
    const step = steps[index];
    const label = step.label || step.type;
    options.onStepProgress?.({ index, total, step, status: 'running' });

    if (step.type === 'merge') {
      currentBytes = buffers.length > 1 ? await mergePdfBuffers(buffers) : currentBytes;
      stepResults.push({
        type: 'merge',
        label,
        detail: buffers.length > 1 ? `Merged ${buffers.length} PDFs` : 'Single PDF passed through',
      });
    } else if (step.type === 'crop') {
      currentBytes = await applyCropMarginsToPdf(currentBytes, step.config || {});
      stepResults.push({ type: 'crop', label, detail: 'Margins cropped' });
    } else if (step.type === 'bates') {
      const batesRes = await applyBatesAndHeaders(currentBytes, step.config || {});
      currentBytes = batesRes.bytes;
      stepResults.push({
        type: 'bates',
        label,
        detail: `${batesRes.firstBates} -> ${batesRes.lastBates}`,
      });
    } else if (step.type === 'watermark') {
      currentBytes = await applyWatermarkStep(currentBytes, step.config || {});
      stepResults.push({
        type: 'watermark',
        label,
        detail: `Stamped "${step.config?.text || 'CONFIDENTIAL'}"`,
      });
    } else if (step.type === 'page-numbers') {
      currentBytes = await applyPageNumbersStep(currentBytes, step.config || {});
      stepResults.push({ type: 'page-numbers', label, detail: 'Page numbers stamped' });
    } else if (step.type === 'metadata-scrub') {
      currentBytes = await updatePdfMetadata(currentBytes, {}, { scrubAll: true });
      stepResults.push({ type: 'metadata-scrub', label, detail: 'Metadata & timestamps scrubbed' });
    } else if (step.type === 'flatten') {
      currentBytes = await applyFlattenStep(currentBytes, step.config || {});
      stepResults.push({ type: 'flatten', label, detail: 'Forms & annotations flattened' });
    } else if (step.type === 'compress') {
      const { compressPdfLossless } = await import('./qpdfEngine.js');
      const res = await compressPdfLossless(currentBytes);
      currentBytes = res.bytes;
      stepResults.push({ type: 'compress', label, detail: 'Lossless QPDF stream optimization' });
    } else if (step.type === 'protect') {
      const userPassword = String(step.config?.userPassword || '');
      if (!userPassword) {
        throw new Error('The Encrypt PDF step requires a non-empty user password.');
      }
      const { encryptPdf } = await import('./qpdfEngine.js');
      currentBytes = await encryptPdf(currentBytes, {
        userPassword,
        ownerPassword: step.config?.ownerPassword || userPassword,
        permissions: { printing: 'full', modifying: true, copying: true },
      });
      stepResults.push({ type: 'protect', label, detail: 'Encrypted with 256-bit AES' });
    } else {
      throw new Error(`Unknown recipe step: ${step.type}`);
    }
  }

  const normalizedBytes =
    currentBytes instanceof Uint8Array ? currentBytes : new Uint8Array(currentBytes);
  const blob =
    typeof Blob !== 'undefined'
      ? new Blob([normalizedBytes], { type: 'application/pdf' })
      : null;

  return {
    bytes: normalizedBytes,
    blob,
    stepResults,
    outputFilename: `${baseName}_recipe.pdf`,
  };
}

function getSafeStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

function notifyRecipesChange() {
  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof Event === 'function'
  ) {
    window.dispatchEvent(new Event(RECIPES_EVENT));
  }
}

export function getSavedRecipes() {
  const storage = getSafeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECIPES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecipe(recipe) {
  const name = String(recipe?.name || '').trim();
  if (!name) {
    throw new Error('Recipe name is required.');
  }
  if (!Array.isArray(recipe?.steps) || recipe.steps.length === 0) {
    throw new Error('Recipe must contain at least one step.');
  }

  const existing = getSavedRecipes();
  const id = recipe.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const entry = {
    id,
    name,
    description: recipe.description || `${recipe.steps.length} custom step(s)`,
    isPreset: false,
    updatedAt: new Date().toISOString(),
    steps: recipe.steps.map((s) => ({
      id: s.id || `${s.type}_${Date.now()}`,
      type: s.type,
      label: s.label,
      config: { ...(s.config || {}) },
    })),
  };

  const next = [entry, ...existing.filter((item) => item.id !== id)].slice(0, 20);
  const storage = getSafeStorage();
  if (storage) {
    try {
      storage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }
  notifyRecipesChange();
  return next;
}

export function deleteRecipe(id) {
  const existing = getSavedRecipes();
  const next = existing.filter((item) => item.id !== id);
  const storage = getSafeStorage();
  if (storage) {
    try {
      storage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  notifyRecipesChange();
  return next;
}

export function subscribeSavedRecipes(callback) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  const handleStorage = (e) => {
    if (!e || e.key === null || e.key === RECIPES_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener(RECIPES_EVENT, callback);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(RECIPES_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
  };
}

