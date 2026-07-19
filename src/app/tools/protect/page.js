'use client';

import dynamic from 'next/dynamic';

const ProtectTool = dynamic(() => import('../../components/tools/ProtectTool'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div className="modal-spinner"></div>
    </div>
  )
});

export default function Page() {
  return <ProtectTool />;
}
