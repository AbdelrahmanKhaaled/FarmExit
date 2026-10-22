import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getAdminSession } from '@/lib/admin/session.server';
import { getStaffHomePath } from '@/lib/admin/console-routes';
import { staffHasConsoleAccess } from '@/lib/admin/staff-permissions';
import { routing } from '@/i18n/routing';

/** Locale root sends operators to the admin console or login. */
export default async function LocaleRootPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  redirect({
    href: session && staffHasConsoleAccess(session.staff) ? getStaffHomePath(session.staff) : '/admin/login',
    locale,
  });
}
