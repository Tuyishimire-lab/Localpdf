'use client';

import dynamic from 'next/dynamic';

const PdfToJpgTool = dynamic(() => import('../../components/tools/PdfToJpgTool'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div className="modal-spinner"></div>
    </div>
  )
});

export default function Page() {
  return <PdfToJpgTool />;
}
