const BASE = 'https://www.uselocalpdf.com';

export const metadata = {
  title: 'Processing History | LocalPDF',
  description: 'View your recent PDF processing history stored locally on your device. All history is kept in your browser only and is never sent to any server.',
  alternates: { canonical: `${BASE}/history` },
  openGraph: {
    title: 'Processing History | LocalPDF',
    description: 'View your recent PDF processing history stored locally on your device.',
    url: `${BASE}/history`,
    siteName: 'LocalPDF',
    locale: 'en_US',
    type: 'website',
  },
  robots: { index: false, follow: false },
};

export default function HistoryLayout({ children }) {
  return children;
}
