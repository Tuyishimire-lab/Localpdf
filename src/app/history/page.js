'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { History, Trash2, FileText, ExternalLink } from 'lucide-react';
import { getHistory, clearHistory, formatBytes, formatDate, getHistoryStats, HISTORY_EVENT } from '../../lib/history';
import { toast } from '../../context/ToastContext';

const EMPTY_ENTRIES = [];
let cachedRaw;
let cachedParsed = EMPTY_ENTRIES;

function subscribeHistory(callback) {
  window.addEventListener(HISTORY_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(HISTORY_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getHistorySnapshot() {
  if (typeof window === 'undefined') return EMPTY_ENTRIES;
  const raw = localStorage.getItem('localpdf_history');
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  cachedParsed = getHistory();
  return cachedParsed;
}

function getHistoryServerSnapshot() {
  return EMPTY_ENTRIES;
}

const TOOL_ICONS = {
  compress: '🗜️', merge: '📎', split: '✂️', edit: '✏️', ocr: '🔍',
  'pdf-to-jpg': '🖼️', 'jpg-to-pdf': '📄', sign: '✍️', rotate: '🔄',
  watermark: '💧', 'page-numbers': '#️⃣', protect: '🔒', unlock: '🔓',
  'word-to-pdf': '📝', organize: '📋', 'pdf-to-word': '📃', flatten: '📄',
  compare: '⚖️', repair: '🔧', redact: '⬛', 'ai-chat': '🤖',
  'pdf-to-excel': '📊', crop: '✂️', 'extract-images': '🖼️', 'fill-form': '📝',
  metadata: '🏷️', 'bates-numbering': '⚖️', 'split-by-size': '📦', grayscale: '🖨️',
  recipes: '⚡',
};

export default function HistoryPage() {
  const entries = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getHistoryServerSnapshot);
  const [confirmClear, setConfirmClear] = useState(false);
  const stats = getHistoryStats(entries);

  const handleConfirmClear = () => {
    clearHistory();
    cachedRaw = undefined;
    cachedParsed = EMPTY_ENTRIES;
    window.dispatchEvent(new Event(HISTORY_EVENT));
    setConfirmClear(false);
    toast.success('Processing history cleared.');
  };

  return (
    <div className="blog-container" style={{ maxWidth: '860px' }}>
      <div className="tool-header" style={{ marginBottom: '2rem' }}>
        <div className="tool-icon-wrap"><History size={28} aria-hidden="true" /></div>
        <div>
          <h1 className="tool-title">Processing History</h1>
          <p className="tool-subtitle">Recent files processed on this device. Stored locally, never sent anywhere.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="history-empty">
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} aria-hidden="true" />
          <p>No history yet. Process a file using any tool and it will appear here.</p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-flex', marginTop: '1rem', width: 'auto' }}>Browse Tools</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.9rem 1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Files Processed</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-color)', marginTop: '0.2rem' }}>{stats.totalRuns}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.9rem 1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Space Saved</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--success-color)', marginTop: '0.2rem' }}>{formatBytes(stats.totalSavedBytes)}</div>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.9rem 1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Used Tool</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.topToolLabel}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
            {!confirmClear ? (
              <button type="button" className="btn-ghost" onClick={() => setConfirmClear(true)}>
                <Trash2 size={15} aria-hidden="true" /> Clear History
              </button>
            ) : (
              <>
                <button type="button" className="btn-ghost" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleConfirmClear}
                  style={{ color: 'var(--error-color)', borderColor: 'rgba(255, 107, 129, 0.35)' }}
                >
                  Confirm Clear
                </button>
              </>
            )}
          </div>
          <div className="history-list">
            {entries.map((entry) => (
              <div key={entry.id} className="history-entry">
                <div className="history-entry-icon" aria-hidden="true">{TOOL_ICONS[entry.tool] || '📄'}</div>
                <div className="history-entry-info">
                  <p className="history-entry-file">{entry.fileName}</p>
                  <p className="history-entry-meta">
                    <span className="history-entry-tool">{entry.toolLabel}</span>
                    {entry.inputSize && <span>· {formatBytes(entry.inputSize)}</span>}
                    {entry.outputSize && <span>→ {formatBytes(entry.outputSize)}</span>}
                    <span>· {formatDate(entry.date)}</span>
                  </p>
                </div>
                <Link href={`/tools/${entry.tool}`} className="history-entry-link" title="Open tool again" aria-label={`Open ${entry.toolLabel}`}>
                  <ExternalLink size={16} aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
