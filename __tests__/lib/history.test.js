/**
 * @jest-environment node
 *
 * Unit tests for src/lib/history.js
 */
import {
  addHistoryEntry,
  getHistory,
  clearHistory,
  formatBytes,
  formatDate,
} from '../../src/lib/history.js';

function makeLocalStorage() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe('history formatBytes', () => {
  test('returns dash for falsy values', () => {
    expect(formatBytes(0)).toBe('—');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(undefined)).toBe('—');
  });

  test('formats bytes below 1 KB', () => {
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  test('formats kilobytes with one decimal place', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  test('formats megabytes with two decimal places', () => {
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(1572864)).toBe('1.50 MB');
  });
});

describe('history formatDate', () => {
  test('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2026-07-31T10:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('includes the year in the formatted output', () => {
    const result = formatDate('2026-07-31T10:00:00.000Z');
    expect(result).toMatch(/2026/);
  });

  test('handles different dates without throwing', () => {
    expect(() => formatDate('2020-01-01T00:00:00.000Z')).not.toThrow();
    expect(() => formatDate('2030-12-31T23:59:59.999Z')).not.toThrow();
  });
});

describe('history localStorage utilities', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = makeLocalStorage();
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

  test('addHistoryEntry stores an entry and prepends newest first', () => {
    addHistoryEntry({ tool: 'merge', toolLabel: 'Merge', fileName: 'a.pdf', inputSize: 100, outputSize: 90 });
    addHistoryEntry({ tool: 'split', toolLabel: 'Split', fileName: 'b.pdf', inputSize: 200, outputSize: 180 });
    const history = getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].tool).toBe('split');
    expect(history[1].tool).toBe('merge');
  });

  test('addHistoryEntry caps at MAX_ENTRIES (50)', () => {
    for (let i = 0; i < 55; i++) {
      addHistoryEntry({ tool: 'compress', toolLabel: 'Compress', fileName: `file${i}.pdf`, inputSize: i, outputSize: i });
    }
    expect(getHistory().length).toBe(50);
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
