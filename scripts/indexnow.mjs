/**
 * IndexNow Submission Script
 * Usage: npm run indexnow (or node scripts/indexnow.mjs)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = '7d4269f3469c4918aca322d051fd0068';
const HOST = 'www.uselocalpdf.com';
const BASE_URL = `https://${HOST}`;

const staticRoutes = [
  BASE_URL,
  `${BASE_URL}/about`,
  `${BASE_URL}/recipes`,
  `${BASE_URL}/security`,
  `${BASE_URL}/contact`,
  `${BASE_URL}/privacy`,
  `${BASE_URL}/terms`,
  `${BASE_URL}/blog`,
  `${BASE_URL}/compare`,
  `${BASE_URL}/compare/localpdf-vs-ilovepdf`,
  `${BASE_URL}/compare/localpdf-vs-smallpdf`,
  `${BASE_URL}/compare/localpdf-vs-pdf24`,
  // All 29 Tools
  `${BASE_URL}/tools/organize`,
  `${BASE_URL}/tools/merge`,
  `${BASE_URL}/tools/split`,
  `${BASE_URL}/tools/compress`,
  `${BASE_URL}/tools/edit`,
  `${BASE_URL}/tools/ocr`,
  `${BASE_URL}/tools/pdf-to-jpg`,
  `${BASE_URL}/tools/jpg-to-pdf`,
  `${BASE_URL}/tools/sign`,
  `${BASE_URL}/tools/rotate`,
  `${BASE_URL}/tools/watermark`,
  `${BASE_URL}/tools/page-numbers`,
  `${BASE_URL}/tools/protect`,
  `${BASE_URL}/tools/unlock`,
  `${BASE_URL}/tools/redact`,
  `${BASE_URL}/tools/ai-chat`,
  `${BASE_URL}/tools/word-to-pdf`,
  `${BASE_URL}/tools/pdf-to-word`,
  `${BASE_URL}/tools/flatten`,
  `${BASE_URL}/tools/compare`,
  `${BASE_URL}/tools/repair`,
  `${BASE_URL}/tools/pdf-to-excel`,
  `${BASE_URL}/tools/crop`,
  `${BASE_URL}/tools/extract-images`,
  `${BASE_URL}/tools/fill-form`,
  `${BASE_URL}/tools/metadata`,
  `${BASE_URL}/tools/bates-numbering`,
  `${BASE_URL}/tools/split-by-size`,
  `${BASE_URL}/tools/grayscale`,
];

// Automatically collect all blog posts
function getBlogUrls() {
  const postsDir = path.join(__dirname, '..', 'src', 'app', 'blog', 'posts');
  if (!fs.existsSync(postsDir)) return [];
  const files = fs.readdirSync(postsDir);
  return files
    .filter((file) => file.endsWith('.mdx') || file.endsWith('.md'))
    .map((file) => `${BASE_URL}/blog/${file.replace(/\.mdx?$/, '')}`);
}

const urlsToSubmit = [...staticRoutes, ...getBlogUrls()];

async function submitIndexNow() {
  const payload = {
    host: HOST,
    key: API_KEY,
    keyLocation: `${BASE_URL}/${API_KEY}.txt`,
    urlList: urlsToSubmit,
  };

  console.log(`[IndexNow] Submitting ${urlsToSubmit.length} URLs for ${HOST}...`);

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 200) {
      console.log(`✅ [IndexNow] Success! All ${urlsToSubmit.length} URLs submitted and key verified.`);
    } else if (res.status === 202) {
      console.log(`⏳ [IndexNow] Accepted (202). All ${urlsToSubmit.length} URLs queued for indexing.`);
    } else {
      const errorText = await res.text();
      console.error(`❌ [IndexNow] Error (${res.status}):`, errorText);
    }
  } catch (error) {
    console.error('❌ [IndexNow] Network error:', error.message);
  }
}

submitIndexNow();
