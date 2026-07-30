import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Flatten PDF Online – Remove Form Fields and Make PDF Static | LocalPDF';
const description = 'Flatten interactive PDF form fields and annotation layers into permanent static content. Perfect for final document sharing. Runs entirely in your browser.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/flatten` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/flatten`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Flatten PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="flatten" />
    </>
  );
}
