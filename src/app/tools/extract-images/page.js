export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Extract Images from PDF Online – Save PDF Photos Free | LocalPDF',
  description: 'Extract all embedded raster images from PDF files at full resolution and download as PNGs or a ZIP archive, 100% locally in your browser.',
  path: '/tools/extract-images',
  ogAlt: 'LocalPDF Extract Images',
});

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="extract-images" />
    </>
  );
}

