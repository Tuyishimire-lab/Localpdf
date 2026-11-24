export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'PDF Metadata Editor & Privacy Scrubber Online | LocalPDF',
  description: 'Inspect, edit, or completely scrub Title, Author, Subject, Creator, and Producer metadata from PDF documents in your browser.',
  path: '/tools/metadata',
  ogAlt: 'LocalPDF Metadata Editor',
});

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="metadata" />
    </>
  );
}

