/**
 * localAiEngine.js – 100% Client-Side NLP & Semantic Document RAG Engine
 * Supports PDF text parsing, Tesseract Auto-OCR fallback for scanned PDFs,
 * document category detection (Legal/Finance/General), and Markdown/PDF exports.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Common English stopwords to filter out in TF-IDF calculations
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which',
  'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Extracts and chunks text page-by-page from a loaded pdf.js document.
 * Tracks per-page word counts and only OCRs pages with sparse native text (Fix 1).
 * Uses splitIntoSentences() so headings and bullet points are preserved (Fix 2).
 * @param {any} pdfDoc
 * @param {function} [onProgress]
 * @returns {Promise<Array<{ pageNum: number, chunkIndex: number, text: string, wordCount: number, isOcr?: boolean }>>}
 */
export async function parsePdfTextChunks(pdfDoc, onProgress) {
  const chunks = [];
  const totalPages = pdfDoc.numPages;
  const perPageWordCount = {};  // Fix 1: track words per page to avoid duplicate OCR

  // 1. Attempt fast native text stream extraction
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = pageText ? pageText.split(/\s+/).filter(Boolean) : [];
    perPageWordCount[pageNum] = words.length;  // Fix 1

    if (!pageText) continue;

    let chunkIdx = 0;
    const sentences = splitIntoSentences(pageText);  // Fix 2: two-pass splitter
    let currentChunkWords = [];

    for (const sentence of sentences) {
      const sWords = sentence.trim().split(/\s+/).filter(Boolean);
      currentChunkWords.push(...sWords);

      if (currentChunkWords.length >= 200) {
        chunks.push({
          pageNum,
          chunkIndex: chunkIdx++,
          text: currentChunkWords.join(' '),
          wordCount: currentChunkWords.length,
          isOcr: false,
        });
        currentChunkWords = [];
      }
    }

    if (currentChunkWords.length > 0) {
      chunks.push({
        pageNum,
        chunkIndex: chunkIdx++,
        text: currentChunkWords.join(' '),
        wordCount: currentChunkWords.length,
        isOcr: false,
      });
    }
  }

  // 2. OCR fallback — only for pages with < 5 native words (Fix 1: no more global total)
  // This prevents re-processing pages that already have native text.
  const sparsePagesForOcr = Object.entries(perPageWordCount)
    .filter(([, count]) => count < 5)
    .map(([p]) => parseInt(p, 10));

  if (sparsePagesForOcr.length > 0 && typeof window !== 'undefined') {
    onProgress && onProgress({ status: 'Sparse text detected. Running local OCR on affected pages...' });

    try {
      const Tesseract = (await import('tesseract.js')).default;

      for (const pageNum of sparsePagesForOcr) {
        onProgress && onProgress({ status: `Running OCR on page ${pageNum} of ${totalPages}...` });

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.8 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        ctx.filter = 'grayscale(1) contrast(1.8)';
        await page.render({ canvasContext: ctx, viewport }).promise;

        const imgDataUrl = canvas.toDataURL('image/png');
        const ret = await Tesseract.recognize(imgDataUrl, 'eng');
        const ocrText = (ret.data.text || '').replace(/\s+/g, ' ').trim();

        if (ocrText) {
          const sentences = splitIntoSentences(ocrText);  // Fix 2: same helper for OCR path
          let currentChunkWords = [];
          let chunkIdx = 0;

          for (const sentence of sentences) {
            const sWords = sentence.trim().split(/\s+/).filter(Boolean);
            currentChunkWords.push(...sWords);

            if (currentChunkWords.length >= 200) {
              chunks.push({
                pageNum,
                chunkIndex: chunkIdx++,
                text: currentChunkWords.join(' '),
                wordCount: currentChunkWords.length,
                isOcr: true,
              });
              currentChunkWords = [];
            }
          }

          if (currentChunkWords.length > 0) {
            chunks.push({
              pageNum,
              chunkIndex: chunkIdx++,
              text: currentChunkWords.join(' '),
              wordCount: currentChunkWords.length,
              isOcr: true,
            });
          }
        }
      }
    } catch (err) {
      console.error('Auto-OCR fallback error:', err);
    }
  }

  return chunks;
}

/**
 * Tokenize and clean words.
 * Preserves currency symbols ($, €, £), percent signs, and intra-word hyphens (Fix 8)
 * so terms like "$500", "non-disclosure", and "50%" are tokenized correctly.
 * Minimum token length lowered to 2 so abbreviations like "AI", "EU", "UK" are retained.
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s$€£%-]/g, ' ')      // keep currency, percent, intra-word hyphens
    .replace(/(?<!\w)-|-(?!\w)/g, ' ')  // remove bare hyphens not part of compounds
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Splits page text into sentence-like segments using a two-pass approach. (Fix 2)
 * Pass 1: captures punctuation-delimited sentences.
 * Pass 2: captures headings, bullet points, table rows, and other non-sentence lines
 *         that would otherwise be silently discarded by a punctuation-only regex.
 * @param {string} text
 * @returns {string[]}
 */
function splitIntoSentences(text) {
  if (!text) return [];
  const segments = [];
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Try to split the line on sentence-ending punctuation
    const byPunct = trimmed.match(/[^.!?;]+[.!?;]+/g);
    if (byPunct && byPunct.length > 0) {
      segments.push(...byPunct);
      // Capture any trailing text without punctuation (e.g. a heading like "Section 1:")
      const joined = byPunct.join('');
      if (trimmed.length > joined.length + 2) {
        const tail = trimmed.slice(joined.length).trim();
        if (tail) segments.push(tail);
      }
    } else {
      // No sentence-ending punctuation — treat entire line as one segment
      segments.push(trimmed);
    }
  }
  return segments.length > 0 ? segments : [text];
}

/**
 * Sanitizes the opening text of a document for use in the overview. (Fix 5)
 * Strips lines that are all-caps watermarks, too short, or purely numeric PDF artifacts.
 * @param {string} text
 * @returns {string}
 */
function sanitizeLeadText(text) {
  return text
    .split(/\n+/)
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length < 15) return false;              // too short
      if (/^[A-Z\s\d\W]+$/.test(trimmed)) return false;  // all-caps headers/watermarks
      if (/^[\d\s.,]+$/.test(trimmed)) return false;     // pure numbers/page markers
      if (trimmed.split(/\s+/).length < 4) return false; // fewer than 4 words
      return true;
    })
    .join(' ')
    .slice(0, 300);
}

/**
 * Smart Document Category Detection (Legal, Medical, Finance, Academic, General). (Fix 7)
 * Priority when tied: legal > medical > finance > academic > general.
 * @param {string} fullText
 */
export function detectDocumentCategory(fullText) {
  const text = fullText.toLowerCase();

  const legalTerms    = ['agreement', 'contract', 'party', 'obligations', 'governing law', 'liability', 'termination', 'shall', 'clause', 'indemnify'];
  const medicalTerms  = ['patient', 'diagnosis', 'treatment', 'dosage', 'clinical', 'symptoms', 'prognosis', 'prescribed', 'medication', 'hospital', 'physician'];
  const financeTerms  = ['invoice', 'total', 'budget', 'price', 'payment', 'tax', 'bill', 'vendor', 'purchase', 'order', 'amount', 'expenditure', 'usd', 'rwf', 'eur'];
  const academicTerms = ['abstract', 'methodology', 'hypothesis', 'findings', 'references', 'bibliography', 'conclusion', 'dataset', 'figure', 'journal', 'doi'];

  let legalScore = 0, medicalScore = 0, financeScore = 0, academicScore = 0;

  legalTerms.forEach((t)    => { if (text.includes(t)) legalScore    += 2; });
  medicalTerms.forEach((t)  => { if (text.includes(t)) medicalScore  += 2; });
  financeTerms.forEach((t)  => { if (text.includes(t)) financeScore  += 2; });
  academicTerms.forEach((t) => { if (text.includes(t)) academicScore += 2; });

  const maxScore = Math.max(legalScore, medicalScore, financeScore, academicScore);

  if (maxScore >= 4) {
    if (legalScore === maxScore) {
      return {
        type: 'legal',
        label: 'Legal Contract / Agreement',
        icon: '📜',
        prompts: [
          'What are the main party obligations?',
          'What are the termination conditions?',
          'What is the governing law?',
          'Summarize key liabilities & penalties',
        ],
      };
    }
    if (medicalScore === maxScore) {
      return {
        type: 'medical',
        label: 'Medical / Clinical Report',
        icon: '🏥',
        prompts: [
          'What is the diagnosis?',
          'List prescribed medications & dosages',
          'What are the treatment recommendations?',
          'Summarize key findings & test results',
        ],
      };
    }
    if (financeScore === maxScore) {
      return {
        type: 'finance',
        label: 'Financial / Budget / Purchase Order',
        icon: '💼',
        prompts: [
          'What is the total budget/amount?',
          'List all key line items & costs',
          'Who are the vendors or parties?',
          'Summarize payment & incentive policy',
        ],
      };
    }
    if (academicScore === maxScore) {
      return {
        type: 'academic',
        label: 'Academic / Research Paper',
        icon: '🎓',
        prompts: [
          'What is the research hypothesis?',
          'Summarize the methodology',
          'What are the key findings?',
          'List cited references & authors',
        ],
      };
    }
  }

  return {
    type: 'general',
    label: 'General Document / Report',
    icon: '📚',
    prompts: [
      'What is the main executive summary?',
      'List key findings and numbers',
      'What are the core conclusions?',
      'Summarize page by page',
    ],
  };
}

/**
 * Generates executive document summary, statistics, category, and top key topics.
 * Applies position bias + novelty filter to keyPoints selection (Fix 4).
 * Uses sanitized lead text and the top keyPoint to build the overview (Fix 5).
 * @param {Array<{ pageNum: number, text: string, wordCount: number, isOcr?: boolean }>} chunks
 * @param {number} totalPages
 */
export function generateDocumentSummary(chunks, totalPages) {
  if (!chunks || chunks.length === 0) {
    return {
      overview: 'No readable text layer or OCR results were found in this document.',
      keyPoints: ['Use manual tools to view or edit this document.'],
      topTopics: [],
      category: { type: 'general', label: 'Unclassified Document', icon: '📄', prompts: [] },
      stats: { totalPages, wordCount: 0, readingTimeMinutes: 0, isScannedOcr: false },
    };
  }

  const fullText = chunks.map((c) => c.text).join(' ');
  const words = fullText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const isScannedOcr = chunks.some((c) => c.isOcr);

  const category = detectDocumentCategory(fullText);

  // Frequency mapping for topics
  const freqMap = {};
  const tokens = tokenize(fullText);
  for (const token of tokens) {
    freqMap[token] = (freqMap[token] || 0) + 1;
  }

  const sortedTokens = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

  // Score sentences with position bias (Fix 4)
  const allSentences = fullText.match(/[^.!?]+[.!?]+/g) || [];
  const totalSentences = allSentences.length;

  const scoredSentences = allSentences
    .map((s, idx) => {
      const sTokens = tokenize(s);
      let score = 0;
      for (const t of sTokens) score += freqMap[t] || 0;
      const baseScore = score / Math.max(1, sTokens.length);
      // Position bias: sentences in the first 25% score 40% higher (Fix 4)
      const positionMultiplier = idx / Math.max(1, totalSentences) < 0.25 ? 1.4 : 1.0;
      return { sentence: s.trim(), score: baseScore * positionMultiplier };
    })
    .filter((obj) => obj.sentence.length > 30 && obj.sentence.length < 250);

  scoredSentences.sort((a, b) => b.score - a.score);

  // Novelty filter: skip sentences with >60% token overlap with already-selected keyPoints (Fix 4)
  const keyPoints = [];
  const selectedTokenSets = [];

  for (const obj of scoredSentences) {
    if (keyPoints.length >= 4) break;
    const candidateTokens = new Set(tokenize(obj.sentence));
    let isDuplicate = false;
    for (const existingSet of selectedTokenSets) {
      const intersection = [...candidateTokens].filter((t) => existingSet.has(t)).length;
      const overlap = intersection / Math.max(1, Math.min(candidateTokens.size, existingSet.size));
      if (overlap > 0.6) { isDuplicate = true; break; }
    }
    if (!isDuplicate) {
      keyPoints.push(obj.sentence);
      selectedTokenSets.push(candidateTokens);
    }
  }

  if (keyPoints.length === 0) {
    keyPoints.push(`Document contains ${wordCount} words across ${totalPages} pages.`);
  }

  // Build overview using the top keyPoint as the lead sentence (Fix 5)
  const rawFirstChunk = chunks[0]?.text || '';
  const cleanLead = sanitizeLeadText(rawFirstChunk);
  const leadSentence = keyPoints[0] || cleanLead.split(/[.!?]/)[0] || '';
  const overview = `[${category.label}] ${leadSentence ? `${leadSentence.trim()}. ` : ''}This document spans ${totalPages} page(s) with approximately ${wordCount.toLocaleString()} words${isScannedOcr ? ' (extracted via local OCR)' : ''}. Main topics: ${sortedTokens.slice(0, 4).join(', ')}.`;

  return {
    overview,
    keyPoints,
    topTopics: sortedTokens,
    category,
    stats: {
      totalPages,
      wordCount,
      readingTimeMinutes,
      isScannedOcr,
    },
  };
}

/**
 * RAG Semantic Question Answering over PDF chunks.
 * Pre-tokenizes all chunks once and uses prefix-stem matching with early exit
 * instead of a full O(n²) inner loop. (Fix 3)
 * @param {string} query
 * @param {Array<{ pageNum: number, text: string }>} chunks
 */
export function answerDocumentQuestion(query, chunks) {
  if (!chunks || chunks.length === 0) {
    return {
      answer: 'No readable text stream found in document to answer this question.',
      relevantPageNum: 1,
    };
  }

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return {
      answer: 'Please ask a specific question about the document content.',
      relevantPageNum: 1,
    };
  }

  // Pre-tokenize all chunks once — avoids repeated tokenize() calls inside scoring loop (Fix 3)
  const tokenizedChunks = chunks.map((chunk) => ({
    ...chunk,
    _tokens: tokenize(chunk.text),
  }));

  // Score each chunk: exact match = 2pts, prefix-stem match (both ≥5 chars) = 0.5pts (Fix 3)
  const scoredChunks = tokenizedChunks.map((chunk) => {
    const chunkTokenSet = new Set(chunk._tokens);
    let matchScore = 0;

    for (const qToken of queryTokens) {
      if (chunkTokenSet.has(qToken)) {
        matchScore += 2;
      } else if (qToken.length >= 5) {
        // Only partial-match when both tokens are substantial — reduces false positives
        for (const cToken of chunkTokenSet) {
          if (cToken.length >= 5 && (cToken.startsWith(qToken) || qToken.startsWith(cToken))) {
            matchScore += 0.5;
            break; // count at most once per query token
          }
        }
      }
    }

    return {
      ...chunk,
      score: matchScore / Math.max(1, Math.sqrt(chunk._tokens.length)),
    };
  });

  scoredChunks.sort((a, b) => b.score - a.score);
  const topMatch = scoredChunks[0];

  if (!topMatch || topMatch.score === 0) {
    return {
      answer: `I searched across all pages for "${query}", but could not find direct matching passages. Try rephrasing or searching for related keywords.`,
      relevantPageNum: 1,
    };
  }

  const sentences = topMatch.text.match(/[^.!?]+[.!?]+/g) || [topMatch.text];
  const querySet = new Set(queryTokens);
  const bestSentence = sentences.reduce((best, s) => {
    const sTokens = tokenize(s);
    const count = sTokens.filter((t) => querySet.has(t)).length;
    return count > best.count ? { sentence: s.trim(), count } : best;
  }, { sentence: sentences[0].trim(), count: 0 });

  const answerText = `Based on [Page ${topMatch.pageNum}]: "${bestSentence.sentence}"\n\nContext excerpt: "...${topMatch.text.slice(0, 260)}..."`;

  return {
    answer: answerText,
    relevantPageNum: topMatch.pageNum,
  };
}

/**
 * Export Summary & Chat Transcript to Markdown
 * @param {any} summary 
 * @param {Array<any>} messages 
 * @param {string} fileName 
 * @returns {Blob}
 */
export function exportReportToMarkdown(summary, messages, fileName) {
  const titleName = fileName || 'Document';
  let md = `# LocalPDF AI Summary & Q&A Report: ${titleName}\n\n`;
  md += `**Document Category:** ${summary?.category?.icon || ''} ${summary?.category?.label || 'General'}\n`;
  md += `**Total Pages:** ${summary?.stats?.totalPages || 1} | **Word Count:** ${summary?.stats?.wordCount || 0} | **Est. Reading Time:** ${summary?.stats?.readingTimeMinutes || 1} min\n\n`;

  md += `## Executive Overview\n\n${summary?.overview || ''}\n\n`;

  md += `## Key Highlights\n\n`;
  (summary?.keyPoints || []).forEach((pt) => {
    md += `- ${pt}\n`;
  });

  md += `\n## Main Topics\n\n`;
  md += (summary?.topTopics || []).map((t) => `\`${t}\``).join('  ') + `\n\n`;

  if (messages && messages.length > 1) {
    md += `## Q&A Chat Transcript\n\n`;
    messages.forEach((msg) => {
      if (msg.sender === 'user') {
        md += `### 👤 User (${msg.time}):\n${msg.text}\n\n`;
      } else {
        md += `### 🤖 LocalPDF AI (${msg.time}):\n${msg.text}\n\n`;
      }
    });
  }

  md += `---\n*Generated 100% locally in browser by LocalPDF Privacy Engine.*\n`;

  return new Blob([md], { type: 'text/markdown;charset=utf-8' });
}

/**
 * Wraps a string into lines that fit within maxChars characters.
 * @param {string} text
 * @param {number} maxChars
 * @returns {string[]}
 */
function wrapText(text, maxChars = 78) {
  const words = (text || '').split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if ((current + (current ? ' ' : '') + word).length > maxChars) {
      if (current) lines.push(current);
      // Hard-break words longer than maxChars
      let remaining = word;
      while (remaining.length > maxChars) {
        lines.push(remaining.slice(0, maxChars));
        remaining = remaining.slice(maxChars);
      }
      current = remaining;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Returns the current page if there is enough room, otherwise adds a new page
 * and resets the y cursor.
 * @param {import('pdf-lib').PDFDocument} pdfDoc
 * @param {number} y
 * @param {number} neededHeight - minimum vertical space required
 * @returns {{ page: import('pdf-lib').PDFPage, y: number }}
 */
function getOrAddPage(pdfDoc, y, neededHeight = 20) {
  const MARGIN_BOTTOM = 50;
  if (y - neededHeight >= MARGIN_BOTTOM) {
    const pages = pdfDoc.getPages();
    return { page: pages[pages.length - 1], y };
  }
  const newPage = pdfDoc.addPage([595, 842]);
  return { page: newPage, y: 800 };
}

/**
 * Export Summary & Chat Transcript to Client PDF.
 * Supports multi-page output so long summaries and Q&A transcripts are never clipped.
 * @param {any} summary
 * @param {Array<any>} messages
 * @param {string} fileName
 * @returns {Promise<Blob>}
 */
export async function exportReportToPdf(summary, messages, fileName) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let currentPage = pdfDoc.addPage([595, 842]); // first A4 page
  let y = 800;

  const draw = (text, opts) => {
    currentPage.drawText(text, { x: 40, y, ...opts });
  };

  // ── Title ──────────────────────────────────────────────────────────────────
  ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 20));
  draw(`LocalPDF AI Report: ${(fileName || 'Document').slice(0, 50)}`, {
    size: 16,
    font: boldFont,
    color: rgb(0.06, 0.09, 0.16),
  });
  y -= 25;

  // ── Stats bar ──────────────────────────────────────────────────────────────
  ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 16));
  draw(
    `Category: ${summary?.category?.label || 'General'} | Pages: ${summary?.stats?.totalPages || 1} | Words: ${(summary?.stats?.wordCount || 0).toLocaleString()} | Reading time: ~${summary?.stats?.readingTimeMinutes || 1} min`,
    { size: 9, font, color: rgb(0.3, 0.4, 0.5) }
  );
  y -= 28;

  // ── Executive Overview ─────────────────────────────────────────────────────
  ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 18));
  draw('Executive Overview:', { size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.2) });
  y -= 18;

  for (const line of wrapText(summary?.overview || '', 90)) {
    ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 14));
    currentPage.drawText(line, { x: 40, y, size: 9.5, font, color: rgb(0.2, 0.25, 0.3) });
    y -= 14;
  }
  y -= 12;

  // ── Key Highlights ─────────────────────────────────────────────────────────
  ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 18));
  draw('Key Highlights:', { size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.2) });
  y -= 18;

  for (const pt of (summary?.keyPoints || []).slice(0, 5)) {
    for (const line of wrapText(`- ${pt}`, 88)) {
      ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 14));
      currentPage.drawText(line, { x: 40, y, size: 9, font, color: rgb(0.2, 0.25, 0.3) });
      y -= 14;
    }
  }
  y -= 12;

  // ── Main Topics ────────────────────────────────────────────────────────────
  if ((summary?.topTopics || []).length > 0) {
    ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 18));
    draw('Main Topics:', { size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.2) });
    y -= 16;
    ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 14));
    currentPage.drawText(summary.topTopics.join('  ·  '), { x: 40, y, size: 9, font, color: rgb(0.25, 0.35, 0.55) });
    y -= 24;
  }

  // ── Q&A Chat Transcript ────────────────────────────────────────────────────
  const chatMessages = (messages || []).filter((m) => m?.text);
  if (chatMessages.length > 1) {
    ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 22));
    draw('Q&A Chat Transcript:', { size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.2) });
    y -= 20;

    for (const msg of chatMessages) {
      const isUser = msg.sender === 'user';
      const label = isUser ? `👤 User (${msg.time || ''})` : `🤖 LocalPDF AI (${msg.time || ''})`;
      const labelColor = isUser ? rgb(0.1, 0.3, 0.6) : rgb(0.1, 0.45, 0.3);

      ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 16));
      currentPage.drawText(label, { x: 40, y, size: 9.5, font: boldFont, color: labelColor });
      y -= 14;

      for (const line of wrapText(msg.text || '', 88)) {
        ({ page: currentPage, y } = getOrAddPage(pdfDoc, y, 13));
        currentPage.drawText(line, { x: 48, y, size: 9, font, color: rgb(0.2, 0.25, 0.3) });
        y -= 13;
      }
      y -= 8; // gap between messages
    }
  }

  // ── Footer on every page ───────────────────────────────────────────────────
  const allPages = pdfDoc.getPages();
  const totalPageCount = allPages.length;
  for (let i = 0; i < totalPageCount; i++) {
    const pg = allPages[i];
    pg.drawText(`LocalPDF Privacy Engine  ·  Page ${i + 1} of ${totalPageCount}`, {
      x: 40,
      y: 28,
      size: 7.5,
      font,
      color: rgb(0.5, 0.55, 0.6),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
