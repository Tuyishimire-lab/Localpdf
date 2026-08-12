'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Sparkles, Send, FileText, BookOpen, Clock, ChevronLeft, ChevronRight, MessageSquare, ListFilter, CornerDownRight, Loader2, Download, FileCode } from 'lucide-react';
import Workspace from '../Workspace';
import { loadPdf } from '../../../lib/pdfEngine';
import { downloadFile } from '../../../lib/utils';
import { addHistoryEntry } from '../../../lib/history';
import { parsePdfTextChunks, generateDocumentSummary, answerDocumentQuestion, exportReportToMarkdown, exportReportToPdf } from '../../../lib/localAiEngine';

export default function AiChatTool() {
  const [files, setFiles] = useState([]);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
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

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const chatEndRef = useRef(null);
  const chunkCacheRef = useRef({});  // Fix 9: file fingerprint → { pdfDoc, chunks, summary }

  const handleFilesSelected = async (selectedFiles) => {
    const targetFile = selectedFiles[0];
    if (!targetFile) return;

    setFiles([targetFile]);
    setCurrentPage(1);
    setChunks([]);
    setSummary(null);
    setMessages([]);
    setInputQuery('');

    // Fix 9: Check fingerprint cache before running the full extraction pipeline
    const fingerprint = `${targetFile.name}::${targetFile.size}::${targetFile.lastModified}`;
    const cached = chunkCacheRef.current[fingerprint];
    if (cached) {
      setPdfDoc(cached.pdfDoc);
      setTotalPages(cached.pdfDoc.numPages);
      setChunks(cached.chunks);
      setSummary(cached.summary);
      setMessages([{
        id: 1,
        sender: 'ai',
        text: `Welcome back! "${targetFile.name}" is already indexed (${cached.pdfDoc.numPages} pages). Ask me anything!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      return;
    }

    setIsLoadingPdf(true);
    setIsAnalyzing(true);
    setStatusText('Indexing document & extracting text...');

    try {
      const doc = await loadPdf(targetFile);
      setPdfDoc(doc);
      setTotalPages(doc.numPages);

      // Parse text chunks with Auto-OCR fallback callback
      const extractedChunks = await parsePdfTextChunks(doc, (prog) => {
        if (prog && prog.status) {
          setStatusText(prog.status);
        }
      });
      setChunks(extractedChunks);

      const docSummary = generateDocumentSummary(extractedChunks, doc.numPages);
      setSummary(docSummary);

      const categoryLabel = docSummary.category ? ` [${docSummary.category.label}]` : '';
      const ocrNotice = docSummary.stats?.isScannedOcr ? ' (OCR auto-extracted scanned text)' : '';

      setMessages([
        {
          id: 1,
          sender: 'ai',
          text: `Hello! I've indexed "${targetFile.name}" (${doc.numPages} pages)${categoryLabel}${ocrNotice}. Ask me anything about this document!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // Fix 9: Save to cache, evicting oldest entry if cache is full (max 3 entries)
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
      alert('Failed to load PDF file.');
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
    setChunks([]);
    setSummary(null);
    setMessages([]);
    setInputQuery('');
  };

  // Render current PDF page on canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const containerWidth = containerRef.current ? Math.min(containerRef.current.clientWidth || 650, 700) : 600;
      const desiredScale = Math.min(1.4, Math.max(0.8, containerWidth / unscaledViewport.width));

      const viewport = page.getViewport({ scale: desiredScale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      renderCurrentPage();
    }
  }, [pdfDoc, currentPage, renderCurrentPage]);

  const setCanvasRef = useCallback(
    (node) => {
      canvasRef.current = node;
      if (node && pdfDoc) {
        renderCurrentPage();
      }
    },
    [pdfDoc, renderCurrentPage]
  );

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Handle Question Submit – async to yield the main thread before scoring (Fix 6)
  const handleSendMessage = async (queryText) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || !pdfDoc) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsThinking(true);
    setActiveTab('chat');

    // Yield to the browser so React can paint the "thinking" indicator before scoring (Fix 6)
    await new Promise((resolve) => setTimeout(resolve, 0));

    const { answer, relevantPageNum } = answerDocumentQuestion(textToSend, chunks);

    const aiMsg = {
      id: Date.now() + 1,
      sender: 'ai',
      text: answer,
      relevantPageNum,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsThinking(false);

    if (relevantPageNum) {
      setCurrentPage(relevantPageNum);
    }
  };

  const handleJumpToPage = (pageNum) => {
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  // Export handlers
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

  // Left Pane: Document Viewer & Page Navigation
  const leftPane = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
      {isLoadingPdf || !pdfDoc ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', width: '100%', gap: '0.75rem', color: '#94a3b8' }}>
          <Loader2 className="modal-spinner" size={36} />
          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{statusText}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
          {/* Page Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'var(--surface-color, #1e293b)', padding: '0.65rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color, #334155)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                className="btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '0.3rem 0.6rem' }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '95px', textAlign: 'center' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn-secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '0.3rem 0.6rem' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Sparkles size={14} /> 100% Local AI (Zero Uploads)
            </div>
          </div>

          {/* Interactive Page Canvas */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              margin: '0 auto',
              display: 'inline-block',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
              borderRadius: '0.375rem',
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              minWidth: '320px',
              minHeight: '420px',
            }}
          >
            <canvas ref={setCanvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
          </div>
        </div>
      )}
    </div>
  );

  const activePrompts = summary?.category?.prompts || [
    'What is the main summary?',
    'Summarize key obligations & numbers',
    'List core conclusions',
  ];

  return (
    <Workspace
      title="AI PDF Summarizer & Chat"
      icon={Bot}
      files={files}
      onFilesSelected={handleFilesSelected}
      onClear={handleClear}
      multiple={false}
      leftPane={leftPane}
    >
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn-secondary ${activeTab === 'summary' ? 'btn-active' : ''}`}
          onClick={() => setActiveTab('summary')}
          style={{ flex: 1, borderColor: activeTab === 'summary' ? 'var(--primary-color)' : '', fontSize: '0.85rem' }}
        >
          <BookOpen size={14} style={{ marginRight: '0.35rem' }} /> Summary
        </button>
        <button
          className={`btn-secondary ${activeTab === 'chat' ? 'btn-active' : ''}`}
          onClick={() => setActiveTab('chat')}
          style={{ flex: 1, borderColor: activeTab === 'chat' ? 'var(--primary-color)' : '', fontSize: '0.85rem' }}
        >
          <MessageSquare size={14} style={{ marginRight: '0.35rem' }} /> Q&A Chat ({messages.length})
        </button>
      </div>

      {/* Tab 1: Executive Summary */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isAnalyzing ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
              <Loader2 className="modal-spinner" size={24} style={{ marginBottom: '0.5rem' }} />
              <div>{statusText}</div>
            </div>
          ) : summary ? (
            <>
              {/* Category Badge & Export Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.12)', padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>{summary.category?.icon || '📄'}</span> {summary.category?.label || 'General Document'}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    title="Export as Markdown (.md)"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.725rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <FileCode size={13} /> .MD
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    title="Export as PDF (.pdf)"
                    style={{ background: 'var(--primary-color)', border: 'none', color: '#ffffff', borderRadius: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.725rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <Download size={13} /> .PDF
                  </button>
                </div>
              </div>

              {/* Document Stats Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pages</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{summary.stats.totalPages}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Words</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{summary.stats.wordCount.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Read Time</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{summary.stats.readingTimeMinutes} min</div>
                </div>
              </div>

              {/* Overview */}
              <div className="options-group">
                <label className="options-label">Executive Overview</label>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.375rem' }}>
                  {summary.overview}
                </div>
              </div>

              {/* Key Bullet Points */}
              <div className="options-group">
                <label className="options-label">Key Highlights</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {summary.keyPoints.map((point, idx) => (
                    <div key={idx} style={{ fontSize: '0.8125rem', color: '#cbd5e1', display: 'flex', gap: '0.4rem', lineHeight: 1.4 }}>
                      <CornerDownRight size={14} style={{ color: 'var(--primary-color)', flexShrink: 0, marginTop: '2px' }} />
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
                      <span key={i} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '450px' }}>
          {/* Category-Tailored Suggested Prompt Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
            {activePrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  borderRadius: '1rem',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                💡 {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Thread */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                  background: msg.sender === 'user' ? 'var(--primary-color)' : 'rgba(30, 41, 59, 0.9)',
                  color: '#ffffff',
                  padding: '0.65rem 0.85rem',
                  borderRadius: msg.sender === 'user' ? '0.75rem 0.75rem 0 0.75rem' : '0.75rem 0.75rem 0.75rem 0',
                  fontSize: '0.825rem',
                  lineHeight: 1.45,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                }}
              >
                <div>{msg.text}</div>
                {msg.relevantPageNum && (
                  <button
                    onClick={() => handleJumpToPage(msg.relevantPageNum)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#6ee7b7',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.725rem',
                      marginTop: '0.4rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    📖 Jump to Page {msg.relevantPageNum}
                  </button>
                )}
                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.25rem', textAlign: 'right' }}>
                  {msg.time}
                </div>
              </div>
            ))}

            {isThinking && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(30, 41, 59, 0.9)', color: '#94a3b8', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Loader2 className="modal-spinner" size={14} /> AI is analyzing document...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Field */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center', width: '100%', flexShrink: 0 }}>
            <input
              type="text"
              className="options-input"
              placeholder="Ask a question about this PDF..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', height: '42px', background: 'var(--bg-input, #0f172a)', color: '#ffffff', border: '1px solid var(--border-color, #334155)', borderRadius: '0.375rem', padding: '0 0.85rem' }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => handleSendMessage()}
              disabled={isThinking || !inputQuery.trim()}
              style={{ height: '42px', width: '42px', minWidth: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '0.375rem' }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </Workspace>
  );
}
