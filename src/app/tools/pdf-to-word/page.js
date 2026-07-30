import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'PDF to Word Online – Convert PDF to Editable .docx Free | LocalPDF';
const description = 'Convert PDF files to editable Microsoft Word documents (.docx) directly in your browser. No server uploads, no account needed, completely free.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/pdf-to-word` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/pdf-to-word`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF PDF to Word' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="pdf-to-word" />
    </>
  );
}
