import { Suspense, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { MyFarmExitLayout } from '@/features/my-farmexit/MyFarmExitLayout';
import { getWebsiteSession } from '@/lib/auth/session.server';

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

  return (
    <Suspense fallback={null}>
      <AuthenticatedPortal>{children}</AuthenticatedPortal>
    </Suspense>
  );
}

async function AuthenticatedPortal({ children }: { children: ReactNode }) {
  await connection();
  const session = await getWebsiteSession();
  // Each portal page enforces its own session and preserves its specific return URL.
  if (!session) return children;
  return <MyFarmExitLayout session={session}>{children}</MyFarmExitLayout>;
}
