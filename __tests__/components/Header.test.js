import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/tools/compress'),
}));

import Header from '../../src/app/components/Header.js';

describe('Header', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  test('syncs stored light theme without hydration mismatch and toggles theme cleanly', () => {
    localStorage.setItem('localpdf_theme', 'light');
    render(<Header />);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    const toggleBtn = screen.getByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(toggleBtn);

    expect(localStorage.getItem('localpdf_theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  test('marks active route and closes mobile drawer on Escape', () => {
    render(<Header />);

    const toolsLink = screen.getByRole('link', { name: 'Tools' });
    expect(toolsLink).toHaveAttribute('aria-current', 'page');

    const menuBtn = screen.getByRole('button', { name: /open menu/i });
    expect(menuBtn).toHaveAttribute('aria-controls', 'primary-nav');
    expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuBtn);
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute('aria-expanded', 'false');
  });
});

