/**
 * IndexNow Submission Script
 * Usage: node scripts/indexnow.mjs
 */

const API_KEY = '7d4269f3469c4918aca322d051fd0068';
const HOST = 'www.uselocalpdf.com';
const BASE_URL = `https://${HOST}`;

const urlsToSubmit = [
  BASE_URL,
  `${BASE_URL}/blog`,
  `${BASE_URL}/compare`,
  `${BASE_URL}/compare/localpdf-vs-ilovepdf`,
  `${BASE_URL}/compare/localpdf-vs-smallpdf`,
  `${BASE_URL}/compare/localpdf-vs-pdf24`,
  // Tools
  `${BASE_URL}/tools/compress`,
  `${BASE_URL}/tools/edit`,
  `${BASE_URL}/tools/jpg-to-pdf`,
  `${BASE_URL}/tools/merge`,
  `${BASE_URL}/tools/ocr`,
  `${BASE_URL}/tools/organize`,
  `${BASE_URL}/tools/page-numbers`,
  `${BASE_URL}/tools/pdf-to-jpg`,
  `${BASE_URL}/tools/protect`,
  `${BASE_URL}/tools/rotate`,
  `${BASE_URL}/tools/sign`,
  `${BASE_URL}/tools/split`,
  `${BASE_URL}/tools/unlock`,
  `${BASE_URL}/tools/watermark`,
  `${BASE_URL}/tools/word-to-pdf`,
  `${BASE_URL}/tools/pdf-to-word`,
  `${BASE_URL}/tools/flatten`,
  `${BASE_URL}/tools/compare`,
  `${BASE_URL}/tools/repair`,
  `${BASE_URL}/tools/redact`,
  `${BASE_URL}/tools/ai-chat`,
];

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
      console.log('✅ [IndexNow] Success! URLs submitted and key verified.');
    } else if (res.status === 202) {
      console.log('⏳ [IndexNow] Accepted (202). Key validation is in progress.');
    } else {
      const errorText = await res.text();
      console.error(`❌ [IndexNow] Error (${res.status}):`, errorText);
    }
  } catch (error) {
    console.error('❌ [IndexNow] Network error:', error.message);
  }
}

submitIndexNow();
