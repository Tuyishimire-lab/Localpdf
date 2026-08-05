export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Redact & Sanitize PDF Online – Permanent Blackout & Metadata Removal | LocalPDF';
const description = 'Permanently black out sensitive text, confidential numbers, or personal data and strip PDF document metadata 100% locally in your browser. Complete privacy guarantee.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/redact` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/redact`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Redact PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="redact" />
    </>
  );
}
