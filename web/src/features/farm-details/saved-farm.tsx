'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

/*
 * Save / favourite state for one Farm Details page. The gallery heart, the Request Panel "Save farm" row and the
 * Sticky Action Bar heart are one control, so they share this state. In-page only until accounts exist.
 */
const SavedFarmContext = createContext<{ saved: boolean; toggle: () => void } | null>(null);

export function SavedFarmProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState(false);
  return (
    <SavedFarmContext.Provider value={{ saved, toggle: () => setSaved((v) => !v) }}>
      {children}
    </SavedFarmContext.Provider>
  );
}

export function useSavedFarm() {
  const value = useContext(SavedFarmContext);
  if (!value) throw new Error('useSavedFarm must be used inside <SavedFarmProvider>');
  return value;
}
