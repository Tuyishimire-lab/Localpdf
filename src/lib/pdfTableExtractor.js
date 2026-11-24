/**
 * pdfTableExtractor.js – Extracts structured tables from PDF.js text items
 * and exports RFC 4180 CSV or multi-sheet OpenXML .xlsx workbooks via JSZip.
 */

import JSZip from 'jszip';

function clusterColumnPositions(boundaries, mergeThreshold = 18) {
  const sorted = [...boundaries].sort((a, b) => a - b);
  const cols = [];
  for (const x of sorted) {
    const existing = cols.find((c) => Math.abs(c - x) <= mergeThreshold);
    if (existing === undefined) {
      cols.push(x);
    }
  }
  return cols;
}

export function extractTableRowsFromTextItems(
  textItems = [],
  { rowTolerance = 4.5, colGapThreshold = 14 } = {}
) {
  const normalized = (textItems || [])
    .filter((item) => item && typeof item.str === 'string' && item.str.trim().length > 0 && Array.isArray(item.transform))
    .map((item) => ({
      str: item.str.trim(),
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
      width: Number.isFinite(item.width) ? item.width : item.str.length * 5,
    }));

  if (normalized.length === 0) {
    return { rows: [], columnCount: 0, rowCount: 0 };
  }

  // Group into horizontal rows (top-to-bottom in PDF space = descending y)
  normalized.sort((a, b) => b.y - a.y || a.x - b.x);
  const rawRows = [];

  for (const item of normalized) {
    const row = rawRows.find((r) => Math.abs(r.y - item.y) <= rowTolerance);
    if (row) {
      row.items.push(item);
      row.y = row.items.reduce((sum, it) => sum + it.y, 0) / row.items.length;
    } else {
      rawRows.push({ y: item.y, items: [item] });
    }
  }

  rawRows.sort((a, b) => b.y - a.y);

  // Split each row into cell runs separated by colGapThreshold
  const splitRows = rawRows.map((row) => {
    const items = [...row.items].sort((a, b) => a.x - b.x);
    const cells = [];
    let current = null;

    for (const item of items) {
      if (!current) {
        current = { x: item.x, endX: item.x + item.width, text: item.str };
      } else if (item.x - current.endX < colGapThreshold) {
        current.text += ` ${item.str}`;
        current.endX = Math.max(current.endX, item.x + item.width);
      } else {
        cells.push({ x: current.x, text: current.text.replace(/\s+/g, ' ').trim() });
        current = { x: item.x, endX: item.x + item.width, text: item.str };
      }
    }
    if (current) {
      cells.push({ x: current.x, text: current.text.replace(/\s+/g, ' ').trim() });
    }
    return cells;
  });

  const allStarts = splitRows.flatMap((r) => r.map((c) => c.x));
  const colAnchors = clusterColumnPositions(allStarts, 18);
  const columnCount = colAnchors.length;

  const grid = splitRows.map((cells) => {
    const rowArr = Array(columnCount).fill('');
    for (const cell of cells) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < columnCount; i++) {
        const d = Math.abs(cell.x - colAnchors[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      rowArr[bestIdx] = rowArr[bestIdx] ? `${rowArr[bestIdx]} ${cell.text}` : cell.text;
    }
    return rowArr;
  });

  return { rows: grid, columnCount, rowCount: grid.length };
}

export function rowsToCsv(rows = []) {
  return (rows || [])
    .map((row) =>
      (row || [])
        .map((cell) => {
          const val = String(cell ?? '');
          if (/[",\r\n]/.test(val)) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',')
    )
    .join('\r\n');
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colIndexToLetter(index) {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function buildWorksheetXml(rows = []) {
  const rowXml = rows
    .map((row, rIdx) => {
      const rNum = rIdx + 1;
      const cellsXml = (row || [])
        .map((val, cIdx) => {
          const ref = `${colIndexToLetter(cIdx)}${rNum}`;
          const strVal = String(val ?? '');
          if (strVal !== '' && /^-?\d+(\.\d+)?$/.test(strVal.trim()) && Number.isFinite(Number(strVal))) {
            return `<c r="${ref}"><v>${strVal.trim()}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(strVal)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rNum}">${cellsXml}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

export async function buildMinimalXlsx(sheets = []) {
  const validSheets =
    Array.isArray(sheets) && sheets.length > 0
      ? sheets
      : [{ name: 'Sheet1', rows: [[]] }];

  const zip = new JSZip();

  const sheetOverrides = validSheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('');

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`
  );

  zip.folder('_rels').file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  const xl = zip.folder('xl');
  xl.file(
    'styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`
  );

  const sheetEntriesXml = validSheets
    .map((s, i) => {
      const cleanName = escapeXml(String(s.name || `Page ${i + 1}`).replace(/[:\\/?*\[\]]/g, '').slice(0, 31) || `Sheet${i + 1}`);
      return `<sheet name="${cleanName}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`;
    })
    .join('');

  xl.file(
    'workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetEntriesXml}</sheets>
</workbook>`
  );

  const relsXml = validSheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join('');

  xl.folder('_rels').file(
    'workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relsXml}
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  const worksheets = xl.folder('worksheets');
  validSheets.forEach((s, i) => {
    worksheets.file(`sheet${i + 1}.xml`, buildWorksheetXml(s.rows || []));
  });

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

