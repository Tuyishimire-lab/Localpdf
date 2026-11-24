export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Add Page Numbers to PDF Online – Free and Instant | LocalPDF';
const description = 'Add page numbers to your PDF documents with customizable placement, size, font, and color. All processing is done locally with no uploads to any server.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/page-numbers` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/page-numbers`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'LocalPDF Add Page Numbers' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/og-image.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="page-numbers" />
    </>
  );
}
