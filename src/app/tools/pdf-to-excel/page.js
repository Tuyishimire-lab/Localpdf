import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'PDF to Excel Online – Extract Tables from PDF Free | LocalPDF';
const description = 'Extract data and tables from PDF files and convert to Excel spreadsheets (.xlsx). Beta feature with client-side processing. No file uploads, no account required.';

export const metadata = {
  title, description,
  alternates: { canonical: `${BASE}/tools/pdf-to-excel` },
  openGraph: { title, description, url: `${BASE}/tools/pdf-to-excel`, siteName: 'LocalPDF', images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF PDF to Excel' }], locale: 'en_US', type: 'website' },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="pdf-to-excel" />
    </>
  );
}
