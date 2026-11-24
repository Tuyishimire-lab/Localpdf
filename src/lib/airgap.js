/**
 * airgap.js – Strict Air-Gapped / Zero-External-Request mode state & subscriptions.
 * Stored locally under `localpdf_airgapped` so users can disable optional analytics
 * and block non-local CDN fallbacks (such as non-English OCR language packs).
 */

export const AIRGAP_STORAGE_KEY = 'localpdf_airgapped';
export const AIRGAP_EVENT = 'localpdf-airgap-change';

function getSafeStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // ignore storage access restrictions
  }
  return null;
}

export function isAirGapped() {
  const storage = getSafeStorage();
  if (!storage) return false;
  try {
    return storage.getItem(AIRGAP_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAirGapped(enabled) {
  const next = Boolean(enabled);
  const storage = getSafeStorage();
  if (storage) {
    try {
      storage.setItem(AIRGAP_STORAGE_KEY, next ? 'true' : 'false');
    } catch {
      // ignore storage quota errors
    }
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof Event === 'function'
  ) {
    window.dispatchEvent(new Event(AIRGAP_EVENT));
  }

  return next;
}

export function subscribeAirGap(callback) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  const handleStorage = (e) => {
    if (!e || e.key === null || e.key === AIRGAP_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener(AIRGAP_EVENT, callback);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(AIRGAP_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
  };
}

export function getAirGapServerSnapshot() {
  return false;
}

