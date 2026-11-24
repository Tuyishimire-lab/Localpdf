'use client';

import dynamic from 'next/dynamic';

const MetadataTool = dynamic(() => import('../../components/tools/MetadataTool'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div className="modal-spinner"></div>
    </div>
  ),
});

export default function ClientPage() {
  return <MetadataTool />;
}

