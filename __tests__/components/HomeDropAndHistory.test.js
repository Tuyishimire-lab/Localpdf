import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { FileProvider } from '../../src/context/FileContext';
import HomePageClient from '../../src/app/components/HomePageClient';
import ProgressModal from '../../src/app/components/ProgressModal';
import { getHistory } from '../../src/lib/history';

describe('HomePageClient smart dropzone, ?q= filter, and ProgressModal universal history', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
    window.history.replaceState({}, '', '/');
  });

  test('reads ?q= search query parameter on mount and filters tool cards', () => {
    window.history.replaceState({}, '', '/?q=compress');
    render(
      <FileProvider>
        <HomePageClient />
      </FileProvider>
    );

    const searchInput = screen.getByLabelText(/search pdf tools/i);
    expect(searchInput.value).toBe('compress');
    expect(screen.getByText('Compress PDF')).toBeInTheDocument();
    expect(screen.queryByText('Sign PDF')).not.toBeInTheDocument();
  });

  test('smart home dropzone routes multi-PDF, images, docx, and shows expanded single-PDF modal', async () => {
    render(
      <FileProvider>
        <HomePageClient />
      </FileProvider>
    );

    // 1. Multiple PDFs -> /tools/merge
    fireEvent.drop(window, {
      dataTransfer: {
        files: [
          new File(['a'], 'a.pdf', { type: 'application/pdf' }),
          new File(['b'], 'b.pdf', { type: 'application/pdf' }),
        ],
      },
    });
    expect(mockPush).toHaveBeenCalledWith('/tools/merge');

    // 2. Images -> /tools/jpg-to-pdf
    mockPush.mockClear();
    fireEvent.drop(window, {
      dataTransfer: {
        files: [new File(['img'], 'photo.png', { type: 'image/png' })],
      },
    });
    expect(mockPush).toHaveBeenCalledWith('/tools/jpg-to-pdf');

    // 3. Word doc -> /tools/word-to-pdf
    mockPush.mockClear();
    fireEvent.drop(window, {
      dataTransfer: {
        files: [new File(['doc'], 'notes.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })],
      },
    });
    expect(mockPush).toHaveBeenCalledWith('/tools/word-to-pdf');

    // 4. Single PDF -> expanded modal with AI Chat, Redact & PDF to Word
    fireEvent.drop(window, {
      dataTransfer: {
        files: [new File(['pdf'], 'single.pdf', { type: 'application/pdf' })],
      },
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI Chat & Summary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redact & Sanitize' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF to Word' })).toBeInTheDocument();
  });

  test('ProgressModal records universal history once on completion and honors skipHistory', async () => {
    const outBlob = new Blob([new Uint8Array(120)], { type: 'application/pdf' });

    const { rerender } = render(
      <FileProvider>
        <ProgressModal
          isOpen={true}
          isComplete={true}
          currentToolId="compress"
          resultBlob={outBlob}
          resultFileName="sample_compressed.pdf"
          inputSize={5000}
          onDownload={() => {}}
          onClose={() => {}}
        />
      </FileProvider>
    );

    await waitFor(() => {
      expect(getHistory()).toHaveLength(1);
    });
    const entry = getHistory()[0];
    expect(entry.tool).toBe('compress');
    expect(entry.inputSize).toBe(5000);
    expect(entry.outputSize).toBe(120);

    // Re-rendering should not duplicate
    rerender(
      <FileProvider>
        <ProgressModal
          isOpen={true}
          isComplete={true}
          currentToolId="compress"
          resultBlob={outBlob}
          resultFileName="sample_compressed.pdf"
          inputSize={5000}
          onDownload={() => {}}
          onClose={() => {}}
        />
      </FileProvider>
    );
    expect(getHistory()).toHaveLength(1);

    // skipHistory=true prevents duplicate recording
    localStorage.clear();
    render(
      <FileProvider>
        <ProgressModal
          isOpen={true}
          isComplete={true}
          currentToolId="redact"
          skipHistory={true}
          resultBlob={outBlob}
          resultFileName="secret.pdf"
          onDownload={() => {}}
          onClose={() => {}}
        />
      </FileProvider>
    );
    expect(getHistory()).toHaveLength(0);
  });
});

