'use client';

import dynamic from 'next/dynamic';

const EditTool = dynamic(() => import('@/app/components/tools/EditTool'), {
  ssr: false,
});

export default function EditPage() {
  return <EditTool />;
}
