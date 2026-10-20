'use client';

import type { PendingIntent } from './contracts';

const KEY = 'fx_pending_intent';

export const intentStore = {
  save(intent: PendingIntent): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(KEY, JSON.stringify(intent));
  },
  consume(): PendingIntent | null {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    try {
      return JSON.parse(raw) as PendingIntent;
    } catch {
      return null;
    }
  },
  clear(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(KEY);
  },
};
