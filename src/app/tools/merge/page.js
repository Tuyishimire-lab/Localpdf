'use client';

import dynamic from 'next/dynamic';

const MergeTool = dynamic(() => import('../../components/tools/MergeTool'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div className="modal-spinner"></div>
    </div>
  )
});

export default function Page() {
  return <MergeTool />;
}
