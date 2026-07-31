export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Add Watermark to PDF Online – Text and Image Watermarks | LocalPDF';
const description = 'Stamp custom text or image watermarks onto your PDF pages with adjustable opacity, angle, and position. Client-side processing keeps your files private.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/watermark` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/watermark`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Watermark PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="watermark" />
    </>
  );
}
