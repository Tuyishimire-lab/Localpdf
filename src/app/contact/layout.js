const BASE = 'https://www.uselocalpdf.com';

export const metadata = {
  title: 'Contact Us | LocalPDF',
  description: 'Get in touch with the LocalPDF team. Send us a message for support, feedback, or general inquiries about our free browser-based PDF tools.',
  alternates: { canonical: `${BASE}/contact` },
  openGraph: {
    title: 'Contact Us | LocalPDF',
    description: 'Get in touch with the LocalPDF team for support, feedback, or general inquiries.',
    url: `${BASE}/contact`,
    siteName: 'LocalPDF',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact Us | LocalPDF',
    description: 'Get in touch with the LocalPDF team for support, feedback, or general inquiries.',
  },
};

export default function ContactLayout({ children }) {
  return children;
}
