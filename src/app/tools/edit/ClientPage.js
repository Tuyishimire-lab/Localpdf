'use client';

import dynamic from 'next/dynamic';

const EditTool = dynamic(() => import('@/app/components/tools/EditTool'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div className="modal-spinner"></div>
    </div>
  )
});

export default function ClientPage() {
  return <EditTool />;
}
