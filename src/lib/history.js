/**
 * history.js – localStorage-based processing history utility
 * Tracks tool usage: tool name, file name, input/output sizes, date.
 */

const HISTORY_KEY = 'localpdf_history';
const MAX_ENTRIES = 50;

export function addHistoryEntry({ tool, toolLabel, fileName, inputSize, outputSize }) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getHistory();
    const entry = {
      id: Date.now(),
      tool,
      toolLabel,
      fileName,
      inputSize,   // bytes
      outputSize,  // bytes (null if not applicable)
      date: new Date().toISOString(),
    };
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable (private browsing, storage full)
  }
}

export function getHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
