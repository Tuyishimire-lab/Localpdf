/**
 * Unit tests for localAiEngine.js pure functions.
 *
 * Excluded from coverage:
 *   - parsePdfTextChunks  – requires a live pdf.js document + optional Tesseract (browser APIs)
 *   - exportReportToPdf   – requires pdf-lib canvas rendering; covered by Playwright E2E
 */

import {
  detectDocumentCategory,
  generateDocumentSummary,
  answerDocumentQuestion,
  exportReportToMarkdown,
} from '../../src/lib/localAiEngine.js';

/**
 * jsdom's Blob does not implement .text(). Use FileReader instead.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function readBlobText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

// ---------------------------------------------------------------------------
// detectDocumentCategory
// ---------------------------------------------------------------------------
describe('detectDocumentCategory', () => {
  test('returns "legal" for text with multiple legal terms', () => {
    const text =
      'This agreement shall be governed by the laws of the jurisdiction. ' +
      'The party must indemnify the other against all liabilities under clause 5. ' +
      'Termination requires 30 days written notice as per the contract obligations.';
    const result = detectDocumentCategory(text);
    expect(result.type).toBe('legal');
    expect(result.label).toMatch(/legal/i);
    expect(result.prompts.length).toBeGreaterThan(0);
  });

  test('returns "finance" for text with multiple finance terms', () => {
    const text =
      'Invoice #1042 total amount USD 4,500. Budget expenditure for Q3 includes vendor ' +
      'purchase order payments. Tax bill due on 30th. Price per unit is $12.';
    const result = detectDocumentCategory(text);
    expect(result.type).toBe('finance');
    expect(result.label).toMatch(/financial|budget|purchase/i);
    expect(result.prompts.length).toBeGreaterThan(0);
  });

  test('returns "general" for neutral text', () => {
    const text = 'The quick brown fox jumps over the lazy dog on a sunny afternoon.';
    const result = detectDocumentCategory(text);
    expect(result.type).toBe('general');
  });

  test('returns "general" when legal score is below threshold (< 4)', () => {
    // Only one legal term → score = 2, below the threshold of 4
    const text = 'This agreement sets out the terms.';
    const result = detectDocumentCategory(text);
    expect(result.type).toBe('general');
  });

  test('returns "general" when finance score is below threshold (< 4)', () => {
    // Only one finance term → score = 2, below the threshold of 4
    const text = 'The total was calculated at the end of the quarter.';
    const result = detectDocumentCategory(text);
    expect(result.type).toBe('general');
  });

  test('returns "legal" when legal score exceeds finance score and meets threshold', () => {
    const result = detectDocumentCategory(
      'agreement contract party obligations governing law liability termination shall clause indemnify'
    );
    expect(result.type).toBe('legal');
  });

  test('returns "medical" for text with multiple medical terms', () => {
    const result = detectDocumentCategory(
      'patient diagnosis treatment dosage clinical symptoms prognosis prescribed medication hospital'
    );
    expect(result.type).toBe('medical');
    expect(result.icon).toBe('🏥');
    expect(result.prompts.length).toBeGreaterThan(0);
  });

  test('returns "academic" for text with multiple academic terms', () => {
    const result = detectDocumentCategory(
      'abstract methodology hypothesis findings references bibliography conclusion dataset figure journal'
    );
    expect(result.type).toBe('academic');
    expect(result.icon).toBe('🎓');
    expect(result.prompts.length).toBeGreaterThan(0);
  });

  test('legal takes priority over academic when both meet threshold', () => {
    // legal keywords dominate
    const result = detectDocumentCategory(
      'agreement contract party obligations termination shall clause indemnify abstract methodology findings'
    );
    expect(result.type).toBe('legal');
  });
});

// ---------------------------------------------------------------------------
// generateDocumentSummary
// ---------------------------------------------------------------------------
describe('generateDocumentSummary', () => {
  const makeChunks = (texts, isOcr = false) =>
    texts.map((text, i) => ({
      pageNum: i + 1,
      chunkIndex: 0,
      text,
      wordCount: text.split(/\s+/).length,
      isOcr,
    }));

  test('returns an empty-state result when chunks array is empty', () => {
    const result = generateDocumentSummary([], 3);
    expect(result.overview).toMatch(/no readable text/i);
    expect(result.keyPoints).toHaveLength(1);
    expect(result.stats.wordCount).toBe(0);
    expect(result.stats.totalPages).toBe(3);
  });

  test('returns an empty-state result when chunks is null', () => {
    const result = generateDocumentSummary(null, 1);
    expect(result.stats.wordCount).toBe(0);
  });

  test('computes correct word count from chunks', () => {
    const chunks = makeChunks(['hello world foo', 'bar baz qux quux']);
    const result = generateDocumentSummary(chunks, 2);
    expect(result.stats.wordCount).toBe(7);
  });

  test('reading time is at least 1 minute', () => {
    const chunks = makeChunks(['short text']);
    const result = generateDocumentSummary(chunks, 1);
    expect(result.stats.readingTimeMinutes).toBeGreaterThanOrEqual(1);
  });

  test('sets isScannedOcr to true when any chunk is OCR', () => {
    const chunks = makeChunks(
      ['scanned page text with enough words to count properly'],
      true
    );
    const result = generateDocumentSummary(chunks, 1);
    expect(result.stats.isScannedOcr).toBe(true);
  });

  test('sets isScannedOcr to false when no chunk is OCR', () => {
    const chunks = makeChunks(['native text extraction page one two three four five']);
    const result = generateDocumentSummary(chunks, 1);
    expect(result.stats.isScannedOcr).toBe(false);
  });

  test('topTopics are non-empty and exclude common stopwords', () => {
    const chunks = makeChunks([
      'The agreement contract shall govern party obligations liability termination clause indemnify.',
    ]);
    const result = generateDocumentSummary(chunks, 1);
    // Only check words that are actually in the engine's STOP_WORDS constant.
    // 'shall' is NOT a stopword in localAiEngine.js — do not include it here.
    const engineStopwords = new Set(['the', 'a', 'is', 'of', 'and', 'to', 'in', 'that']);
    for (const topic of result.topTopics) {
      expect(engineStopwords.has(topic.toLowerCase())).toBe(false);
    }
    expect(result.topTopics.length).toBeGreaterThan(0);
  });

  test('overview string contains the category label', () => {
    const chunks = makeChunks([
      'Invoice total USD budget payment vendor purchase order tax expenditure amount bill price.',
    ]);
    const result = generateDocumentSummary(chunks, 1);
    expect(result.overview).toContain(result.category.label);
  });

  test('totalPages is passed through to stats correctly', () => {
    const chunks = makeChunks(['some text here for testing purposes with many words included']);
    const result = generateDocumentSummary(chunks, 7);
    expect(result.stats.totalPages).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// answerDocumentQuestion
// ---------------------------------------------------------------------------
describe('answerDocumentQuestion', () => {
  const chunks = [
    {
      pageNum: 1,
      text: 'The contract obliges the party to pay a monthly fee of five hundred dollars.',
      wordCount: 14,
      isOcr: false,
    },
    {
      pageNum: 2,
      text: 'Termination requires written notice of thirty days from either party.',
      wordCount: 12,
      isOcr: false,
    },
    {
      pageNum: 3,
      text: 'Liability is limited to the total value of the contract in any calendar year.',
      wordCount: 15,
      isOcr: false,
    },
  ];

  test('returns graceful message when chunks is empty', () => {
    const result = answerDocumentQuestion('What is the fee?', []);
    expect(result.answer).toMatch(/no readable text/i);
    expect(result.relevantPageNum).toBe(1);
  });

  test('returns graceful message when chunks is null', () => {
    const result = answerDocumentQuestion('What is the fee?', null);
    expect(result.answer).toMatch(/no readable text/i);
  });

  test('returns graceful message for an empty query', () => {
    const result = answerDocumentQuestion('', chunks);
    expect(result.answer).toMatch(/specific question/i);
  });

  test('returns a "could not find" message when query has no matches', () => {
    const result = answerDocumentQuestion('photosynthesis chlorophyll quantum mechanics', chunks);
    expect(result.answer).toMatch(/could not find/i);
  });

  test('returns the correct page number for a matched query', () => {
    const result = answerDocumentQuestion('How many days notice for termination?', chunks);
    // "termination" and "notice" are strong signals for page 2
    expect(result.relevantPageNum).toBe(2);
    expect(result.answer).toContain('Page 2');
  });

  test('answer includes a context excerpt from the matched chunk', () => {
    const result = answerDocumentQuestion('monthly fee payment', chunks);
    expect(result.answer).toMatch(/context excerpt/i);
  });

  test('relevantPageNum is always a number', () => {
    const result = answerDocumentQuestion('liability limit', chunks);
    expect(typeof result.relevantPageNum).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// exportReportToMarkdown
// ---------------------------------------------------------------------------
describe('exportReportToMarkdown', () => {
  const summary = {
    category: { icon: '📜', label: 'Legal Contract / Agreement' },
    stats: { totalPages: 5, wordCount: 1200, readingTimeMinutes: 6 },
    overview: 'This is a legal document about obligations and liabilities.',
    keyPoints: ['Parties must pay monthly.', 'Termination requires 30 days notice.'],
    topTopics: ['Contract', 'Liability', 'Termination'],
  };

  const messages = [
    { sender: 'user', time: '10:00', text: 'What is the monthly fee?' },
    { sender: 'ai', time: '10:01', text: 'Based on [Page 1]: "five hundred dollars".' },
  ];

  test('returns a Blob with markdown content type', () => {
    const blob = exportReportToMarkdown(summary, [], 'test.pdf');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain('text/markdown');
  });

  test('blob content includes the document file name', async () => {
    const blob = exportReportToMarkdown(summary, [], 'my-contract.pdf');
    const text = await readBlobText(blob);
    expect(text).toContain('my-contract.pdf');
  });

  test('blob content includes the category label', async () => {
    const blob = exportReportToMarkdown(summary, [], 'doc.pdf');
    const text = await readBlobText(blob);
    expect(text).toContain('Legal Contract / Agreement');
  });

  test('blob content includes key points', async () => {
    const blob = exportReportToMarkdown(summary, [], 'doc.pdf');
    const text = await readBlobText(blob);
    expect(text).toContain('Parties must pay monthly.');
    expect(text).toContain('Termination requires 30 days notice.');
  });

  test('blob content includes the overview text', async () => {
    const blob = exportReportToMarkdown(summary, [], 'doc.pdf');
    const text = await readBlobText(blob);
    expect(text).toContain('obligations and liabilities');
  });

  test('includes Q&A transcript section when messages are provided', async () => {
    const blob = exportReportToMarkdown(summary, messages, 'doc.pdf');
    const text = await readBlobText(blob);
    expect(text).toContain('Q&A Chat Transcript');
    expect(text).toContain('What is the monthly fee?');
    expect(text).toContain('five hundred dollars');
  });

  test('omits Q&A section when only one message (or none) is provided', async () => {
    const blob = exportReportToMarkdown(summary, [messages[0]], 'doc.pdf');
    const text = await readBlobText(blob);
    expect(text).not.toContain('Q&A Chat Transcript');
  });

  test('includes the LocalPDF privacy footer', async () => {
    const blob = exportReportToMarkdown(summary, [], 'doc.pdf');
    const text = await readBlobText(blob);
    expect(text).toContain('LocalPDF Privacy Engine');
  });

  test('handles missing/empty summary fields gracefully', async () => {
    const blob = exportReportToMarkdown({}, [], 'fallback.pdf');
    const text = await readBlobText(blob);
    expect(text).toContain('fallback.pdf');
    // Category should default to 'General'
    expect(text).toContain('General');
  });
});
