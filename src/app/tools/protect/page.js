export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Protect PDF Online – AES-256 Password Encrypt PDF Files Free | LocalPDF';
const description = 'Encrypt your PDF documents with AES-256 owner and user passwords via client-side WebAssembly. Complete privacy with zero server uploads.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/protect` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/protect`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'LocalPDF Protect PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/og-image.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="protect" />
    </>
  );
}
