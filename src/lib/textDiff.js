/**
 * textDiff.js – Line-level LCS text diffing and self-contained HTML diff reports.
 */

export function escapeReportHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function simpleLineDiff(linesA, linesB) {
  const maxLen = Math.max(linesA.length, linesB.length);
  const entries = [];
  let addedCount = 0;
  let removedCount = 0;

  for (let i = 0; i < maxLen; i++) {
    const a = linesA[i];
    const b = linesB[i];
    if (a === b && a !== undefined) {
      entries.push({ type: 'same', text: a, lineA: i + 1, lineB: i + 1 });
    } else {
      if (a !== undefined) {
        entries.push({ type: 'removed', text: a, lineA: i + 1, lineB: null });
        removedCount++;
      }
      if (b !== undefined) {
        entries.push({ type: 'added', text: b, lineA: null, lineB: i + 1 });
        addedCount++;
      }
    }
  }
  return { entries, addedCount, removedCount };
}

export function diffLines(linesA = [], linesB = []) {
  const a = Array.isArray(linesA) ? linesA : [];
  const b = Array.isArray(linesB) ? linesB : [];
  const m = a.length;
  const n = b.length;

  // Guard against quadratic memory spikes on massive pages
  if (m * n > 250000) {
    return simpleLineDiff(a, b);
  }

  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = dp[i + 1][j] >= dp[i][j + 1] ? dp[i + 1][j] : dp[i][j + 1];
      }
    }
  }

  const entries = [];
  let i = 0;
  let j = 0;
  let addedCount = 0;
  let removedCount = 0;

  while (i < m && j < n) {
    if (a[i] === b[j]) {
      entries.push({ type: 'same', text: a[i], lineA: i + 1, lineB: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      entries.push({ type: 'removed', text: a[i], lineA: i + 1, lineB: null });
      removedCount++;
      i++;
    } else {
      entries.push({ type: 'added', text: b[j], lineA: null, lineB: j + 1 });
      addedCount++;
      j++;
    }
  }

  while (i < m) {
    entries.push({ type: 'removed', text: a[i], lineA: i + 1, lineB: null });
    removedCount++;
    i++;
  }
  while (j < n) {
    entries.push({ type: 'added', text: b[j], lineA: null, lineB: j + 1 });
    addedCount++;
    j++;
  }

  return { entries, addedCount, removedCount };
}

export function buildDiffReportHtml({
  fileAName = 'Original.pdf',
  fileBName = 'Revised.pdf',
  diffStats = {},
  pageTextDiffs = [],
}) {
  const safeA = escapeReportHtml(fileAName);
  const safeB = escapeReportHtml(fileBName);
  const sections = pageTextDiffs
    .map((page) => {
      const rows = (page.entries || [])
        .filter((entry) => entry.type !== 'same')
        .map((entry) => {
          const prefix = entry.type === 'added' ? '+' : '-';
          const cls = entry.type === 'added' ? 'added' : 'removed';
          return `<div class="line ${cls}"><span class="sig">${prefix}</span><span>${escapeReportHtml(entry.text)}</span></div>`;
        })
        .join('');

      const visualPct =
        page.totalPixels > 0
          ? `${((Math.max(0, page.diffPixels) / page.totalPixels) * 100).toFixed(1)}% visual delta`
          : page.hasA === false || page.hasB === false
          ? 'Page added or removed'
          : 'No pixel delta';

      return `
        <section class="page-block">
          <h2>Page ${page.pageNum} <span class="badge">${escapeReportHtml(visualPct)}</span></h2>
          ${rows || '<p class="unchanged">No text differences detected on this page.</p>'}
        </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>LocalPDF Comparison Report: ${safeA} vs ${safeB}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f111a; color: #e2e8f0; margin: 0; padding: 2rem; line-height: 1.5; }
  .wrap { max-width: 920px; margin: 0 auto; }
  h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
  .meta { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .card { background: #171926; border: 1px solid #262b3d; border-radius: 10px; padding: 1rem; }
  .card strong { display: block; font-size: 1.4rem; color: #ff4757; }
  .page-block { background: #171926; border: 1px solid #262b3d; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
  h2 { font-size: 1rem; margin: 0 0 0.75rem; display: flex; justify-content: space-between; align-items: center; }
  .badge { font-size: 0.75rem; background: #23283b; color: #cbd5e1; padding: 0.2rem 0.6rem; border-radius: 999px; font-weight: 500; }
  .line { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.84rem; padding: 0.2rem 0.5rem; border-radius: 4px; margin-bottom: 0.2rem; display: flex; gap: 0.5rem; white-space: pre-wrap; }
  .line.added { background: rgba(46, 213, 115, 0.12); color: #86efac; }
  .line.removed { background: rgba(255, 71, 87, 0.14); color: #fda4af; }
  .sig { font-weight: 700; width: 1rem; flex-shrink: 0; }
  .unchanged { color: #94a3b8; font-size: 0.85rem; margin: 0; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>LocalPDF Comparison Report</h1>
    <div class="meta">Original: <strong>${safeA}</strong> &rarr; Revised: <strong>${safeB}</strong></div>
    <div class="stats">
      <div class="card"><span>Pages Changed</span><strong>${diffStats.changed ?? 0}</strong></div>
      <div class="card"><span>Visual Content Diff</span><strong>${escapeReportHtml(diffStats.percentDiff ?? '0.0')}%</strong></div>
      <div class="card"><span>Pages (A / B)</span><strong>${diffStats.pagesA ?? 0} / ${diffStats.pagesB ?? 0}</strong></div>
    </div>
    ${sections}
  </div>
</body>
</html>`;
}

