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
 * If native text count is low (scanned document), runs Tesseract OCR fallback.
 * @param {any} pdfDoc 
 * @param {function} [onProgress] 
 * @returns {Promise<Array<{ pageNum: number, chunkIndex: number, text: string, wordCount: number, isOcr?: boolean }>>}
 */
export async function parsePdfTextChunks(pdfDoc, onProgress) {
  const chunks = [];
  const totalPages = pdfDoc.numPages;
  let totalNativeWords = 0;

  // 1. Attempt fast native text stream extraction
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!pageText) continue;

    const words = pageText.split(/\s+/).filter(Boolean);
    totalNativeWords += words.length;

    let chunkIdx = 0;
    const sentences = pageText.match(/[^.!?]+[.!?]+/g) || [pageText];
    let currentChunkWords = [];

    for (const sentence of sentences) {
      const sWords = sentence.trim().split(/\s+/);
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

  // 2. Fallback to Tesseract OCR if text is sparse (< 20 words across pages)
  if (totalNativeWords < 20 && typeof window !== 'undefined') {
    onProgress && onProgress({ status: 'No text layer found. Running local OCR on scanned pages...' });

    try {
      const Tesseract = (await import('tesseract.js')).default;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
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
          const sentences = ocrText.match(/[^.!?]+[.!?]+/g) || [ocrText];
          let currentChunkWords = [];
          let chunkIdx = 0;

          for (const sentence of sentences) {
            const sWords = sentence.trim().split(/\s+/);
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
 * Tokenize and clean words
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Smart Document Category Detection (Legal, Finance, General)
 * @param {string} fullText 
 */
export function detectDocumentCategory(fullText) {
  const text = fullText.toLowerCase();

  const legalTerms = ['agreement', 'contract', 'party', 'obligations', 'governing law', 'liability', 'termination', 'shall', 'clause', 'indemnify'];
  const financeTerms = ['invoice', 'total', 'budget', 'price', 'payment', 'tax', 'bill', 'vendor', 'purchase', 'order', 'amount', 'expenditure', 'usd', 'rwf', 'eur'];

  let legalScore = 0;
  let financeScore = 0;

  legalTerms.forEach((term) => {
    if (text.includes(term)) legalScore += 2;
  });

  financeTerms.forEach((term) => {
    if (text.includes(term)) financeScore += 2;
  });

  if (legalScore > financeScore && legalScore >= 4) {
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

  if (financeScore > legalScore && financeScore >= 4) {
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

  // Extract key sentences across pages
  const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [];
  const scoredSentences = sentences
    .map((s) => {
      const sTokens = tokenize(s);
      let score = 0;
      for (const t of sTokens) {
        score += freqMap[t] || 0;
      }
      return { sentence: s.trim(), score: score / Math.max(1, sTokens.length) };
    })
    .filter((obj) => obj.sentence.length > 30 && obj.sentence.length < 250);

  scoredSentences.sort((a, b) => b.score - a.score);
  const keyPoints = scoredSentences.slice(0, 4).map((obj) => obj.sentence);

  if (keyPoints.length === 0) {
    keyPoints.push(`Document contains ${wordCount} words across ${totalPages} pages.`);
  }

  const firstChunk = chunks[0]?.text.slice(0, 300) || '';
  const overview = `[${category.label}] This document spans ${totalPages} page(s) containing approximately ${wordCount.toLocaleString()} words${isScannedOcr ? ' (extracted via local OCR)' : ''}. Main topics cover ${sortedTokens.slice(0, 4).join(', ')}. Key opening context: "${firstChunk.trim()}..."`;

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

  // Score chunks using TF-IDF term overlap
  const scoredChunks = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    let matchScore = 0;
    const chunkTokenSet = new Set(chunkTokens);

    for (const qToken of queryTokens) {
      if (chunkTokenSet.has(qToken)) {
        matchScore += 2;
      } else {
        for (const cToken of chunkTokenSet) {
          if (cToken.includes(qToken) || qToken.includes(cToken)) {
            matchScore += 1;
          }
        }
      }
    }

    return {
      ...chunk,
      score: matchScore / Math.max(1, Math.sqrt(chunkTokens.length)),
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
 * Export Summary & Chat Transcript to Client PDF
 * @param {any} summary 
 * @param {Array<any>} messages 
 * @param {string} fileName 
 * @returns {Promise<Blob>}
 */
export async function exportReportToPdf(summary, messages, fileName) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;

  // Title
  page.drawText(`LocalPDF AI Report: ${(fileName || 'Document').slice(0, 30)}`, {
    x: 40,
    y,
    size: 16,
    font: boldFont,
    color: rgb(0.06, 0.09, 0.16),
  });
  y -= 25;

  // Category
  page.drawText(`Category: ${summary?.category?.label || 'General'} | Pages: ${summary?.stats?.totalPages || 1} | Words: ${summary?.stats?.wordCount || 0}`, {
    x: 40,
    y,
    size: 10,
    font,
    color: rgb(0.3, 0.4, 0.5),
  });
  y -= 30;

  // Overview
  page.drawText('Executive Overview:', { x: 40, y, size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.2) });
  y -= 18;

  const overviewLines = (summary?.overview || '').slice(0, 300).match(/.{1,75}(\s|$)/g) || [summary?.overview || ''];
  overviewLines.forEach((line) => {
    if (y > 40) {
      page.drawText(line.trim(), { x: 40, y, size: 9.5, font, color: rgb(0.2, 0.25, 0.3) });
      y -= 14;
    }
  });

  y -= 15;

  // Key Highlights
  page.drawText('Key Highlights:', { x: 40, y, size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.2) });
  y -= 18;

  (summary?.keyPoints || []).slice(0, 4).forEach((pt) => {
    if (y > 40) {
      const ptLine = (`- ${pt}`).slice(0, 80);
      page.drawText(ptLine, { x: 40, y, size: 9, font, color: rgb(0.2, 0.25, 0.3) });
      y -= 15;
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
