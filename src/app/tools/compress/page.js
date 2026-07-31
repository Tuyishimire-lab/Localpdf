export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Compress PDF Online – Shrink PDF File Size Free | LocalPDF';
const description = 'Reduce the size of your PDF files without losing quality. High-speed local compression handles all optimizations client-side. Your files never leave your browser.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/compress` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/compress`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Compress PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="compress" />
    </>
  );
}
