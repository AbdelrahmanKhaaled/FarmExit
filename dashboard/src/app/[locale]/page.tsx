import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

/** Locale root sends operators to the admin console or login. */
export default async function LocaleRootPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  redirect({ href: session?.isAdmin ? '/admin' : '/admin/login', locale });
}
