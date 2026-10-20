'use client';

import { useEffect, useState } from 'react';
import type { NavbarUser } from './Navbar';
import { toNavbarUser } from '@/lib/auth/navbar-user';
import type { AuthUser } from '@/lib/auth/types';

/** Read HttpOnly session state through the BFF; never prerender a signed-in visitor as a guest. */
export function useNavbarSession(initialUser?: NavbarUser) {
  const [session, setSession] = useState<{ user?: NavbarUser; pending: boolean }>({ pending: true });
  useEffect(() => {
    if (initialUser) return;
    let active = true;
    let running = false;
    const controller = new AbortController();
    async function readSession() {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal });
        if (response.ok) {
          const user = (await response.json()) as AuthUser;
          if (active) setSession({ user: toNavbarUser(user), pending: false });
        } else if (response.status === 401 && active) {
          setSession({ pending: false });
        }
      } catch {
        // An unavailable API does not prove that a visitor is signed out.
      } finally {
        running = false;
      }
    }
    const onVisible = () => void readSession();
    void readSession();
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [initialUser]);
  return initialUser ? { user: initialUser, pending: false } : session;
}
