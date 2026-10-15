'use client';

import { useSyncExternalStore } from 'react';

let currentTime = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const subscribers = new Set<() => void>();
const snapshot = () => currentTime;
const serverSnapshot = () => 0;

function subscribe(notify: () => void) {
  subscribers.add(notify);
  if (!timer) {
    currentTime = Date.now();
    timer = setInterval(() => {
      currentTime = Date.now();
      subscribers.forEach(listener => listener());
    }, 60_000);
  }
  return () => {
    subscribers.delete(notify);
    if (!subscribers.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useCurrentTime() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
