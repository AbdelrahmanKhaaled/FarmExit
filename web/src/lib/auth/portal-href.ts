import type { ComponentProps } from 'react';
import type { Link } from '@/i18n/navigation';
import { accountLinks } from '@/components/layout/site-links';
import type { WebsiteSession } from './session.server';

type Href = ComponentProps<typeof Link>['href'];

/** Locale-prefixed return path for sign-in / complete-profile (e.g. `/en/my/...`). */
export function localeReturnPath(locale: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${normalized}`;
}

/** Sign-in or complete-profile when needed; otherwise a plain app path. */
export function gatedPortalHref(
  locale: string,
  session: WebsiteSession | null,
  appPath: string,
): Href {
  const returnTo = localeReturnPath(locale, appPath);
  if (!session) {
    return { pathname: accountLinks.signIn, query: { returnTo } };
  }
  if (!session.user.profileCompleted) {
    return { pathname: '/auth/complete-profile', query: { returnTo } };
  }
  return appPath;
}
