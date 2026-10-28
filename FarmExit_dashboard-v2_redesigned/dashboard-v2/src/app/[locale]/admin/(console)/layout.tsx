import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { LoadingState, PageContainer } from '@/components/ui';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { AppShell } from '@/components/layout';
import { assertSharedConsoleSession, getAdminSession } from '@/lib/admin/session.server';
import { staffHasConsoleAccess } from '@/lib/admin/staff-permissions';
import { routing } from '@/i18n/routing';

export default async function AdminConsoleLayout({ children, params }: LayoutProps<'/[locale]/admin'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('admin');
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p role="status">{t('loading')}</p>
          <LoadingState />
        </PageContainer>
      }
    >
      <AuthenticatedConsole locale={locale}>{children}</AuthenticatedConsole>
    </Suspense>
  );
}

async function AuthenticatedConsole({ locale, children }: { locale: string; children: React.ReactNode }) {
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
  return <AppShell staff={staff}>{children}</AppShell>;
}
