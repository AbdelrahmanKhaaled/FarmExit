import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/components/ui';
import { DetailWorkspace } from '@/components/ui/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/components/ui/workspace/DataTable';
import { EmbeddedRequestForwardingSection } from '@/features/admin/requests/EmbeddedRequestForwardingSection';
import { ProposalActionsPanel } from '@/features/admin/workflows/ProposalActionsPanel';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { StaffPermission, staffHasPermission } from '@/lib/admin/staff-permissions';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type Proposal = {
  id: string;
  requestNumber: string;
  listingId: string;
  proposalKind: string;
  proposedTotalValue: number | null;
  currency: string;
  requestedSharePercent: string | null;
  proposalNotes: string | null;
  status: string;
  components: { id: string; componentType: string; proposedValue: number | null; assetDescription: string | null }[];
};

export default async function ProposalDetailPage({ params }: PageProps<'/[locale]/admin/proposals/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'proposalDetail');
  const t = await getTranslations('admin.proposalDetail');
  const res = await apiFetchAdminResult<Proposal>(`/staff/purchase-proposals/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const p = res.data;
  const { caseAgentOptions } = await loadStaffOptionSets(session.accessToken);
  const canForward = staffHasPermission(session.staff, StaffPermission.RequestsForward);

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/proposals"
        backLabel={t('back')}
        title={p.requestNumber}
        subtitle={<EnumLabel value={p.proposalKind} group="proposalKind" />}
        status={p.status}
        refreshLabel={t('refresh')}
      />
      <DetailWorkspace
        main={
          <>
            <div className="admin-detail-panel">
              <p className="mb-4 text-xs text-[var(--admin-text-muted)]">{t('nonBinding')}</p>
              <dl className="admin-detail-dl sm:grid-cols-2">
                <div>
                  <dt>{t('listing')}</dt>
                  <dd>
                    <Link href={`/admin/listings/${p.listingId}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                      {p.listingId}
                    </Link>
                  </dd>
                </div>
                {p.proposedTotalValue != null ? (
                  <div>
                    <dt>{t('totalValue')}</dt>
                    <dd className="tabular-nums">{p.proposedTotalValue} {p.currency}</dd>
                  </div>
                ) : null}
                {p.requestedSharePercent ? (
                  <div>
                    <dt>{t('shareInterest')}</dt>
                    <dd className="tabular-nums">{p.requestedSharePercent}%</dd>
                  </div>
                ) : null}
              </dl>
              {p.proposalNotes ? <p className="mt-4 whitespace-pre-wrap text-sm">{p.proposalNotes}</p> : null}
            </div>
            <div className="admin-detail-panel">
              <h2 className="mb-3 text-sm font-semibold">{t('components')}</h2>
              <DataTable embedded>
                <thead><tr><Th>{t('col.type')}</Th><Th>{t('col.value')}</Th><Th>{t('col.notes')}</Th></tr></thead>
                <tbody>
                  {p.components.map((c) => (
                    <tr key={c.id}>
                      <Td>{c.componentType}</Td>
                      <Td className="tabular-nums">{c.proposedValue ?? '—'}</Td>
                      <Td>{c.assetDescription ?? '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
            <Link href={`/admin/requests/${p.id}`} className="text-xs font-semibold text-[var(--admin-brand-primary)] hover:underline">
              {t('unifiedRequest')}
            </Link>
            <EmbeddedRequestForwardingSection
              requestId={p.id}
              accessToken={session.accessToken}
              canForward={canForward}
              canRecordDecision={canForward}
            />
          </>
        }
        aside={<ProposalActionsPanel proposalId={p.id} caseAgentOptions={caseAgentOptions} />}
      />
    </PageContainer>
  );
}
