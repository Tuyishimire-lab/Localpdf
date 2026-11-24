export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Fill PDF Forms Online – Interactive AcroForm Filler Free | LocalPDF',
  description: 'Fill interactive PDF form fields, checkboxes, dropdowns, and radio buttons right in your browser, with optional flattening and zero uploads.',
  path: '/tools/fill-form',
  ogAlt: 'LocalPDF Fill PDF Forms',
});

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="fill-form" />
    </>
  );
}

