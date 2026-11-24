import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import PWARegistration from '../../src/app/components/PWARegistration.js';

describe('PWARegistration & Service Worker dev-safety', () => {
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker,
    });
  });

  test('unregisters existing service workers in non-production environments', async () => {
    const unregisterMock = jest.fn().mockResolvedValue(true);
    const registerMock = jest.fn();

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: registerMock,
        getRegistrations: jest.fn().mockResolvedValue([{ unregister: unregisterMock }]),
      },
    });

    render(<PWARegistration />);

    await waitFor(() => {
      expect(unregisterMock).toHaveBeenCalledTimes(1);
    });
    expect(registerMock).not.toHaveBeenCalled();
  });

  test('public/sw.js uses v3 cache version and bypasses localhost /_next/ and HMR requests', () => {
    const sw = fs.readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf8');
    expect(sw).toContain("const CACHE_VERSION = 'v3'");
    expect(sw).toContain('/_next/webpack-hmr');
    expect(sw).toContain("IS_LOCALHOST && url.pathname.startsWith('/_next/')");
  });
});

