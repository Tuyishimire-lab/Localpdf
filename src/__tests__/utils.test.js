/**
 * @jest-environment node
 *
 * Unit tests for src/lib/utils.js
 * Pure functions — no DOM or browser APIs needed, so we use the node environment.
 */

import { formatBytes, parsePageRanges } from '../lib/utils';

// ── formatBytes ──────────────────────────────────────────────────────────────

describe('formatBytes', () => {
  test('returns "0 Bytes" for zero', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  test('formats bytes correctly (under 1 KB)', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  test('formats kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  test('formats megabytes correctly', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(2621440)).toBe('2.5 MB');
  });

  test('formats gigabytes correctly', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  test('respects custom decimal places', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
    expect(formatBytes(1536, 3)).toBe('1.5 KB');
  });

  test('handles negative decimals as 0 decimals', () => {
    expect(formatBytes(1536, -1)).toBe('2 KB');
  });
});

// ── parsePageRanges ──────────────────────────────────────────────────────────

describe('parsePageRanges', () => {
  test('returns all pages when input is empty string', () => {
    expect(parsePageRanges('', 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test('returns all pages when input is null/undefined', () => {
    expect(parsePageRanges(null, 3)).toEqual([1, 2, 3]);
    expect(parsePageRanges(undefined, 3)).toEqual([1, 2, 3]);
  });

  test('returns all pages when input is whitespace only', () => {
    expect(parsePageRanges('   ', 4)).toEqual([1, 2, 3, 4]);
  });

  test('parses a single page number', () => {
    expect(parsePageRanges('3', 10)).toEqual([3]);
  });

  test('parses a simple range', () => {
    expect(parsePageRanges('2-4', 10)).toEqual([2, 3, 4]);
  });

  test('parses multiple comma-separated pages', () => {
    expect(parsePageRanges('1, 3, 5', 10)).toEqual([1, 3, 5]);
  });

  test('parses a mix of single pages and ranges', () => {
    expect(parsePageRanges('1-3, 5, 8-10', 10)).toEqual([1, 2, 3, 5, 8, 9, 10]);
  });

  test('handles reverse ranges (e.g. "5-3" means pages 3, 4, 5)', () => {
    expect(parsePageRanges('5-3', 10)).toEqual([3, 4, 5]);
  });

  test('clamps page numbers to [1, maxPages]', () => {
    expect(parsePageRanges('0-15', 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('ignores out-of-range single page numbers', () => {
    expect(parsePageRanges('0, 11', 10)).toEqual([]);
  });

  test('deduplicates overlapping ranges', () => {
    // "1-3, 2-4" should give [1, 2, 3, 4], not duplicates
    expect(parsePageRanges('1-3, 2-4', 10)).toEqual([1, 2, 3, 4]);
  });

  test('returns a sorted result', () => {
    expect(parsePageRanges('5, 1, 3', 10)).toEqual([1, 3, 5]);
  });
});
