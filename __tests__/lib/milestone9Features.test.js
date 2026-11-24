/**
 * @jest-environment node
 */

import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { isAirGapped, setAirGapped, AIRGAP_STORAGE_KEY } from '../../src/lib/airgap';
import { assertOcrLanguageAllowed } from '../../src/lib/ocrEngine';
import {
  PRESET_RECIPES,
  runPdfRecipe,
  getSavedRecipes,
  saveRecipe,
  deleteRecipe,
} from '../../src/lib/pdfRecipes';
import {
  detectLocalAiCapabilities,
  generateEnhancedLocalAnswer,
} from '../../src/lib/webGpuAi';

const ROOT = path.resolve(__dirname, '../..');

function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

async function createSamplePdf(titleText, pageCount = 1) {
  const doc = await PDFDocument.create();
  doc.setTitle('Sensitive Internal Title');
  doc.setAuthor('Internal Analyst');
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([612, 792]);
    page.drawText(`${titleText} - Page ${i + 1}`, {
      x: 72,
      y: 720,
      size: 14,
      font,
    });
  }
  return doc.save();
}

describe('Milestone 9 strategic differentiators', () => {
  beforeEach(() => {
    globalThis.localStorage = createMockLocalStorage();
  });

  afterEach(() => {
    delete globalThis.localStorage;
    delete globalThis.LanguageModel;
  });

  test('Strict Air-Gapped Mode toggles localStorage and blocks non-eng OCR language packs', () => {
    expect(isAirGapped()).toBe(false);
    expect(() => assertOcrLanguageAllowed('fra')).not.toThrow();

    setAirGapped(true);
    expect(isAirGapped()).toBe(true);
    expect(globalThis.localStorage.getItem(AIRGAP_STORAGE_KEY)).toBe('true');

    expect(() => assertOcrLanguageAllowed('eng')).not.toThrow();
    expect(() => assertOcrLanguageAllowed('fra')).toThrow(/Strict Air-Gapped Mode/i);

    setAirGapped(false);
    expect(isAirGapped()).toBe(false);
  });

  test('public/manifest.json declares PWA file_handlers for .pdf documents', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public', 'manifest.json'), 'utf8')
    );
    expect(Array.isArray(manifest.file_handlers)).toBe(true);
    expect(manifest.file_handlers[0].accept['application/pdf']).toContain('.pdf');
  });

  test('runPdfRecipe executes multi-step merge -> crop -> bates -> watermark -> metadata-scrub pipeline', async () => {
    const pdfA = await createSamplePdf('Exhibit Alpha', 1);
    const pdfB = await createSamplePdf('Exhibit Beta', 2);

    const progressUpdates = [];
    const result = await runPdfRecipe(
      [
        { name: 'exhibit-a.pdf', bytes: pdfA },
        { name: 'exhibit-b.pdf', bytes: pdfB },
      ],
      [
        { type: 'merge', label: 'Merge PDFs', config: {} },
        { type: 'crop', label: 'Crop Margins', config: { top: 20, right: 20, bottom: 20, left: 20 } },
        {
          type: 'bates',
          label: 'Bates Numbering',
          config: { prefix: 'EXH-', startNumber: 10, digits: 5, batesPosition: 'bottom-right' },
        },
        {
          type: 'watermark',
          label: 'Watermark Text',
          config: { text: 'PRIVILEGED', opacity: 0.25, tileMode: true },
        },
        { type: 'metadata-scrub', label: 'Scrub Metadata', config: {} },
      ],
      {
        onStepProgress: (info) => progressUpdates.push(info.step.type),
      }
    );

    expect(progressUpdates).toEqual(['merge', 'crop', 'bates', 'watermark', 'metadata-scrub']);
    expect(result.stepResults).toHaveLength(5);
    expect(result.stepResults[2].detail).toBe('EXH-00010 -> EXH-00012');
    expect(result.outputFilename).toBe('exhibit-a_recipe.pdf');

    const loaded = await PDFDocument.load(result.bytes);
    expect(loaded.getPageCount()).toBe(3);
    expect(loaded.getTitle()).toBe('');
    expect(loaded.getAuthor()).toBe('');
    const cropBox = loaded.getPage(0).getCropBox();
    expect(Math.round(cropBox.width)).toBe(612 - 40);
    expect(Math.round(cropBox.height)).toBe(792 - 40);
  });

  test('saved custom recipes persist cleanly via saveRecipe / getSavedRecipes / deleteRecipe', () => {
    expect(PRESET_RECIPES.length).toBeGreaterThanOrEqual(3);
    expect(getSavedRecipes()).toEqual([]);

    saveRecipe({
      id: 'custom_1',
      name: 'Board Packet',
      steps: [{ type: 'metadata-scrub', label: 'Scrub Metadata', config: {} }],
    });
    const afterSave = getSavedRecipes();
    expect(afterSave).toHaveLength(1);
    expect(afterSave[0].name).toBe('Board Packet');

    const afterDelete = deleteRecipe('custom_1');
    expect(afterDelete).toEqual([]);
  });

  test('webGpuAi detects capabilities cleanly and supports both TF-IDF and on-device LLM paths', async () => {
    const caps = await detectLocalAiCapabilities();
    expect(typeof caps.hasWebGpu).toBe('boolean');
    expect(caps.hasBrowserPromptApi).toBe(false);

    const chunks = [
      {
        pageNum: 2,
        text: 'Total termination fee under Clause 14 is $25,000 USD payable within 30 days.',
      },
    ];

    const extractiveRes = await generateEnhancedLocalAnswer({
      question: 'What is the termination fee?',
      chunks,
      mode: 'extractive',
    });
    expect(extractiveRes.engineUsed).toBe('tfidf-extractive');
    expect(extractiveRes.relevantPageNum).toBe(2);

    const fallbackLocalRes = await generateEnhancedLocalAnswer({
      question: 'What is the termination fee?',
      chunks,
      summary: { overview: 'Master Services Agreement', category: { label: 'Legal Contract' } },
      mode: 'local-ai',
    });
    expect(fallbackLocalRes.answer).toContain('Supporting locations: Page 2');
    expect(fallbackLocalRes.answer).toContain('$25,000');

    // Mock Chrome/Edge built-in LanguageModel on-device prompt API
    let destroyed = false;
    globalThis.LanguageModel = {
      create: async () => ({
        prompt: async (text) => {
          expect(text).toContain('Page 2');
          return 'The termination fee is $25,000 USD (Page 2).';
        },
        destroy: () => {
          destroyed = true;
        },
      }),
    };

    const llmRes = await generateEnhancedLocalAnswer({
      question: 'What is the termination fee?',
      chunks,
      summary: { overview: 'MSA overview' },
      mode: 'local-ai',
    });
    expect(llmRes.engineUsed).toBe('browser-on-device-llm');
    expect(llmRes.answer).toBe('The termination fee is $25,000 USD (Page 2).');
    expect(destroyed).toBe(true);
  });
});

