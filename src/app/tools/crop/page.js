export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Crop PDF Pages Online – Trim PDF Margins Free | LocalPDF',
  description: 'Trim white margins and resize visible PDF page areas visually using CropBox adjustments entirely in your browser. Zero server uploads.',
  path: '/tools/crop',
  ogAlt: 'LocalPDF Crop PDF',
});

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="crop" />
    </>
  );
}

