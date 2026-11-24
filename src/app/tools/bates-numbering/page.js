export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Bates Numbering & PDF Headers/Footers Online | LocalPDF',
  description: 'Apply continuous legal Bates numbering prefixes, zero-padded IDs, and custom headers/footers across single or batch PDFs completely locally.',
  path: '/tools/bates-numbering',
  ogAlt: 'LocalPDF Bates Numbering',
});

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="bates-numbering" />
    </>
  );
}

