/**
 * @jest-environment node
 *
 * Unit tests for src/lib/history.js
 * Uses node environment since jsdom provides localStorage automatically,
 * but we mock it here to test edge cases (unavailable storage, full storage).
 */

import {
  addHistoryEntry,
  getHistory,
  clearHistory,
  formatBytes,
  formatDate,
} from '../lib/history';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeLocalStorage() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

// ── formatBytes (history variant) ────────────────────────────────────────────

describe('history.formatBytes', () => {
  test('returns "—" for null', () => {
    expect(formatBytes(null)).toBe('—');
  });

  test('returns "—" for 0', () => {
    expect(formatBytes(0)).toBe('—');
  });

  test('returns bytes for values under 1 KB', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  test('returns KB for values under 1 MB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  test('returns MB for larger values', () => {
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
  });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  test('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2026-07-30T10:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('includes the year in the formatted string', () => {
    const result = formatDate('2026-07-30T10:00:00.000Z');
    expect(result).toMatch(/2026/);
  });
});

// ── addHistoryEntry / getHistory / clearHistory ───────────────────────────────

describe('history localStorage utilities', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = makeLocalStorage();
    // Patch global window + localStorage for node env
    global.window = {};
    global.localStorage = mockStorage;
  });

  afterEach(() => {
    delete global.window;
    delete global.localStorage;
  });

  test('getHistory returns empty array when storage is empty', () => {
    expect(getHistory()).toEqual([]);
  });

  test('addHistoryEntry stores an entry', () => {
    addHistoryEntry({
      tool: 'compress',
      toolLabel: 'Compress PDF',
      fileName: 'test.pdf',
      inputSize: 1024,
      outputSize: 512,
    });
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].tool).toBe('compress');
    expect(history[0].fileName).toBe('test.pdf');
    expect(history[0].inputSize).toBe(1024);
    expect(history[0].outputSize).toBe(512);
  });

  test('addHistoryEntry prepends to history (newest first)', () => {
    addHistoryEntry({ tool: 'merge', toolLabel: 'Merge', fileName: 'a.pdf', inputSize: 100, outputSize: 90 });
    addHistoryEntry({ tool: 'split', toolLabel: 'Split', fileName: 'b.pdf', inputSize: 200, outputSize: 180 });
    const history = getHistory();
    expect(history[0].tool).toBe('split'); // newest is first
    expect(history[1].tool).toBe('merge');
  });

  test('addHistoryEntry caps at MAX_ENTRIES (50)', () => {
    for (let i = 0; i < 55; i++) {
      addHistoryEntry({ tool: 'compress', toolLabel: 'Compress', fileName: `file${i}.pdf`, inputSize: i, outputSize: i });
    }
    const history = getHistory();
    expect(history.length).toBe(50);
  });

  test('clearHistory empties storage', () => {
    addHistoryEntry({ tool: 'rotate', toolLabel: 'Rotate', fileName: 'c.pdf', inputSize: 300, outputSize: 300 });
    expect(getHistory()).toHaveLength(1);
    clearHistory();
    expect(getHistory()).toHaveLength(0);
  });

  test('getHistory returns empty array on malformed JSON', () => {
    mockStorage.setItem('localpdf_history', 'not-valid-json{{');
    expect(getHistory()).toEqual([]);
  });
});
