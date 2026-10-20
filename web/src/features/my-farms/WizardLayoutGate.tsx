'use client';
import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';
/** Only the approved Add Farm wizard uses its compact task header; the portal stays unchanged. */
export function WizardLayoutGate({ children, wizard }: { children: ReactNode; wizard: ReactNode }) {
  const path = usePathname();
  return path === '/my/farms/new' || /^\/my\/farms\/[^/]+\/list$/.test(path) ? wizard : children;
}
