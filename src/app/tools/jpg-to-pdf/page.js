import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'JPG to PDF Online – Convert Images to PDF Free | LocalPDF';
const description = 'Convert JPG, PNG, and WebP images into a PDF document. Choose page size, orientation, and margins. Client-side processing keeps your images private.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/jpg-to-pdf` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/jpg-to-pdf`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF JPG to PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="jpg-to-pdf" />
    </>
  );
}
