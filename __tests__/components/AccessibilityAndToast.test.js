import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import DragDropZone from '../../src/app/components/DragDropZone.js';
import ProgressModal from '../../src/app/components/ProgressModal.js';
import { FileProvider } from '../../src/context/FileContext.js';
import { ToastProvider, toast } from '../../src/context/ToastContext.js';

describe('Accessibility & Toast Notifications', () => {
  test('DragDropZone is keyboard-focusable and triggers file input on Enter and Space', () => {
    const onFilesSelected = jest.fn();
    const { container } = render(<DragDropZone onFilesSelected={onFilesSelected} />);

    const dropButton = screen.getByRole('button', { name: /select pdf files/i });
    expect(dropButton).toHaveAttribute('tabindex', '0');

    const fileInput = container.querySelector('input[type="file"]');
    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});

    fireEvent.keyDown(dropButton, { key: 'Enter' });
    fireEvent.keyDown(dropButton, { key: ' ' });
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  test('DragDropZone stops input click bubbling (prevents infinite recursion) and passes selected files', () => {
    const onFilesSelected = jest.fn();
    const { container } = render(<DragDropZone onFilesSelected={onFilesSelected} />);

    const dropButton = screen.getByRole('button', { name: /select pdf files/i });
    const fileInput = container.querySelector('input[type="file"]');

    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {
      fileInput.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    fireEvent.click(dropButton);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const samplePdf = new File(['%PDF-1.4'], 'sample.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [samplePdf] } });
    expect(onFilesSelected).toHaveBeenCalledWith([samplePdf]);
  });

  test('ProgressModal exposes dialog semantics and closes on Escape when complete', () => {
    const onClose = jest.fn();
    render(
      <FileProvider>
        <ProgressModal
          isOpen={true}
          isComplete={true}
          onDownload={jest.fn()}
          onClose={onClose}
        />
      </FileProvider>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('ToastProvider displays and dismisses toast.error and toast.success notifications', () => {
    render(
      <ToastProvider>
        <div>App</div>
      </ToastProvider>
    );

    act(() => {
      toast.error('Failed to load PDF file.');
      toast.success('Text copied to clipboard!');
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load PDF file.');
    expect(screen.getByRole('status')).toHaveTextContent('Text copied to clipboard!');

    const dismissBtns = screen.getAllByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissBtns[0]);
    expect(screen.queryByText('Failed to load PDF file.')).not.toBeInTheDocument();
  });
});

