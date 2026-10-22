import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminOverview } from '@/features/admin/AdminOverview';
import { ErrorState, PageContainer } from '@/design-system';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { getStaffHomePath } from '@/lib/admin/console-routes';
import { staffIsAdminScope } from '@/lib/admin/staff-permissions';
import { redirect } from '@/i18n/navigation';
import type { AdminDashboardOverview, AdminWorkQueue } from '@/lib/api/types/admin-dashboard';
import { routing } from '@/i18n/routing';

export default async function AdminOverviewPage({ params }: PageProps<'/[locale]/admin'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'overview');
  if (!staffIsAdminScope(session.staff.roles)) {
    redirect({ href: getStaffHomePath(session.staff), locale });
    throw new Error('REDIRECT');
  }
  const t = await getTranslations('admin.overview');

  let overview: AdminDashboardOverview | null = null;
  let queue: AdminWorkQueue | null = null;
  let error = false;
  try {
    [overview, queue] = await Promise.all([
      apiFetchAdmin<AdminDashboardOverview>('/staff/admin/dashboard/overview', session.accessToken),
      apiFetchAdmin<AdminWorkQueue>('/staff/admin/work-queue', session.accessToken),
    ]);
  } catch {
    error = true;
  }

  if (error || !overview || !queue) {
    return (
      <PageContainer>
        <ErrorState message={t('loadError')} retryLabel={t('retry')} />
      </PageContainer>
    );
  }

  return (
    <AdminOverview
      displayName={session.staff.fullName}
      roles={session.staff.roles}
      overview={overview}
      queue={queue}
    />
  );
}
