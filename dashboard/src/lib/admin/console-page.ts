import 'server-only';

import { redirect } from '@/i18n/navigation';
import type { AdminSession } from './session.server';
import { getAdminSession } from './session.server';
import { canAccessConsoleRoute, type ConsoleRouteKey } from './console-routes';
import { staffHasConsoleAccess } from './staff-permissions';

export async function requireConsolePage(locale: string, routeKey: ConsoleRouteKey): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect({ href: '/admin/login', locale });
    throw new Error('REDIRECT');
  }
  if (!staffHasConsoleAccess(session.staff)) {
    redirect({ href: '/admin/forbidden', locale });
    throw new Error('REDIRECT');
  }
  if (!canAccessConsoleRoute(session.staff, routeKey)) {
    redirect({ href: '/admin/forbidden', locale });
    throw new Error('REDIRECT');
  }
  return session;
}
