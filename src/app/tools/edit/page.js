export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Edit PDF Online – Add Text and Annotations Free | LocalPDF';
const description = 'Add text overlays, annotations, and stamps to any PDF page directly in your browser. Click to place, drag to reposition. No server uploads, no account needed.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/edit` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/edit`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Edit PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="edit" />
    </>
  );
}
