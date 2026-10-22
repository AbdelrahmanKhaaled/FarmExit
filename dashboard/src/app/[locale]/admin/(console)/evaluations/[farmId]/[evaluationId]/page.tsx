import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DetailWorkspace } from '@/design-system/workspace/DetailWorkspace';
import { EvaluationEditPanel, type EvaluationDetail } from '@/features/admin/evaluations/EvaluationEditPanel';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { Link } from '@/i18n/navigation';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

export default async function EvaluationDetailPage({
  params,
}: PageProps<'/[locale]/admin/evaluations/[farmId]/[evaluationId]'>) {
  const { locale, farmId, evaluationId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'evaluationDetail');
  const t = await getTranslations('admin.evaluationDetail');

  const res = await apiFetchAdminResult<EvaluationDetail>(
    `/farms/${farmId}/evaluations/${evaluationId}`,
    session.accessToken,
  );
  if (!res.ok) {
    if (res.status === 404 || res.status === 403) notFound();
    throw new Error(res.message ?? evaluationId);
  }
  const evaluation = res.data;

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/evaluations"
        backLabel={t('back')}
        title={t('title', { id: evaluationId })}
        subtitle={
          <Link href={`/admin/farms/${farmId}`} className="text-sm text-[var(--admin-brand-primary)] hover:underline">
            {t('farmLink', { farmId })}
          </Link>
        }
        status={evaluation.status}
        refreshLabel={t('refresh')}
      />
      <DetailWorkspace
        main={
          <div className="admin-detail-panel">
            <EvaluationEditPanel evaluation={evaluation} />
          </div>
        }
      />
    </PageContainer>
  );
}
