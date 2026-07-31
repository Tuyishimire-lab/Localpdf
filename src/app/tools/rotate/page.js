export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Rotate PDF Online – Fix Page Orientation Free | LocalPDF';
const description = 'Rotate individual pages or all pages of a PDF in 90-degree increments. Permanent rotation embedded into the PDF metadata. Client-side, no server uploads.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/rotate` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/rotate`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Rotate PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="rotate" />
    </>
  );
}
