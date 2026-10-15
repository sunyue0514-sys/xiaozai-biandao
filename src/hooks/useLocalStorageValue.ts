'use client';

import { useCallback, useSyncExternalStore } from 'react';

const CHANGE_EVENT = 'app-local-storage-change';

export function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function writeLocalStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
}

// Primitive snapshots remain stable between notifications. undefined is the
// server/hydration snapshot, distinct from a loaded but empty storage key.
export function useLocalStorageValue(key: string) {
  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === key) notify();
    };
    const onChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === key) notify();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, [key]);
  const snapshot = useCallback(() => readLocalStorage(key), [key]);
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}
