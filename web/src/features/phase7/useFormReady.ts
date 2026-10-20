'use client';
import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
/** Keep SSR controls disabled until their client event handlers can retain edits. */
export function useFormReady() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
