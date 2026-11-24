/**
 * pdfLayout.js – Column-aware PDF text layout extraction for PDF-to-Word & diffing.
 */

function buildLinesFromItems(items) {
  if (!items || items.length === 0) return [];

  const sizes = items.map((it) => it.fontSize).sort((a, b) => a - b);
  const medianSize = sizes[Math.floor(sizes.length / 2)] || 12;

  // Group into horizontal bands top-to-bottom (higher PDF Y is higher on page)
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rowGroups = [];

  for (const item of sorted) {
    const tol = Math.max(4, item.fontSize * 0.42);
    const existingRow = rowGroups.find((row) => Math.abs(row.y - item.y) <= tol);
    if (existingRow) {
      existingRow.items.push(item);
      existingRow.y =
        existingRow.items.reduce((sum, it) => sum + it.y, 0) / existingRow.items.length;
    } else {
      rowGroups.push({ y: item.y, items: [item] });
    }
  }

  return rowGroups
    .sort((a, b) => b.y - a.y)
    .map((row) => {
      row.items.sort((a, b) => a.x - b.x);
      let joined = '';
      let prevEnd = null;
      let maxFont = 0;

      for (const piece of row.items) {
        const str = piece.str;
        if (!str) continue;
        maxFont = Math.max(maxFont, piece.fontSize);
        if (prevEnd !== null && piece.x - prevEnd > piece.fontSize * 0.18 && !joined.endsWith(' ') && !str.startsWith(' ')) {
          joined += ' ';
        }
        joined += str;
        prevEnd = piece.x + (piece.width || str.length * piece.fontSize * 0.45);
      }

      const text = joined.replace(/\s+/g, ' ').trim();
      const isHeading =
        Boolean(text) &&
        text.length < 140 &&
        (maxFont >= medianSize * 1.2 || (text.length < 70 && /^[A-Z0-9][A-Z0-9\s:.-]{2,}$/.test(text)));

      return { text, fontSize: maxFont || medianSize, isHeading };
    })
    .filter((line) => line.text.length > 0);
}

export function extractStructuredLines(textItems = [], pageWidth = 612) {
  const normalized = (textItems || [])
    .filter((item) => item && typeof item.str === 'string' && item.str.trim().length > 0 && Array.isArray(item.transform))
    .map((item) => {
      const a = item.transform[0] ?? 12;
      const b = item.transform[1] ?? 0;
      const fontSize = Math.hypot(a, b) || 12;
      return {
        str: item.str,
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        width: Number.isFinite(item.width) ? item.width : 0,
        fontSize,
      };
    });

  const totalChars = normalized.reduce((acc, item) => acc + item.str.trim().length, 0);
  if (normalized.length === 0) {
    return { lines: [], totalChars: 0, isLikelyScanned: true, columnCount: 1 };
  }

  let columnCount = 1;
  let orderedLines = [];

  if (pageWidth > 0 && normalized.length >= 8) {
    const mid = pageWidth / 2;
    const gutterHalf = 10;
    const crossing = normalized.filter(
      (it) => it.x < mid - gutterHalf && it.x + it.width > mid + gutterHalf
    );
    const leftItems = normalized.filter((it) => it.x + it.width <= mid + gutterHalf);
    const rightItems = normalized.filter((it) => it.x >= mid - gutterHalf && !(it.x < mid - gutterHalf));

    const minColItems = Math.max(3, Math.floor(normalized.length * 0.25));
    if (
      crossing.length <= Math.floor(normalized.length * 0.05) &&
      leftItems.length >= minColItems &&
      rightItems.length >= minColItems
    ) {
      columnCount = 2;
      orderedLines = [...buildLinesFromItems(leftItems), ...buildLinesFromItems(rightItems)];
    }
  }

  if (columnCount === 1) {
    orderedLines = buildLinesFromItems(normalized);
  }

  return {
    lines: orderedLines,
    totalChars,
    isLikelyScanned: totalChars < 20,
    columnCount,
  };
}

