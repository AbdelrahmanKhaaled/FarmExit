'use client';

import { useEffect, useState } from 'react';
import type { NavbarUser } from './Navbar';
import { toNavbarUser } from '@/lib/auth/navbar-user';
import type { AuthUser } from '@/lib/auth/types';

/** Read HttpOnly session state through the BFF; never prerender a signed-in visitor as a guest. */
export function useNavbarSession(initialUser?: NavbarUser, sessionResolved = false) {
  const [session, setSession] = useState<{ user?: NavbarUser; pending: boolean }>(() => {
    if (initialUser) return { user: initialUser, pending: false };
    if (sessionResolved) return { pending: false };
    return { pending: true };
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let running = false;

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

    const onVisible = () => {
      if (document.visibilityState !== 'hidden') void readSession();
    };

    if (!initialUser) {
      if (!sessionResolved) void readSession();
      window.addEventListener('focus', onVisible);
      document.addEventListener('visibilitychange', onVisible);
    } else {
      window.addEventListener('focus', onVisible);
      document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      active = false;
      controller.abort();
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [initialUser, sessionResolved]);

  return session;
}
