import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { AdminShell } from '@/features/admin/AdminShell';
import { assertSharedConsoleSession, getAdminSession } from '@/lib/admin/session.server';
import { staffHasConsoleAccess } from '@/lib/admin/staff-permissions';
import { routing } from '@/i18n/routing';

export default async function AdminConsoleLayout({
  children,
  params,
}: LayoutProps<'/[locale]/admin'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const raw = await getAdminSession();
  if (!raw) {
    redirect({ href: '/admin/login', locale });
    throw new Error('REDIRECT');
  }
  if (!staffHasConsoleAccess(raw.staff)) {
    redirect({ href: '/admin/forbidden', locale });
    throw new Error('REDIRECT');
  }
  const { staff } = assertSharedConsoleSession(raw);
  return <AdminShell staff={staff}>{children}</AdminShell>;
}
