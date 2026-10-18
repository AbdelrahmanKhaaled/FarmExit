import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { decideFarmManagementAction } from '@/features/admin/actions/workflows';
import { SpecializedWorkflowPanel } from '@/features/admin/workflows/SpecializedWorkflowPanel';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

type Item = {
  id: string; requestNumber: string; farmId: string; farmName: string; professionalNeed: string; status: string;
  managementTypes: string[] | null; currentSituation: string | null; goals: string[] | null;
  reviews: { decision: string; comment: string | null }[];
};

export default async function FarmManagementDetailPage({ params }: PageProps<'/[locale]/admin/farm-management/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const t = await getTranslations('admin.farmManagementDetail');
  const res = await apiFetchAdminResult<Item>(`/staff/farm-management-requests/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const item = res.data;
  const staff = await loadStaffOptionSets(session.accessToken);

  return (
    <PageContainer>
      <Link href="/admin/farm-management" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
      <div className="mb-6 mt-1 flex justify-between"><h1 className="text-2xl font-semibold">{item.requestNumber}</h1><RefreshButton label={t('refresh')} /></div>
      <p className="mb-4 text-xs text-[var(--admin-text-muted)]">{t('noAutoManager')}</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(18rem,22rem)]">
        <div className="space-y-3 text-sm">
          <StatusBadge status={item.status} />
          <p><Link href={`/admin/farms/${item.farmId}`} className="text-[var(--admin-brand-primary)] hover:underline">{item.farmName}</Link></p>
          <p>{t('need')}: {item.professionalNeed}</p>
          {item.currentSituation ? <p className="whitespace-pre-wrap">{item.currentSituation}</p> : null}
          <Link href={`/admin/requests/${item.id}`} className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('unifiedRequest')}</Link>
          <DataTable><thead><tr><Th>{t('col.decision')}</Th><Th>{t('col.comment')}</Th></tr></thead><tbody>{item.reviews.map((r, i) => (<tr key={i}><Td>{r.decision}</Td><Td>{r.comment ?? '—'}</Td></tr>))}</tbody></DataTable>
        </div>
        <SpecializedWorkflowPanel requestId={item.id} status={item.status} reviewerOptions={staff.reviewerOptions} caseAgentOptions={staff.caseAgentOptions} onDecide={decideFarmManagementAction} />
      </div>
    </PageContainer>
  );
}
