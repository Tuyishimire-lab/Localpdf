/**
 * @jest-environment node
 *
 * history.js formatBytes and formatDate are pure functions with no browser
 * dependency — run them in Node to avoid jsdom overhead.
 * addHistoryEntry / getHistory / clearHistory use localStorage and are
 * covered by the E2E tests (they run in a real browser context).
 */
import { formatBytes, formatDate } from '../../src/lib/history.js';

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
