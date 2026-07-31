import { formatBytes, parsePageRanges } from '../../src/lib/utils.js';

// downloadFile is browser-only (uses document/URL); skip it in jest/jsdom.

describe('formatBytes', () => {
  test('returns "0 Bytes" for 0', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  test('formats bytes correctly', () => {
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
});

describe('parsePageRanges', () => {
  test('returns all pages for an empty string', () => {
    expect(parsePageRanges('', 5)).toEqual([1, 2, 3, 4, 5]);
  });

  test('returns all pages for null/undefined input', () => {
    expect(parsePageRanges(null, 3)).toEqual([1, 2, 3]);
    expect(parsePageRanges(undefined, 3)).toEqual([1, 2, 3]);
  });

  test('parses a single page number', () => {
    expect(parsePageRanges('3', 10)).toEqual([3]);
  });

  test('parses a simple range', () => {
    expect(parsePageRanges('1-5', 10)).toEqual([1, 2, 3, 4, 5]);
  });

  test('parses a comma-separated list', () => {
    expect(parsePageRanges('1, 3, 5', 10)).toEqual([1, 3, 5]);
  });

  test('parses mixed ranges and single pages', () => {
    expect(parsePageRanges('1-3, 5, 8-10', 10)).toEqual([1, 2, 3, 5, 8, 9, 10]);
  });

  test('handles reverse ranges (e.g. 5-3) by sorting', () => {
    expect(parsePageRanges('5-3', 10)).toEqual([3, 4, 5]);
  });

  test('clamps to maxPages upper bound', () => {
    expect(parsePageRanges('8-15', 10)).toEqual([8, 9, 10]);
  });

  test('ignores page numbers out of range', () => {
    expect(parsePageRanges('99', 10)).toEqual([]);
  });

  test('clamps to 1 as lower bound', () => {
    expect(parsePageRanges('0-3', 10)).toEqual([1, 2, 3]);
  });

  test('deduplicates overlapping ranges', () => {
    expect(parsePageRanges('1-3, 2-4', 10)).toEqual([1, 2, 3, 4]);
  });

  test('returns sorted results regardless of input order', () => {
    expect(parsePageRanges('9, 1, 5', 10)).toEqual([1, 5, 9]);
  });
});
