import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function copyRequiredFile(srcRelative, destRelative) {
  const srcPath = path.join(rootDir, srcRelative);
  const destPath = path.join(rootDir, destRelative);
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Required runtime asset not found: ${srcPath}`);
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  const sizeMb = (fs.statSync(destPath).size / (1024 * 1024)).toFixed(2);
  console.log(`Copied ${destRelative} (${sizeMb} MB)`);
}

// 1. QPDF WASM binary
copyRequiredFile(
  path.join('node_modules', '@neslinesli93', 'qpdf-wasm', 'dist', 'qpdf.wasm'),
  path.join('public', 'wasm', 'qpdf.wasm')
);

// 2. PDF.js worker
copyRequiredFile(
  path.join('node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
  path.join('public', 'pdf', 'pdf.worker.min.mjs')
);

// 3. Tesseract.js worker
copyRequiredFile(
  path.join('node_modules', 'tesseract.js', 'dist', 'worker.min.js'),
  path.join('public', 'tesseract', 'worker.min.js')
);

// 4. Tesseract.js WASM core files
const coreSrcDir = path.join(rootDir, 'node_modules', 'tesseract.js-core');
const coreDestDir = path.join(rootDir, 'public', 'tesseract', 'core');
fs.mkdirSync(coreDestDir, { recursive: true });
for (const entry of fs.readdirSync(coreSrcDir)) {
  if (/^tesseract-core.*\.wasm(\.js)?$/.test(entry) || /^tesseract-core.*\.js$/.test(entry)) {
    fs.copyFileSync(path.join(coreSrcDir, entry), path.join(coreDestDir, entry));
  }
}
console.log(`Copied Tesseract core files to public/tesseract/core`);

// 5. Self-hosted English OCR traineddata
const engFast = path.join('node_modules', '@tesseract.js-data', 'eng', '4.0.0', 'eng.traineddata.gz');
const engBest = path.join('node_modules', '@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz');
const engSrc = fs.existsSync(path.join(rootDir, engFast)) ? engFast : engBest;
copyRequiredFile(engSrc, path.join('public', 'tesseract', 'lang-data', 'eng.traineddata.gz'));

