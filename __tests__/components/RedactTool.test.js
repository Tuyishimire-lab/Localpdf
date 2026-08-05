import React from 'react';
import { render, screen } from '@testing-library/react';
import { FileProvider } from '../../src/context/FileContext.js';

// Mock pdfEngine to avoid pdfjs-dist ESM import.meta syntax issues in Jest jsdom
jest.mock('../../src/lib/pdfEngine.js', () => ({
  loadPdf: jest.fn().mockResolvedValue({
    numPages: 2,
    getPage: jest.fn().mockResolvedValue({
      getViewport: jest.fn().mockReturnValue({ width: 600, height: 800 }),
      render: jest.fn().mockReturnValue({ promise: Promise.resolve() }),
      getTextContent: jest.fn().mockResolvedValue({ items: [] }),
    }),
  }),
}));

import RedactTool from '../../src/app/components/tools/RedactTool.js';

describe('RedactTool', () => {
  test('renders workspace with title and upload dropzone', () => {
    render(
      <FileProvider>
        <RedactTool />
      </FileProvider>
    );
    expect(screen.getByText('Redact & Sanitize PDF')).toBeInTheDocument();
    expect(screen.getByText('Select PDF files')).toBeInTheDocument();
    expect(screen.getByText('or drag and drop them here')).toBeInTheDocument();
  });
});
