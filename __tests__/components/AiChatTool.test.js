import React, { StrictMode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileProvider } from '../../src/context/FileContext.js';
import { loadPdf } from '../../src/lib/pdfEngine.js';

const cancelMocks = [];

// Mock pdfEngine to avoid pdfjs-dist ESM import.meta syntax issues in Jest jsdom
jest.mock('../../src/lib/pdfEngine.js', () => ({
  loadPdf: jest.fn().mockImplementation(async () => ({
    numPages: 3,
    getPage: jest.fn().mockResolvedValue({
      getViewport: jest.fn().mockReturnValue({ width: 600, height: 800 }),
      render: jest.fn().mockImplementation(() => {
        const cancel = jest.fn();
        cancelMocks.push(cancel);
        return { promise: Promise.resolve(), cancel };
      }),
      getTextContent: jest.fn().mockResolvedValue({
        items: [{ str: 'Sample document text for AI summarizer testing.' }],
      }),
    }),
  })),
}));

import AiChatTool, { parseAiAnswerForDisplay } from '../../src/app/components/tools/AiChatTool.js';

describe('AiChatTool', () => {
  beforeEach(() => {
    cancelMocks.length = 0;
  });

  test('renders workspace with title and upload dropzone', () => {
    render(
      <FileProvider>
        <AiChatTool />
      </FileProvider>
    );
    expect(screen.getByText('AI PDF Summarizer & Chat')).toBeInTheDocument();
    expect(screen.getByText('Select PDF files')).toBeInTheDocument();
    expect(screen.getByText('or drag and drop them here')).toBeInTheDocument();
  });

  test('cancels in-flight canvas render tasks cleanly under StrictMode and rapid page changes', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <StrictMode>
        <FileProvider>
          <AiChatTool />
        </FileProvider>
      </StrictMode>
    );

    const fileInput = container.querySelector('input[type="file"]');
    const samplePdf = new File(['%PDF-1.4'], 'strict-test.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [samplePdf] } });

    await waitFor(() => {
      expect(loadPdf).toHaveBeenCalled();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Next page'));
    await waitFor(() => {
      expect(cancelMocks.length).toBeGreaterThanOrEqual(1);
    });
    expect(errorSpy).not.toHaveBeenCalledWith('Error rendering page:', expect.anything());
    errorSpy.mockRestore();
  });

  test('scales wide widescreen PDF pages down cleanly below 0.8 to fit container without clipping', async () => {
    loadPdf.mockResolvedValueOnce({
      numPages: 1,
      getPage: jest.fn().mockResolvedValue({
        getViewport: jest.fn(({ scale }) => ({
          width: 1920 * scale,
          height: 1080 * scale,
        })),
        render: jest.fn().mockReturnValue({ promise: Promise.resolve(), cancel: jest.fn() }),
        getTextContent: jest.fn().mockResolvedValue({
          items: [{ str: 'Widescreen deck slide content.' }],
        }),
      }),
    });

    const { container } = render(
      <FileProvider>
        <AiChatTool />
      </FileProvider>
    );

    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, {
      target: { files: [new File(['%PDF-1.4'], 'slides.pdf', { type: 'application/pdf' })] },
    });

    await waitFor(() => {
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
      expect(canvas.style.width).toMatch(/px$/);
      const cssWidth = parseInt(canvas.style.width, 10);
      expect(cssWidth).toBeGreaterThan(200);
      expect(cssWidth).toBeLessThanOrEqual(650);
    });
  });

  test('parseAiAnswerForDisplay separates context excerpt and strips PDF noise', () => {
    const raw =
      '#### Summary\nBased on [Page 5]: "**RECOMMENDED BRAND ARCHITECTURE** ????????????"\n\nContext excerpt: "...```typescript // catalog.ts``` #### Legal Analysis..."';
    const parsed = parseAiAnswerForDisplay(raw);
    expect(parsed.mainText).toContain('RECOMMENDED BRAND ARCHITECTURE');
    expect(parsed.mainText).not.toContain('????');
    expect(parsed.mainText).not.toContain('####');
    expect(parsed.contextExcerpt).toContain('catalog.ts');
    expect(parsed.contextExcerpt).not.toContain('```typescript');
  });
});
