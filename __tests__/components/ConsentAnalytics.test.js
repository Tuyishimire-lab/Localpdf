import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('@vercel/analytics/react', () => ({
  Analytics: () => <div data-testid="vercel-analytics" />,
}));

jest.mock('next/script', () => {
  return function MockScript({ id, src }) {
    return <div data-testid={id || src} data-src={src} />;
  };
});

import ConsentAnalytics from '../../src/app/components/ConsentAnalytics.js';
import { CONSENT_STORAGE_KEY, CONSENT_EVENT } from '../../src/app/components/CookieConsent.js';
import { setAirGapped, AIRGAP_STORAGE_KEY } from '../../src/lib/airgap.js';

describe('ConsentAnalytics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders nothing when consent has not been granted', () => {
    render(<ConsentAnalytics />);
    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('google-analytics')).not.toBeInTheDocument();
  });

  test('renders nothing when consent is declined', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'declined');
    render(<ConsentAnalytics />);
    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('google-analytics')).not.toBeInTheDocument();
  });

  test('mounts analytics scripts when consent is accepted', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    render(<ConsentAnalytics />);
    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('google-analytics')).toBeInTheDocument();
  });

  test('mounts analytics dynamically when consent event fires', () => {
    render(<ConsentAnalytics />);
    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();

    act(() => {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
      window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: 'accepted' }));
    });

    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('google-analytics')).toBeInTheDocument();
  });

  test('suppresses analytics when Strict Air-Gapped Mode is enabled even with accepted consent', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    localStorage.setItem(AIRGAP_STORAGE_KEY, 'true');
    render(<ConsentAnalytics />);
    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('google-analytics')).not.toBeInTheDocument();
  });

  test('unmounts analytics immediately when setAirGapped(true) is called', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    render(<ConsentAnalytics />);
    expect(screen.getByTestId('vercel-analytics')).toBeInTheDocument();

    act(() => {
      setAirGapped(true);
    });

    expect(screen.queryByTestId('vercel-analytics')).not.toBeInTheDocument();
    expect(screen.queryByTestId('google-analytics')).not.toBeInTheDocument();
  });
});

