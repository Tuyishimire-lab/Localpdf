'use client';

import dynamic from 'next/dynamic';

const OcrTool = dynamic(() => import('@/app/components/tools/OcrTool'), {
  ssr: false,
});

export default function OcrPage() {
  return <OcrTool />;
}
