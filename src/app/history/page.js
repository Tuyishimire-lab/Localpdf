'use client';

export const dynamic = 'force-static';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, Trash2, FileText, ExternalLink } from 'lucide-react';
import { getHistory, clearHistory, formatBytes, formatDate } from '../../lib/history';

const TOOL_ICONS = {
  compress: '🗜️', merge: '📎', split: '✂️', edit: '✏️', ocr: '🔍',
  'pdf-to-jpg': '🖼️', 'jpg-to-pdf': '📄', sign: '✍️', rotate: '🔄',
  watermark: '💧', 'page-numbers': '#️⃣', protect: '🔒', unlock: '🔓',
  'word-to-pdf': '📝', organize: '📋', 'pdf-to-word': '📃', flatten: '📄',
  compare: '⚖️', repair: '🔧', 'pdf-to-excel': '📊',
};

export default function HistoryPage() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(getHistory());
  }, []);

  const handleClear = () => {
    if (confirm('Clear all processing history?')) {
      clearHistory();
      setEntries([]);
    }
  };

  return (
    <div className="blog-container" style={{ maxWidth: '860px' }}>
      <div className="tool-header" style={{ marginBottom: '2rem' }}>
        <div className="tool-icon-wrap"><History size={28} /></div>
        <div>
          <h1 className="tool-title">Processing History</h1>
          <p className="tool-subtitle">Recent files processed on this device. Stored locally, never sent anywhere.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="history-empty">
          <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p>No history yet. Process a file using any tool and it will appear here.</p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-flex', marginTop: '1rem' }}>Browse Tools</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn-ghost" onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <Trash2 size={15} /> Clear History
            </button>
          </div>
          <div className="history-list">
            {entries.map((entry) => (
              <div key={entry.id} className="history-entry">
                <div className="history-entry-icon">{TOOL_ICONS[entry.tool] || '📄'}</div>
                <div className="history-entry-info">
                  <p className="history-entry-file">{entry.fileName}</p>
                  <p className="history-entry-meta">
                    <span className="history-entry-tool">{entry.toolLabel}</span>
                    {entry.inputSize && <span>· {formatBytes(entry.inputSize)}</span>}
                    {entry.outputSize && <span>→ {formatBytes(entry.outputSize)}</span>}
                    <span>· {formatDate(entry.date)}</span>
                  </p>
                </div>
                <Link href={`/tools/${entry.tool}`} className="history-entry-link" title="Open tool again">
                  <ExternalLink size={16} />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
