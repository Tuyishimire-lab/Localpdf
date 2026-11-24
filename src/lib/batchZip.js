/**
 * batchZip.js – Packs multiple processed output blobs into a single deduplicated ZIP archive.
 */

import JSZip from 'jszip';

function deduplicateName(name, seen) {
  const clean = name || 'document.pdf';
  if (!seen.has(clean)) {
    seen.add(clean);
    return clean;
  }

  const dotIdx = clean.lastIndexOf('.');
  const stem = dotIdx > 0 ? clean.slice(0, dotIdx) : clean;
  const ext = dotIdx > 0 ? clean.slice(dotIdx) : '';

  let counter = 2;
  let candidate = `${stem} (${counter})${ext}`;
  while (seen.has(candidate)) {
    counter++;
    candidate = `${stem} (${counter})${ext}`;
  }
  seen.add(candidate);
  return candidate;
}

export async function createBatchZip(entries = []) {
  const zip = new JSZip();
  const seen = new Set();

  for (const entry of entries) {
    if (!entry || !entry.blob) continue;
    const filename = deduplicateName(entry.name, seen);
    const data =
      typeof entry.blob.arrayBuffer === 'function'
        ? await entry.blob.arrayBuffer()
        : entry.blob;
    zip.file(filename, data);
  }

  return zip.generateAsync({ type: 'blob' });
}

