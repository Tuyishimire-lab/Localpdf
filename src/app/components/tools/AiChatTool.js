'use client';

import './AiChatTool.css';
import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  CornerDownRight,
  Loader2,
  Download,
  FileCode,
  Cpu,
  Lock,
  Copy,
  Check,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Workspace from '../Workspace';
import { loadPdf } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';
import { addHistoryEntry } from '../../../lib/history';
import {
  parsePdfTextChunks,
  generateDocumentSummary,
  answerDocumentQuestion,
  exportReportToMarkdown,
  exportReportToPdf,
} from '../../../lib/localAiEngine';
import { isAirGapped, subscribeAirGap, getAirGapServerSnapshot } from '../../../lib/airgap';
import {
  getLocalAiCapabilitiesSnapshot,
  detectLocalAiCapabilities,
  generateEnhancedLocalAnswer,
} from '../../../lib/webGpuAi';

let messageCounter = 0;
function generateMessageId(prefix = 'msg') {
  messageCounter += 1;
  return `${Date.now()}_${messageCounter}_${prefix}`;
}

function getFormattedTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function cleanPdfArtifactNoise(str) {
  return String(str || '')
    .replace(/```[a-zA-Z0-9_-]*/g, '')
    .replace(/```/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\?{4,}/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Splits raw extractive/LLM answer text into a cleaned body and optional Source Excerpt.
 * Pure helper exported for unit testing.
 * @param {string} rawText
 * @returns {{ mainText: string, contextExcerpt: string }}
 */
export function parseAiAnswerForDisplay(rawText) {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n');
  const excerptMatch = normalized.match(/\n+Context excerpt:\s*"?([\s\S]*?)"?\s*$/i);

  if (!excerptMatch) {
    return {
      mainText: cleanPdfArtifactNoise(normalized),
      contextExcerpt: '',
    };
  }

  const mainRaw = normalized.slice(0, excerptMatch.index);
  const excerptClean = cleanPdfArtifactNoise(excerptMatch[1]).replace(/^"|"$/g, '');

  return {
    mainText: cleanPdfArtifactNoise(mainRaw),
    contextExcerpt: excerptClean,
  };
}

function renderInlineBold(text, keyPrefix) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyPrefix}_b_${idx}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function AiChatTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoomFactor, setZoomFactor] = useState(1);
  const [citedPage, setCitedPage] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // AI & NLP state
  const [chunks, setChunks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('Indexing document & extracting text...');
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'chat'

  // Chat thread
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [aiEngineMode, setAiEngineMode] = useState('extractive'); // 'extractive' | 'local-ai'
  const [aiCapabilities, setAiCapabilities] = useState(() => getLocalAiCapabilitiesSnapshot());
  const airGapped = useSyncExternalStore(subscribeAirGap, isAirGapped, getAirGapServerSnapshot);

  useEffect(() => {
    if (files.length === 0) return;
    let cancelled = false;
    detectLocalAiCapabilities().then((caps) => {
      if (!cancelled) setAiCapabilities(caps);
    });
    return () => {
      cancelled = true;
    };
  }, [airGapped, files.length]);

  const canvasRef = useRef(null);
  const viewerBoxRef = useRef(null);
  const containerRef = useRef(null);
  const chatScrollRef = useRef(null);
  const chunkCacheRef = useRef({});
  const activeRenderTaskRef = useRef(null);
  const renderSeqRef = useRef(0);

  const goToPage = useCallback(
    (pageNum, { fromCitation = false } = {}) => {
      const clamped = Math.max(1, Math.min(totalPages || 1, Number(pageNum) || 1));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
      if (fromCitation) {
        setCitedPage(clamped);
      }
    },
    [totalPages]
  );

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setCurrentPage(1);
    setPageInput('1');
    setCitedPage(null);
    setZoomFactor(1);
    setChunks([]);
    setSummary(null);
    setMessages([]);
    setInputQuery('');
    setShowPrompts(true);

    const fingerprint = `${targetFile.name}::${targetFile.size}::${targetFile.lastModified}`;
    const cached = chunkCacheRef.current[fingerprint];
    if (cached) {
      setPdfDoc(cached.pdfDoc);
      setTotalPages(cached.pdfDoc.numPages);
      setChunks(cached.chunks);
      setSummary(cached.summary);
      setMessages([
        {
          id: generateMessageId('welcome'),
          sender: 'ai',
          text: `Welcome back! "${targetFile.name}" is already indexed (${cached.pdfDoc.numPages} pages). Ask me anything!`,
          time: getFormattedTime(),
        },
      ]);
      return;
    }

    setIsLoadingPdf(true);
    setIsAnalyzing(true);
    setStatusText('Indexing document & extracting text...');

    try {
      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);

      const extractedChunks = await parsePdfTextChunks(doc, (progress) => {
        if (typeof progress === 'string') {
          setStatusText(progress);
        } else if (progress?.status) {
          setStatusText(progress.status);
        } else if (progress?.current && progress?.total) {
          setStatusText(`Extracting page ${progress.current} of ${progress.total}...`);
        }
      });
      setChunks(extractedChunks);

      setStatusText('Generating summary and analyzing topics...');
      const docSummary = generateDocumentSummary(extractedChunks, doc.numPages);
      setSummary(docSummary);

      const categoryLabel = docSummary.category ? ` · Detected: ${docSummary.category.label}` : '';
      const ocrCount = docSummary.stats?.ocrPageCount || 0;
      const ocrNotice = ocrCount > 0 ? ` · ${ocrCount} scanned page${ocrCount > 1 ? 's' : ''} OCR-processed` : '';

      setMessages([
        {
          id: generateMessageId('welcome'),
          sender: 'ai',
          text: `Indexed "${targetFile.name}" (${doc.numPages} pages)${categoryLabel}${ocrNotice}. Ask me anything about this document!`,
          time: getFormattedTime(),
        },
      ]);

      const cacheKeys = Object.keys(chunkCacheRef.current);
      if (cacheKeys.length >= 3) delete chunkCacheRef.current[cacheKeys[0]];
      chunkCacheRef.current[fingerprint] = { pdfDoc: doc, chunks: extractedChunks, summary: docSummary };

      addHistoryEntry({
        tool: 'ai-chat',
        toolLabel: 'AI PDF Summarizer & Chat',
        fileName: targetFile.name,
        inputSize: targetFile.size,
        outputSize: null,
      });
    } catch (err) {
      console.error('Error loading PDF for AI Chat:', err);
      toast.error('Failed to load PDF file.');
      setFiles([]);
    } finally {
      setIsLoadingPdf(false);
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setPageInput('1');
    setCitedPage(null);
    setChunks([]);
    setSummary(null);
    setMessages([]);
    setInputQuery('');
  };

  // Render current PDF page cleanly with sequential renderTask cancellation (React 19 Strict Mode safe)
  useEffect(() => {
    if (!pdfDoc || isLoadingPdf || !canvasRef.current) return;

    let cancelled = false;
    const seq = ++renderSeqRef.current;

    const renderPage = async () => {
      const prevTask = activeRenderTaskRef.current;
      if (prevTask) {
        try {
          prevTask.cancel?.();
          await prevTask.promise;
        } catch {
          // ignore cancellation rejection
        }
        if (activeRenderTaskRef.current === prevTask) {
          activeRenderTaskRef.current = null;
        }
      }

      if (cancelled || seq !== renderSeqRef.current || !canvasRef.current) return;

      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled || seq !== renderSeqRef.current || !canvasRef.current) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const boxWidth = viewerBoxRef.current?.clientWidth || containerRef.current?.clientWidth || 640;
        const availableWidth = Math.max(280, boxWidth - 24);
        const fitWidthScale = availableWidth / Math.max(1, unscaledViewport.width);
        const maxHeight =
          typeof window !== 'undefined'
            ? Math.max(460, Math.min(window.innerHeight * 0.72, 760))
            : 680;
        const fitHeightScale = maxHeight / Math.max(1, unscaledViewport.height);
        const baseScale = Math.max(0.1, Math.min(fitWidthScale, fitHeightScale, 2.0));
        const cssScale = baseScale * zoomFactor;
        const dpr =
          typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const renderScale = Number((cssScale * dpr).toFixed(3));

        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(unscaledViewport.width * cssScale)}px`;
        canvas.style.height = `${Math.floor(unscaledViewport.height * cssScale)}px`;

        const renderTask = page.render({ canvasContext: ctx, viewport });
        activeRenderTaskRef.current = renderTask;

        await renderTask.promise;

        if (activeRenderTaskRef.current === renderTask) {
          activeRenderTaskRef.current = null;
        }
      } catch (err) {
        if (err?.name === 'RenderingCancelledException' || cancelled) return;
        console.error('Error rendering page:', err);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      const activeTask = activeRenderTaskRef.current;
      if (activeTask) {
        try {
          activeTask.cancel?.();
        } catch {
          // ignore cancel error
        }
      }
    };
  }, [pdfDoc, isLoadingPdf, currentPage, zoomFactor]);

  // Scroll only inside the chat message container (never scrolls the full page window)
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSendMessage = async (queryText) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || !pdfDoc) return;

    const userMsg = {
      id: generateMessageId('user'),
      sender: 'user',
      text: textToSend,
      time: getFormattedTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setShowPrompts(false);
    setIsThinking(true);
    setActiveTab('chat');

    await new Promise((resolve) => setTimeout(resolve, 0));

    const result =
      aiEngineMode === 'local-ai'
        ? await generateEnhancedLocalAnswer({
            question: textToSend,
            chunks,
            summary,
            mode: 'local-ai',
          })
        : answerDocumentQuestion(textToSend, chunks);

    const { answer, relevantPageNum, engineLabel } = result;

    const aiMsg = {
      id: generateMessageId('ai'),
      sender: 'ai',
      text: answer,
      relevantPageNum,
      engineLabel: aiEngineMode === 'local-ai' ? engineLabel : null,
      time: getFormattedTime(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsThinking(false);

    if (relevantPageNum) {
      goToPage(relevantPageNum, { fromCitation: true });
    }
  };

  const handleCopyMessage = async (msg) => {
    const { mainText, contextExcerpt } = parseAiAnswerForDisplay(msg.text);
    const fullText = contextExcerpt ? `${mainText}\n\nSource excerpt:\n${contextExcerpt}` : mainText;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedMsgId(msg.id);
      toast.success('Answer copied to clipboard.');
      setTimeout(() => setCopiedMsgId(null), 1800);
    } catch {
      toast.error('Unable to copy to clipboard.');
    }
  };

  const handleClearChat = () => {
    const fileName = files[0]?.name || 'this document';
    setMessages([
      {
        id: generateMessageId('reset'),
        sender: 'ai',
        text: `Cleared chat history for "${fileName}". Ask a new question anytime.`,
        time: getFormattedTime(),
      },
    ]);
    setShowPrompts(true);
    setCitedPage(null);
  };

  const handleExportMarkdown = () => {
    if (!summary || !files[0]) return;
    const blob = exportReportToMarkdown(summary, messages, files[0].name);
    const baseName = files[0].name.replace(/\.[^/.]+$/, '');
    downloadFile(blob, `${baseName}_ai_report.md`);
  };

  const handleExportPdf = async () => {
    if (!summary || !files[0]) return;
    const blob = await exportReportToPdf(summary, messages, files[0].name);
    const baseName = files[0].name.replace(/\.[^/.]+$/, '');
    downloadFile(blob, `${baseName}_ai_report.pdf`);
  };

  const compactEngineStatus = aiCapabilities.hasBrowserPromptApi
    ? 'On-Device LLM Ready'
    : aiCapabilities.hasWebGpuAdapter || aiCapabilities.hasWebGpu
    ? 'WebGPU Ready'
    : 'Local CPU';

  // Left Pane: Document Viewer & Page Navigation
  const leftPane = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: '100%', alignItems: 'center' }}>
      {isLoadingPdf || !pdfDoc ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', width: '100%', gap: '0.75rem', color: 'var(--text-muted)' }}>
          <Loader2 className="modal-spinner" size={36} />
          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{statusText}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', width: '100%', alignItems: 'center' }}>
          {/* Page & Zoom Toolbar */}
          <div className="ai-viewer-toolbar">
            <div className="ai-viewer-controls">
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                style={{ padding: '0.3rem 0.55rem' }}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  goToPage(parseInt(pageInput, 10) || currentPage);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600 }}
              >
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={() => goToPage(parseInt(pageInput, 10) || currentPage)}
                  className="ai-page-jump-input"
                  aria-label="Jump to page number"
                />
                <span style={{ color: 'var(--text-muted)' }}>of {totalPages}</span>
              </form>
              <button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                style={{ padding: '0.3rem 0.55rem' }}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
              {citedPage === currentPage && (
                <span className="ai-cited-pill">
                  <Sparkles size={11} aria-hidden="true" /> Cited
                </span>
              )}
            </div>

            <div className="ai-viewer-controls">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setZoomFactor((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                disabled={zoomFactor <= 0.5}
                style={{ padding: '0.3rem 0.5rem' }}
                aria-label="Zoom out"
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setZoomFactor(1)}
                title="Reset zoom to Fit (100%)"
                style={{ fontSize: '0.76rem', fontWeight: 600, minWidth: '48px', padding: '0.28rem 0.45rem', justifyContent: 'center' }}
              >
                {Math.round(zoomFactor * 100)}%
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setZoomFactor((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
                disabled={zoomFactor >= 2.0}
                style={{ padding: '0.3rem 0.5rem' }}
                aria-label="Zoom in"
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>

          {/* Interactive Page Canvas */}
          <div
            ref={viewerBoxRef}
            style={{
              width: '100%',
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              paddingBottom: '0.25rem',
            }}
          >
            <div
              ref={containerRef}
              style={{
                position: 'relative',
                width: 'fit-content',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
                borderRadius: '0.375rem',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
              }}
            >
              <canvas ref={canvasRef} style={{ display: 'block' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const activePrompts =
    summary?.suggestedPrompts ||
    summary?.category?.prompts || [
      'What is the main summary of this document?',
      'List key highlights and figures',
      'What are the core conclusions?',
    ];

  return (
    <Workspace
      title="AI PDF Summarizer & Chat"
      icon={Bot}
      files={files}
      onFilesSelected={handleFilesSelected}
      onClear={handleClear}
      multiple={false}
      containerClassName="ai-chat-workspace"
      leftPane={leftPane}
    >
      {/* AI Engine Mode Switcher */}
      <div className="ai-engine-bar">
        <div className="ai-engine-header">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
            <Cpu size={14} style={{ color: 'var(--primary-color)' }} aria-hidden="true" />
            Local AI Engine
          </span>
          <span className="ai-engine-status" title={aiCapabilities.engineStatus}>
            <span className="ai-status-dot" aria-hidden="true" />
            {airGapped && <Lock size={11} aria-hidden="true" />}
            {compactEngineStatus}
          </span>
        </div>

        <div className="ai-segmented-control" role="group" aria-label="AI Engine Mode">
          <button
            type="button"
            className={`ai-segmented-btn ${aiEngineMode === 'extractive' ? 'active' : ''}`}
            aria-pressed={aiEngineMode === 'extractive'}
            onClick={() => setAiEngineMode('extractive')}
          >
            TF-IDF Fast
          </button>
          <button
            type="button"
            className={`ai-segmented-btn ${aiEngineMode === 'local-ai' ? 'active' : ''}`}
            aria-pressed={aiEngineMode === 'local-ai'}
            onClick={() => setAiEngineMode('local-ai')}
          >
            On-Device AI
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="ai-segmented-control" role="tablist" aria-label="AI Workspace Tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'summary'}
          className={`ai-segmented-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <BookOpen size={14} aria-hidden="true" /> Summary
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'chat'}
          className={`ai-segmented-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={14} aria-hidden="true" /> Q&A Chat ({messages.length})
        </button>
      </div>

      {/* Tab 1: Executive Summary */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {isAnalyzing ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 className="modal-spinner" size={24} style={{ marginBottom: '0.5rem' }} />
              <div>{statusText}</div>
            </div>
          ) : summary ? (
            <>
              {/* Category Badge & Export Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.12)', padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{summary.category?.icon || '📄'}</span> {summary.category?.label || 'General Document'}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    title="Export as Markdown (.md)"
                    className="btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.725rem', gap: '0.25rem' }}
                  >
                    <FileCode size={13} /> .MD
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    title="Export as PDF (.pdf)"
                    className="btn-primary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.725rem', gap: '0.25rem' }}
                  >
                    <Download size={13} /> .PDF
                  </button>
                </div>
              </div>

              {/* Document Stats Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Pages</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{summary.stats.totalPages}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Words</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{summary.stats.wordCount.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Read Time</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{summary.stats.readingTimeMinutes} min</div>
                </div>
              </div>

              {/* Overview */}
              <div className="options-group">
                <label className="options-label">Executive Overview</label>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.55, background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  {summary.overview}
                </div>
              </div>

              {/* Key Bullet Points */}
              <div className="options-group">
                <label className="options-label">Key Highlights</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {summary.keyPoints.map((point, idx) => (
                    <div key={idx} style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', gap: '0.45rem', lineHeight: 1.45 }}>
                      <CornerDownRight size={14} style={{ color: 'var(--primary-color)', flexShrink: 0, marginTop: '3px' }} />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Topics */}
              {summary.topTopics.length > 0 && (
                <div className="options-group">
                  <label className="options-label">Main Topics & Entities</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {summary.topTopics.map((topic, i) => (
                      <span key={i} style={{ background: 'rgba(99, 102, 241, 0.14)', color: 'var(--text-main)', border: '1px solid rgba(99, 102, 241, 0.28)', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.74rem' }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Tab 2: Interactive Q&A Chat */}
      {activeTab === 'chat' && (
        <div className="ai-chat-shell">
          {/* Compact Chat Toolbar */}
          <div className="ai-chat-toolbar">
            <button
              type="button"
              className="ai-prompts-toggle"
              onClick={() => setShowPrompts((v) => !v)}
              aria-expanded={showPrompts}
            >
              <span>Suggested Prompts</span>
              {showPrompts ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="ai-action-icon-btn"
                title="Export transcript as Markdown"
              >
                <FileCode size={12} /> .MD
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                className="ai-action-icon-btn"
                title="Export transcript as PDF"
              >
                <Download size={12} /> .PDF
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="ai-action-icon-btn"
                title="Clear chat history"
                aria-label="Clear chat history"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Collapsible Prompt Chips */}
          {showPrompts && (
            <div className="ai-prompt-chips">
              {activePrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  className="ai-prompt-chip"
                  onClick={() => handleSendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable Chat Messages Thread */}
          <div ref={chatScrollRef} className="ai-chat-messages">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const { mainText, contextExcerpt } = isUser
                ? { mainText: msg.text, contextExcerpt: '' }
                : parseAiAnswerForDisplay(msg.text);
              const paragraphs = mainText.split(/\n+/).filter(Boolean);

              return (
                <div
                  key={msg.id}
                  className={`ai-msg-bubble ${isUser ? 'ai-msg-user' : 'ai-msg-assistant'}`}
                >
                  <div className="ai-msg-paragraphs">
                    {paragraphs.map((para, pIdx) => (
                      <p key={pIdx} style={{ margin: 0 }}>
                        {renderInlineBold(para, `${msg.id}_${pIdx}`)}
                      </p>
                    ))}
                  </div>

                  {msg.engineLabel && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--primary-color)', marginTop: '0.4rem', fontWeight: 600 }}>
                      ⚡ {msg.engineLabel}
                    </div>
                  )}

                  {contextExcerpt && (
                    <details className="ai-context-details">
                      <summary>Source excerpt</summary>
                      <div className="ai-context-excerpt">{contextExcerpt}</div>
                    </details>
                  )}

                  <div className="ai-msg-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {msg.relevantPageNum && (
                        <button
                          type="button"
                          onClick={() => goToPage(msg.relevantPageNum, { fromCitation: true })}
                          className="ai-page-pill"
                        >
                          Page {msg.relevantPageNum}
                        </button>
                      )}
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg)}
                          className="ai-action-icon-btn"
                          aria-label="Copy answer"
                        >
                          {copiedMsgId === msg.id ? <Check size={11} /> : <Copy size={11} />}
                          {copiedMsgId === msg.id ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '0.66rem', opacity: 0.65 }}>{msg.time}</span>
                  </div>
                </div>
              );
            })}

            {isThinking && (
              <div className="ai-msg-bubble ai-msg-assistant" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)' }}>
                <Loader2 className="modal-spinner" size={14} /> Analyzing document locally...
              </div>
            )}
          </div>

          {/* Chat Composer */}
          <div className="ai-chat-composer">
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask a question about this PDF..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              aria-label="Ask a question about this PDF"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => handleSendMessage()}
              disabled={isThinking || !inputQuery.trim()}
              style={{ height: '36px', width: '36px', minWidth: '36px', padding: 0, borderRadius: '8px', flexShrink: 0 }}
              aria-label="Send question"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </Workspace>
  );
}
