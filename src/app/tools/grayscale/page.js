export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Convert PDF to Grayscale – Print-Ready Black & White PDF | LocalPDF',
  description: 'Convert color PDFs to calibrated grayscale black-and-white documents for economical printing entirely client-side with zero uploads.',
  path: '/tools/grayscale',
  ogAlt: 'LocalPDF Grayscale PDF',
});

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="grayscale" />
    </>
  );
}

