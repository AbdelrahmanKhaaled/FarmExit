import 'server-only';

import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api/config';
import type { StaffMe } from '@/lib/api/types/admin-dashboard';
import { ADMIN_ACCESS_COOKIE } from './cookies';
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from './roles';
import { staffHasConsoleAccess, staffIsAdminScope } from './staff-permissions';

export { ADMIN_ROLE, SUPER_ADMIN_ROLE };

/** Active admin or superAdmin (full platform console scope). */
export function staffHasDashboardConsoleAccess(roles: readonly string[]): boolean {
  return staffIsAdminScope(roles);
}

/** Any approved FarmExit staff role that may use the shared dashboard. */
export function staffHasSharedConsoleAccess(roles: readonly string[]): boolean {
  return staffHasConsoleAccess({ roles: [...roles] });
}

/** Read access token from cookies only — no refresh, no cookie mutation (safe in RSC). */
export async function readAdminAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ADMIN_ACCESS_COOKIE)?.value ?? null;
}

export async function fetchStaffMe(accessToken: string): Promise<StaffMe | null> {
  const res = await fetch(`${getApiBaseUrl()}/staff/me`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) return null;
  return (await res.json()) as StaffMe;
}

export type AdminSession = {
  accessToken: string;
  staff: StaffMe;
  /** Admin or superAdmin — not case agents or reviewers. */
  isAdmin: boolean;
};

/**
 * Resolve session for Server Components — read-only cookie access.
 * Token refresh runs in middleware; invalid sessions return null (layout redirects to login).
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const accessToken = await readAdminAccessToken();
  if (!accessToken) return null;
  const staff = await fetchStaffMe(accessToken);
  if (!staff) return null;
  const isAdmin = staffIsAdminScope(staff.roles);
  return { accessToken, staff, isAdmin };
}

export type AdminConsoleSession = AdminSession & { isAdmin: true };

export function assertAdminConsoleSession(session: AdminSession): AdminConsoleSession {
  if (!session.isAdmin) {
    throw new Error('ADMIN_SESSION_REQUIRED');
  }
  return { ...session, isAdmin: true };
}

export function assertSharedConsoleSession(session: AdminSession): AdminSession {
  if (!staffHasConsoleAccess(session.staff)) {
    throw new Error('STAFF_CONSOLE_SESSION_REQUIRED');
  }
  return session;
}

export async function apiFetchAdmin<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export type AdminApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message?: string };

export async function apiFetchAdminResult<T>(path: string, accessToken: string): Promise<AdminApiResult<T>> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    let message: string | undefined;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch {
      /* ignore */
    }
    return { ok: false, status: res.status, message };
  }
  return { ok: true, data: (await res.json()) as T };
}

export async function apiMutateAdmin<T>(
  path: string,
  accessToken: string,
  init: { method: 'POST' | 'PUT' | 'PATCH'; body?: unknown },
): Promise<AdminApiResult<T>> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: init.method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    let message: string | undefined;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch {
      /* ignore */
    }
    return { ok: false, status: res.status, message };
  }
  if (res.status === 204) return { ok: true, data: undefined as T };
  return { ok: true, data: (await res.json()) as T };
}
