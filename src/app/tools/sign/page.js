export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Sign PDF Online – E-Sign Documents Free | LocalPDF';
const description = 'Draw, type, or upload a signature and place it on any PDF page. Electronic signatures processed entirely in your browser. No account, no uploads, free forever.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/sign` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/sign`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Sign PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="sign" />
    </>
  );
}
