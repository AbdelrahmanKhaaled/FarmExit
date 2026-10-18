import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { decidePartnershipApplicationAction } from '@/features/admin/actions/workflows';
import { SpecializedWorkflowPanel } from '@/features/admin/workflows/SpecializedWorkflowPanel';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

type Item = {
  id: string; requestNumber: string; status: string; parentPartnershipRequestId: string; applicantKind: string | null;
  applicationMessage: string | null; whyGoodFit: string | null; companyName: string | null;
  reviews: { decision: string; comment: string | null }[];
};

export default async function PartnershipApplicationDetailPage({ params }: PageProps<'/[locale]/admin/partnerships/applications/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const t = await getTranslations('admin.partnershipApplicationDetail');
  const res = await apiFetchAdminResult<Item>(`/staff/partnership-applications/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const item = res.data;
  const staff = await loadStaffOptionSets(session.accessToken);

  return (
    <PageContainer>
      <Link href="/admin/partnerships?tab=applications" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
      <div className="mb-6 mt-1 flex justify-between"><h1 className="text-2xl font-semibold">{item.requestNumber}</h1><RefreshButton label={t('refresh')} /></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(18rem,22rem)]">
        <div className="space-y-3 text-sm">
          <StatusBadge status={item.status} />
          <p>{t('parent')}: <Link href={`/admin/partnerships/${item.parentPartnershipRequestId}`} className="text-[var(--admin-brand-primary)] hover:underline">{item.parentPartnershipRequestId}</Link></p>
          {item.applicantKind ? <p>{t('kind')}: {item.applicantKind}</p> : null}
          {item.companyName ? <p>{t('company')}: {item.companyName}</p> : null}
          {item.whyGoodFit ? <p>{item.whyGoodFit}</p> : null}
          <Link href={`/admin/requests/${item.id}`} className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('unifiedRequest')}</Link>
          <DataTable><thead><tr><Th>{t('col.decision')}</Th><Th>{t('col.comment')}</Th></tr></thead><tbody>{item.reviews.map((r, i) => (<tr key={i}><Td>{r.decision}</Td><Td>{r.comment ?? '—'}</Td></tr>))}</tbody></DataTable>
        </div>
        <SpecializedWorkflowPanel requestId={item.id} status={item.status} reviewerOptions={staff.reviewerOptions} caseAgentOptions={staff.caseAgentOptions} onDecide={decidePartnershipApplicationAction} nonBindingNote={t('nonBinding')} />
      </div>
    </PageContainer>
  );
}
