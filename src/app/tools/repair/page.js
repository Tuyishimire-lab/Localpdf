export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Repair PDF Online – Fix Corrupted PDF Files Free | LocalPDF';
const description = 'Recover and repair damaged or corrupted PDF files by rebuilding the internal structure. Client-side processing with no server uploads required.';

export const metadata = {
  title, description,
  alternates: { canonical: `${BASE}/tools/repair` },
  openGraph: { title, description, url: `${BASE}/tools/repair`, siteName: 'LocalPDF', images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: 'LocalPDF Repair PDF' }], locale: 'en_US', type: 'website' },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/og-image.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="repair" />
    </>
  );
}
