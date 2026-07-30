import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'Organize PDF Pages Online – Reorder, Delete and Insert Pages | LocalPDF';
const description = 'Visually reorder, delete, rotate, or insert blank pages into your PDF. Drag-and-drop page management runs entirely in your browser for full privacy.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/organize` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/organize`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF Organize PDF' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="organize" />
    </>
  );
}
