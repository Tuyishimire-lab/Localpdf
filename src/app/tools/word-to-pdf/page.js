import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Convert Word and TXT to PDF Online – Free and Secure | LocalPDF';
const description = 'Convert Microsoft Word (.docx) and plain text (.txt) files into high-quality PDFs 100% locally in your browser. Maximum privacy with no file uploads.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/word-to-pdf` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/word-to-pdf`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Word to PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="word-to-pdf" />
    </>
  );
}
