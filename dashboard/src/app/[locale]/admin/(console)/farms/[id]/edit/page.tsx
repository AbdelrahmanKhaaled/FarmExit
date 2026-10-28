import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/components/ui';
import ConsoleLoading from '@/app/[locale]/admin/(console)/loading';
import { FarmWizard, type EditableFarm } from '@/features/admin/farms/FarmWizard';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { requireConsolePage } from '@/lib/admin/console-page';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
async function Content({ params }: { params: Promise<{ locale: string; id?: string }> }) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'farms');
  if (!session.staff.roles.includes('superAdmin')) {
    redirect({ href: '/admin/forbidden', locale });
    throw new Error('REDIRECT');
  }
  const t = await getTranslations('batch');
  const [options, initial] = await Promise.all([
    apiFetchAdmin<{ governorates: string[] }>('/staff/admin/farm-filter-options', session.accessToken),
    id
      ? apiFetchAdmin<EditableFarm>('/staff/admin/farms/' + id + '/edit', session.accessToken)
      : Promise.resolve(undefined),
  ]);
  return (
    <PageContainer>
      <AdminListPageHeader
        eyebrow={t('farmRegistry')}
        title={t(id ? 'editFarm' : 'addFarm')}
        description={t('registryNote')}
        refreshLabel={t('refresh')}
      />
      <FarmWizard initial={initial} governorates={options.governorates} />
    </PageContainer>
  );
}
export default function Page(props: Parameters<typeof Content>[0]) {
  return (
    <Suspense fallback={<ConsoleLoading />}>
      <Content {...props} />
    </Suspense>
  );
}
