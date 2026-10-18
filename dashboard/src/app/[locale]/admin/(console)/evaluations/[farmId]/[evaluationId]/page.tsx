import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { EvaluationEditPanel, type EvaluationDetail } from '@/features/admin/evaluations/EvaluationEditPanel';
import { Link } from '@/i18n/navigation';
import { apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

export default async function EvaluationDetailPage({
  params,
}: PageProps<'/[locale]/admin/evaluations/[farmId]/[evaluationId]'>) {
  const { locale, farmId, evaluationId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const t = await getTranslations('admin.evaluationDetail');

  const res = await apiFetchAdminResult<EvaluationDetail>(
    `/farms/${farmId}/evaluations/${evaluationId}`,
    session.accessToken,
  );
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) notFound();
    throw new Error(res.message ?? evaluationId);
  }

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between">
        <div>
          <Link href="/admin/evaluations" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
          <h1 className="mt-1 text-2xl font-semibold">{t('title', { id: evaluationId })}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">
            <Link href={`/admin/farms/${farmId}`} className="hover:underline">{t('farmLink', { farmId })}</Link>
          </p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>
      <EvaluationEditPanel evaluation={res.data} />
    </PageContainer>
  );
}
