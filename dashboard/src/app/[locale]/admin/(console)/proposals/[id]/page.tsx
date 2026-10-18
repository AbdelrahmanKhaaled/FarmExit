import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { ProposalActionsPanel } from '@/features/admin/workflows/ProposalActionsPanel';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
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
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const t = await getTranslations('admin.proposalDetail');
  const res = await apiFetchAdminResult<Proposal>(`/staff/purchase-proposals/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const p = res.data;
  const { caseAgentOptions } = await loadStaffOptionSets(session.accessToken);

  return (
    <PageContainer>
      <div className="mb-6 flex justify-between">
        <div>
          <Link href="/admin/proposals" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
          <h1 className="mt-1 text-2xl font-semibold">{p.requestNumber}</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">{p.proposalKind}</p>
        </div>
        <RefreshButton label={t('refresh')} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(18rem,22rem)]">
        <div className="space-y-4 text-sm">
          <StatusBadge status={p.status} />
          <p className="text-xs text-[var(--admin-text-muted)]">{t('nonBinding')}</p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div><dt className="text-[var(--admin-text-muted)]">{t('listing')}</dt><dd><Link href={`/admin/listings/${p.listingId}`} className="text-[var(--admin-brand-primary)] hover:underline">{p.listingId}</Link></dd></div>
            {p.proposedTotalValue != null ? <div><dt className="text-[var(--admin-text-muted)]">{t('totalValue')}</dt><dd>{p.proposedTotalValue} {p.currency}</dd></div> : null}
            {p.requestedSharePercent ? <div><dt className="text-[var(--admin-text-muted)]">{t('shareInterest')}</dt><dd>{p.requestedSharePercent}%</dd></div> : null}
          </dl>
          {p.proposalNotes ? <p className="whitespace-pre-wrap">{p.proposalNotes}</p> : null}
          <h2 className="text-sm font-semibold">{t('components')}</h2>
          <DataTable>
            <thead><tr><Th>{t('col.type')}</Th><Th>{t('col.value')}</Th><Th>{t('col.notes')}</Th></tr></thead>
            <tbody>
              {p.components.map((c) => (
                <tr key={c.id}>
                  <Td>{c.componentType}</Td>
                  <Td>{c.proposedValue ?? '—'}</Td>
                  <Td>{c.assetDescription ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <Link href={`/admin/requests/${p.id}`} className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('unifiedRequest')}</Link>
        </div>
        <ProposalActionsPanel proposalId={p.id} caseAgentOptions={caseAgentOptions} />
      </div>
    </PageContainer>
  );
}
