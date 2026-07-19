/**
 * Triggers a client-side file download for a blob.
 * @param {Blob} blob 
 * @param {string} filename 
 */
export function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Formats a size in bytes to a human-readable string.
 * @param {number} bytes 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Parses a page range string (e.g. "1-3, 5, 8-10") and returns an array of 1-indexed page numbers.
 * @param {string} rangeStr 
 * @param {number} maxPages 
 * @returns {number[]}
 */
export function parsePageRanges(rangeStr, maxPages) {
  if (!rangeStr || !rangeStr.trim()) {
    // Return all pages if empty
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }

  const pages = new Set();
  const parts = rangeStr.split(',');

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      let start = parseInt(startStr, 10);
      let end = parseInt(endStr, 10);

      if (isNaN(start)) start = 1;
      if (isNaN(end)) end = maxPages;

      // Handle reverse ranges (e.g. 5-3)
      const min = Math.max(1, Math.min(start, end));
      const max = Math.min(maxPages, Math.max(start, end));

      for (let i = min; i <= max; i++) {
        pages.add(i);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        pages.add(pageNum);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}
