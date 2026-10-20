import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { MyFarmExitLayout } from '@/features/my-farmexit/MyFarmExitLayout';
import { requireWebsiteSession } from '@/lib/auth/require-session';

export const instant = false;
export const metadata = { robots: { index: false, follow: false } };

export default async function MyPortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await requireWebsiteSession(locale, `/${locale}/my`);
  return <MyFarmExitLayout session={session}>{children}</MyFarmExitLayout>;
}
