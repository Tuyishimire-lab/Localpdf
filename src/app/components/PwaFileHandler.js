'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSharedFile } from '../../context/FileContext';
import { toast } from '../../context/ToastContext';

/**
 * Consumes OS-launched PDF files via the PWA File Handling API (`window.launchQueue`)
 * when LocalPDF is installed as a desktop/mobile PWA and opens `.pdf` files directly.
 */
export default function PwaFileHandler() {
  const router = useRouter();
  const { setFiles } = useSharedFile();

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('launchQueue' in window) ||
      typeof window.launchQueue?.setConsumer !== 'function'
    ) {
      return;
    }

    window.launchQueue.setConsumer(async (launchParams) => {
      const handles = launchParams?.files;
      if (!Array.isArray(handles) || handles.length === 0) return;

      try {
        const resolved = await Promise.all(
          handles.map((handle) => (typeof handle?.getFile === 'function' ? handle.getFile() : null))
        );
        const validFiles = resolved.filter(Boolean);
        if (validFiles.length === 0) return;

        setFiles(validFiles);

        if (validFiles.length > 1) {
          toast.info(`Opened ${validFiles.length} PDF files from OS into Merge PDF.`);
          router.push('/tools/merge');
        } else {
          toast.info(`Opened "${validFiles[0].name}" in LocalPDF.`);
          router.push('/tools/compress');
        }
      } catch (err) {
        console.error('PWA file handler failed to read launched file:', err);
        toast.error('Could not open the launched PDF file.');
      }
    });
  }, [router, setFiles]);

  return null;
}

