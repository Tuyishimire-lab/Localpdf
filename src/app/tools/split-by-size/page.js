export const dynamic = 'force-static';

import ClientPage from './ClientPage';
import ToolContentSection from '../../components/ToolContentSection';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata = buildPageMetadata({
  title: 'Split PDF by File Size or Bookmarks Online Free | LocalPDF',
  description: 'Split large PDFs into fixed MB chunks for email limits or divide documents automatically by outline bookmark chapters in your browser.',
  path: '/tools/split-by-size',
  ogAlt: 'LocalPDF Split PDF by Size',
});

export default function Page() {
  return (
    <>
      <ClientPage />
      <ToolContentSection tool="split-by-size" />
    </>
  );
}

