/**
 * @jest-environment node
 */

import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { getVisualPageBox, mapNormalizedRectToPdf, mapVisualPointToPdf } from '../../src/lib/pdfCoords';
import { diffLines, buildDiffReportHtml } from '../../src/lib/textDiff';
import { extractStructuredLines } from '../../src/lib/pdfLayout';
import { sanitizeWinAnsiText, buildSearchablePdf } from '../../src/lib/searchablePdf';
import { createBatchZip } from '../../src/lib/batchZip';
import { getHistoryStats } from '../../src/lib/history';

/** Helper computing the PDF axis-aligned bounding box of a rotated pdf-lib rectangle */
function rotatedRectBounds({ x, y, width, height, rotateAngle }) {
  const rad = (rotateAngle * Math.PI) / 180;
  const cos = Math.round(Math.cos(rad));
  const sin = Math.round(Math.sin(rad));
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([u, v]) => [x + u * cos - v * sin, y + u * sin + v * cos]);

  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

describe('Milestone 5 pure engines', () => {
  test('pdfCoords handles 0, 90, 180, 270 rotations and non-zero CropBox accurately', async () => {
    const doc = await PDFDocument.create();
    const angles = [0, 90, 180, 270];

    for (const angle of angles) {
      const page = doc.addPage([600, 800]);
      page.setCropBox(40, 60, 500, 700);
      page.setRotation(degrees(angle));

      const box = getVisualPageBox(page);
      expect(box.rotation).toBe(angle);
      if (angle === 90 || angle === 270) {
        expect(box.visualWidth).toBe(700);
        expect(box.visualHeight).toBe(500);
      } else {
        expect(box.visualWidth).toBe(500);
        expect(box.visualHeight).toBe(700);
      }

      const mapped = mapNormalizedRectToPdf(page, {
        x: 0.2,
        y: 0.1,
        width: 0.4,
        height: 0.2,
      });
      expect(mapped.rotateAngle).toBe(angle);
      const bounds = rotatedRectBounds(mapped);
      expect(bounds.minX).toBeGreaterThanOrEqual(40);
      expect(bounds.maxX).toBeLessThanOrEqual(540);
      expect(bounds.minY).toBeGreaterThanOrEqual(60);
      expect(bounds.maxY).toBeLessThanOrEqual(760);

      // Visual area equals PDF area
      expect(Math.round((bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY))).toBe(
        Math.round(0.4 * box.visualWidth * (0.2 * box.visualHeight))
      );

      const pt = mapVisualPointToPdf(page, box.visualWidth * 0.5, box.visualHeight * 0.5, 20, 10);
      expect(pt.rotateAngle).toBe(angle);
      expect(Number.isFinite(pt.x)).toBe(true);
      expect(Number.isFinite(pt.y)).toBe(true);
    }
  });

  test('textDiff computes LCS line diffs and escapes HTML report output', () => {
    const diff = diffLines(
      ['Header', 'Line A', 'Line B'],
      ['Header', 'Line A updated', 'Line B', 'Line C']
    );
    expect(diff.removedCount).toBe(1);
    expect(diff.addedCount).toBe(2);
    expect(diff.entries.some((e) => e.type === 'same' && e.text === 'Header')).toBe(true);

    const html = buildDiffReportHtml({
      fileAName: '<script>evil()</script>.pdf',
      fileBName: 'v2.pdf',
      diffStats: { changed: 1, percentDiff: '4.5', pagesA: 1, pagesB: 1 },
      pageTextDiffs: [{ pageNum: 1, diffPixels: 100, totalPixels: 2000, ...diff }],
    });
    expect(html).not.toContain('<script>evil()</script>');
    expect(html).toContain('&lt;script&gt;evil()&lt;/script&gt;.pdf');
  });

  test('pdfLayout detects 2-column reading order, headings, and scanned fallback', () => {
    const empty = extractStructuredLines([], 612);
    expect(empty.isLikelyScanned).toBe(true);

    const twoColItems = [
      { str: 'LEFT TITLE', transform: [18, 0, 0, 18, 40, 740], width: 100 },
      { str: 'Left body line 1', transform: [12, 0, 0, 12, 40, 710], width: 120 },
      { str: 'Left body line 2', transform: [12, 0, 0, 12, 40, 690], width: 120 },
      { str: 'Left body line 3', transform: [12, 0, 0, 12, 40, 670], width: 120 },
      { str: 'Right col line 1', transform: [12, 0, 0, 12, 330, 740], width: 120 },
      { str: 'Right col line 2', transform: [12, 0, 0, 12, 330, 710], width: 120 },
      { str: 'Right col line 3', transform: [12, 0, 0, 12, 330, 690], width: 120 },
      { str: 'Right col line 4', transform: [12, 0, 0, 12, 330, 670], width: 120 },
    ];

    const result = extractStructuredLines(twoColItems, 612);
    expect(result.columnCount).toBe(2);
    expect(result.isLikelyScanned).toBe(false);
    expect(result.lines[0].text).toBe('LEFT TITLE');
    expect(result.lines[0].isHeading).toBe(true);
    expect(result.lines[3].text).toBe('Left body line 3');
    expect(result.lines[4].text).toBe('Right col line 1');
  });

  test('searchablePdf sanitizes WinAnsi text and builds valid PDF with invisible OCR tokens', async () => {
    expect(sanitizeWinAnsiText('“Quote” — ₹100 • End')).toBe('"Quote" - 100 * End');

    const src = await PDFDocument.create();
    src.addPage([600, 800]);
    const srcBytes = await src.save();

    const outBytes = await buildSearchablePdf(srcBytes, [
      {
        pageIndex: 0,
        imageWidth: 1200,
        imageHeight: 1600,
        words: [
          { text: 'Invoice', bbox: { x0: 100, y0: 100, x1: 240, y1: 140 } },
          { text: 'Total:', bbox: { x0: 250, y0: 100, x1: 350, y1: 140 } },
        ],
      },
    ]);

    const reloaded = await PDFDocument.load(outBytes);
    expect(reloaded.getPageCount()).toBe(1);
  });

  test('batchZip packs and deduplicates colliding filenames cleanly', async () => {
    const b1 = new Blob(['first'], { type: 'application/pdf' });
    const b2 = new Blob(['second'], { type: 'application/pdf' });
    const zipBlob = await createBatchZip([
      { name: 'report.pdf', blob: b1 },
      { name: 'report.pdf', blob: b2 },
    ]);

    const buf = await zipBlob.arrayBuffer();
    const loaded = await JSZip.loadAsync(buf);
    const names = Object.keys(loaded.files);
    expect(names).toContain('report.pdf');
    expect(names).toContain('report (2).pdf');
  });

  test('getHistoryStats computes totals and top tool', () => {
    const stats = getHistoryStats([
      { tool: 'compress', toolLabel: 'Compress PDF', inputSize: 1000, outputSize: 400 },
      { tool: 'compress', toolLabel: 'Compress PDF', inputSize: 2000, outputSize: 1500 },
      { tool: 'merge', toolLabel: 'Merge PDF', inputSize: 500, outputSize: 900 },
    ]);
    expect(stats.totalRuns).toBe(3);
    expect(stats.totalSavedBytes).toBe(1100);
    expect(stats.topToolLabel).toBe('Compress PDF');
  });
});

