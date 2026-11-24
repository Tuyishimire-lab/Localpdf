export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'PDF to Excel & CSV Online – Extract PDF Tables Free | LocalPDF',
  description: 'Extract tables from PDFs into structured Excel (.xlsx) workbooks or .csv files 100% locally in your browser. Zero uploads, unlimited pages.',
  path: '/tools/pdf-to-excel',
  ogAlt: 'LocalPDF PDF to Excel',
});

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="pdf-to-excel" />
    </>
  );
}

