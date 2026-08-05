export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';

const BASE = 'https://www.uselocalpdf.com';
const title = 'AI PDF Summarizer & Chat Online – Private Local AI Q&A | LocalPDF';
const description = 'Summarize PDFs and ask questions in natural language 100% locally in your browser. Zero cloud uploads, zero API keys, complete privacy guarantee.';

export const metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/tools/ai-chat` },
  openGraph: {
    title,
    description,
    url: `${BASE}/tools/ai-chat`,
    siteName: 'LocalPDF',
    images: [{ url: `${BASE}/logo.png`, width: 800, height: 800, alt: 'LocalPDF AI PDF Chat' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description, images: [`${BASE}/logo.png`] },
};

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="ai-chat" />
    </>
  );
}
