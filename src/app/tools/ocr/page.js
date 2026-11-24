export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'OCR PDF Online – Extract Text from Scanned Documents Free | LocalPDF';
const description = 'Extract text from scanned PDFs and image-based documents using client-side OCR powered by Tesseract.js. Multi-language support. Your documents never leave your browser.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/ocr` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/ocr`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'LocalPDF OCR PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/og-image.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="ocr" />
    </>
  );
}
