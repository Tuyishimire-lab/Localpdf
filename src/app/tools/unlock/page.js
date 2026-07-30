import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Unlock PDF Online – Remove PDF Password Free | LocalPDF';
const description = 'Decrypt and remove password protection from PDFs you own so you can access them freely. Client-side decryption ensures your password is never sent to any server.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/unlock` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/unlock`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Unlock PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="unlock" />
    </>
  );
}
