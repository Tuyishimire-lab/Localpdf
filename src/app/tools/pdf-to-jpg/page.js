export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'PDF to JPG Online – Convert PDF Pages to Images Free | LocalPDF';
const description = 'Convert each page of your PDF into high-quality JPG or PNG images. All rendering happens locally in your browser with no server uploads required.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/pdf-to-jpg` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/pdf-to-jpg`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'LocalPDF PDF to JPG' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/og-image.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="pdf-to-jpg" />
    </>
  );
}
