'use client';

import dynamic from 'next/dynamic';

const SignTool = dynamic(() => import('@/app/components/tools/SignTool'), {
  ssr: false,
});

export default function SignPage() {
  return <SignTool />;
}
