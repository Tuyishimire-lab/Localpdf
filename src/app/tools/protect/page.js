import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Protect PDF Online – Password Encrypt PDF Files Free | LocalPDF';
const description = 'Encrypt your PDF documents with owner and user passwords to restrict unauthorized access. AES encryption runs entirely in your browser with no server uploads.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/protect` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/protect`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Protect PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="protect" />
    </>
  );
}
