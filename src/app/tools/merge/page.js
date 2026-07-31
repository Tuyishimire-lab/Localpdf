export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Merge PDF Online – Combine PDF Files Free | LocalPDF';
const description = 'Combine multiple PDF files into one document in any order. Drag, reorder, and merge PDFs entirely in your browser. No uploads, no account, completely free.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/merge` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/merge`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Merge PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="merge" />
    </>
  );
}
