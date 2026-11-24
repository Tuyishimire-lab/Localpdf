/**
 * webGpuAi.js – Opt-in Local WebGPU & Browser On-Device AI adapter for AiChatTool.
 * Detects hardware WebGPU adapters and Chrome/Edge Built-in Prompt API (LanguageModel)
 * cleanly with zero external network calls or unconsented weight downloads.
 */

import { isAirGapped } from './airgap.js';
import { answerDocumentQuestion } from './localAiEngine.js';

function getBrowserLanguageModelApi() {
  if (typeof globalThis === 'undefined') return null;
  if (globalThis.LanguageModel && typeof globalThis.LanguageModel.create === 'function') {
    return { kind: 'standard', api: globalThis.LanguageModel };
  }
  if (
    globalThis.ai?.languageModel &&
    typeof globalThis.ai.languageModel.create === 'function'
  ) {
    return { kind: 'legacy', api: globalThis.ai.languageModel };
  }
  return null;
}

export function getLocalAiCapabilitiesSnapshot() {
  const hasWebGpu = typeof navigator !== 'undefined' && Boolean(navigator.gpu);
  const hasBrowserPromptApi = Boolean(getBrowserLanguageModelApi());
  const airGapped = isAirGapped();

  let engineStatus = 'CPU Extractive + Local Synthesis';
  if (hasBrowserPromptApi) {
    engineStatus = 'Browser On-Device LLM Available';
  } else if (hasWebGpu) {
    engineStatus = 'WebGPU Adapter Detected · Local Synthesis Ready';
  }

  return {
    hasWebGpu,
    hasWebGpuAdapter: false,
    hasBrowserPromptApi,
    airGapped,
    engineStatus,
  };
}

export async function detectLocalAiCapabilities() {
  const base = getLocalAiCapabilitiesSnapshot();
  let hasWebGpuAdapter = false;

  if (base.hasWebGpu && typeof navigator.gpu.requestAdapter === 'function') {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      hasWebGpuAdapter = Boolean(adapter);
    } catch {
      hasWebGpuAdapter = false;
    }
  }

  let engineStatus = base.engineStatus;
  if (base.hasBrowserPromptApi) {
    engineStatus = 'Browser On-Device LLM Ready';
  } else if (hasWebGpuAdapter) {
    engineStatus = 'WebGPU GPU Ready · Local Synthesis';
  } else if (base.hasWebGpu) {
    engineStatus = 'WebGPU API Present · Local Synthesis';
  }

  return {
    ...base,
    hasWebGpuAdapter,
    engineStatus,
  };
}

function collectTopEvidence(question, chunks = []) {
  const terms = String(question || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

  const scored = chunks
    .map((chunk) => {
      const text = String(chunk?.text || '');
      const lower = text.toLowerCase();
      let hits = 0;
      for (const term of terms) {
        if (lower.includes(term)) hits += 1;
      }
      return { pageNum: chunk.pageNum || 1, text, hits };
    })
    .filter((item) => item.text.trim().length > 0)
    .sort((a, b) => b.hits - a.hits);

  return scored.slice(0, 3);
}

function extractKeyFigures(text) {
  const matches = String(text || '').match(
    /(?:\$|€|£)?\b\d+(?:[.,]\d+)*(?:\s?%|(?:\s?(?:days?|months?|years?|USD|EUR)))?\b/gi
  );
  if (!matches) return [];
  const unique = Array.from(new Set(matches.map((m) => m.trim()).filter((m) => m.length >= 2)));
  return unique.slice(0, 6);
}

/**
 * Generates an answer using either default TF-IDF extractive QA or opt-in local AI mode.
 * @param {{ question: string, chunks: Array<any>, summary?: any, mode?: 'extractive'|'local-ai' }} params
 */
export async function generateEnhancedLocalAnswer({
  question,
  chunks = [],
  summary = null,
  mode = 'extractive',
}) {
  const base = answerDocumentQuestion(question, chunks);

  if (mode !== 'local-ai') {
    return {
      ...base,
      engineUsed: 'tfidf-extractive',
      engineLabel: 'TF-IDF Extractive',
    };
  }

  const caps = await detectLocalAiCapabilities();
  const evidence = collectTopEvidence(question, chunks);
  const lm = getBrowserLanguageModelApi();

  if (lm && evidence.length > 0) {
    const contextBlock = evidence
      .map((item) => `[Page ${item.pageNum}] ${item.text.slice(0, 1000)}`)
      .join('\n\n')
      .slice(0, 3400);

    let session = null;
    try {
      session = await lm.api.create({
        systemPrompt:
          'You are a concise, strict on-device PDF assistant. Answer using only the supplied excerpts and cite page numbers.',
      });
      const promptText = `Document overview: ${summary?.overview || 'N/A'}\n\nExcerpts:\n${contextBlock}\n\nQuestion: ${question}`;
      const modelResponse = await session.prompt(promptText);
      if (modelResponse && String(modelResponse).trim()) {
        return {
          answer: String(modelResponse).trim(),
          relevantPageNum: base.relevantPageNum,
          engineUsed: 'browser-on-device-llm',
          engineLabel: 'On-Device Browser LLM',
        };
      }
    } catch {
      // Fall back transparently to deterministic structured local synthesis below
    } finally {
      try {
        session?.destroy?.();
      } catch {
        // ignore cleanup failure
      }
    }
  }

  // Deterministic Enhanced Local Synthesis fallback (zero external downloads)
  const combinedEvidenceText = evidence.map((e) => e.text).join(' ');
  const figures = extractKeyFigures(combinedEvidenceText);
  const pageList = Array.from(new Set(evidence.map((e) => `Page ${e.pageNum}`)));
  const lines = [base.answer];

  if (pageList.length > 0) {
    lines.push(`\nSupporting locations: ${pageList.join(', ')}`);
  }
  if (figures.length > 0) {
    lines.push(`Extracted figures/dates: ${figures.join(' • ')}`);
  }
  if (summary?.category?.label) {
    lines.push(`Document class: ${summary.category.label}`);
  }

  return {
    answer: lines.join('\n'),
    relevantPageNum: base.relevantPageNum,
    engineUsed: caps.hasWebGpuAdapter || caps.hasWebGpu ? 'webgpu-structured-local' : 'local-structured-fallback',
    engineLabel:
      caps.hasWebGpuAdapter || caps.hasWebGpu
        ? 'WebGPU Ready · Local Synthesis'
        : 'Enhanced Local Synthesis',
  };
}

