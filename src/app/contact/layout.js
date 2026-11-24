import { buildPageMetadata } from '../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Contact Us | LocalPDF',
  description: 'Get in touch with the LocalPDF team. Send us a message for support, feedback, or general inquiries about our free browser-based PDF tools.',
  path: '/contact',
});

export default function ContactLayout({ children }) {
  return children;
}
