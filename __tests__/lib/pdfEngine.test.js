jest.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: jest.fn(),
}));

import { renderPageToBlob, renderPageToDataUrl } from '../../src/lib/pdfEngine.js';

describe('pdfEngine', () => {
  let originalCreateElement;
  let mockCanvas;
  let mockContext;
  let mockPage;
  let mockPdfDoc;

  beforeEach(() => {
    originalCreateElement = document.createElement.bind(document);
    mockContext = {};
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => mockContext),
      toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
      toBlob: jest.fn((cb, mimeType, quality) => {
        cb(new Blob(['img'], { type: mimeType || 'image/png' }));
      }),
    };
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return mockCanvas;
      return originalCreateElement(tag);
    });

    mockPage = {
      getViewport: jest.fn(({ scale }) => ({ width: 100 * scale, height: 200 * scale })),
      render: jest.fn(() => ({ promise: Promise.resolve() })),
      cleanup: jest.fn(),
    };
    mockPdfDoc = {
      getPage: jest.fn(async () => mockPage),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renderPageToBlob passes image/png without quality and cleans up page & canvas', async () => {
    const blob = await renderPageToBlob(mockPdfDoc, 1, 2.0, 'image/png');
    expect(blob).toBeInstanceOf(Blob);
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
    expect(mockPage.cleanup).toHaveBeenCalledTimes(1);
    expect(mockCanvas.width).toBe(0);
    expect(mockCanvas.height).toBe(0);
  });

  test('renderPageToBlob passes image/jpeg and custom quality', async () => {
    const blob = await renderPageToBlob(mockPdfDoc, 1, 1.0, 'image/jpeg', 0.55);
    expect(blob).toBeInstanceOf(Blob);
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.55);
    expect(mockPage.cleanup).toHaveBeenCalledTimes(1);
  });

  test('renderPageToBlob rejects when canvas.toBlob returns null', async () => {
    mockCanvas.toBlob.mockImplementation((cb) => cb(null));
    await expect(renderPageToBlob(mockPdfDoc, 1, 2.0, 'image/jpeg', 0.8)).rejects.toThrow(
      /Failed to render page to image blob/
    );
    expect(mockPage.cleanup).toHaveBeenCalledTimes(1);
    expect(mockCanvas.width).toBe(0);
    expect(mockCanvas.height).toBe(0);
  });

  test('renderPageToDataUrl cleans up page and resets canvas dimensions', async () => {
    const url = await renderPageToDataUrl(mockPdfDoc, 1, 0.5);
    expect(url).toBe('data:image/png;base64,abc');
    expect(mockPage.cleanup).toHaveBeenCalledTimes(1);
    expect(mockCanvas.width).toBe(0);
    expect(mockCanvas.height).toBe(0);
  });
});

