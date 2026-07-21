'use client';

import dynamic from 'next/dynamic';

const OrganizeTool = dynamic(() => import('../../components/tools/OrganizeTool'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div className="modal-spinner"></div>
    </div>
  )
});

export default function ClientPage() {
  return <OrganizeTool />;
}
