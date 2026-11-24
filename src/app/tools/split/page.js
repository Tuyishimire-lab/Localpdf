export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Split PDF Online – Extract Pages from PDF Free | LocalPDF';
const description = 'Split a PDF by page range, extract specific pages, or separate every page into individual files. All processing is client-side with no server uploads required.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/split` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/split`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'LocalPDF Split PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/og-image.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="split" />
    </>
  );
}
