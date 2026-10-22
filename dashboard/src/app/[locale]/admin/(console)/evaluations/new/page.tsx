import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { CreateEvaluationForm } from '@/features/admin/evaluations/CreateEvaluationForm';
import { Link } from '@/i18n/navigation';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import type { AdminFarmDetail } from '@/lib/api/types/staff';
import { routing } from '@/i18n/routing';

export default async function CreateEvaluationPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/evaluations/new'> & { searchParams: Promise<{ farmId?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'evaluations');
  const sp = await searchParams;
  const farmId = sp.farmId?.trim();
  if (!farmId) notFound();
  const t = await getTranslations('admin.evaluationCreate');
  const farmRes = await apiFetchAdminResult<AdminFarmDetail>(`/staff/admin/farms/${farmId}`, session.accessToken);
  const farmName = farmRes.ok ? farmRes.data.name : null;

  return (
    <PageContainer>
      <Link href="/admin/evaluations" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
      <h1 className="mt-2 text-2xl font-semibold">{t('title')}</h1>
      <p className="mb-6 text-sm text-[var(--admin-text-muted)]">{t('desc')}</p>
      <CreateEvaluationForm farmId={farmId} farmName={farmName} />
    </PageContainer>
  );
}
