export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Compare PDF Online – Highlight Differences Between Two PDFs | LocalPDF';
const description = 'Compare two PDF documents side by side and instantly highlight every difference. Pixel-accurate diff runs entirely in your browser. No file uploads needed.';

export const metadata = {
  title, description,
  alternates: { canonical: `${BASE}/tools/compare` },
  openGraph: { title, description, url: `${BASE}/tools/compare`, siteName: 'LocalPDF', images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'LocalPDF Compare PDF' }], locale: 'en_US', type: 'website' },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/og-image.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="compare" />
    </>
  );
}
