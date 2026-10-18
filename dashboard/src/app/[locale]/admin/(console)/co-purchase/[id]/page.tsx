import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { CoPurchaseActionsPanel } from '@/features/admin/workflows/CoPurchaseActionsPanel';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

type Group = {
  id: string;
  listingId: string;
  targetSharePercent: string;
  groupStatus: string;
  notes: string | null;
  assignedStaffId: string;
  members: { id: string; proposalId: string; proposedSharePercent: string; memberStatus: string }[];
};

export default async function CoPurchaseDetailPage({ params }: PageProps<'/[locale]/admin/co-purchase/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const t = await getTranslations('admin.coPurchaseDetail');
  const res = await apiFetchAdminResult<Group>(`/staff/co-purchase-groups/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const g = res.data;
  const { caseAgentOptions } = await loadStaffOptionSets(session.accessToken);
  const memberTotal = g.members.reduce((sum, m) => sum + Number(m.proposedSharePercent), 0);

  return (
    <PageContainer>
      <Link href="/admin/co-purchase" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
      <div className="mb-6 mt-1 flex justify-between">
        <h1 className="text-2xl font-semibold">{t('title', { id: g.id })}</h1>
        <RefreshButton label={t('refresh')} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(18rem,22rem)]">
        <div className="space-y-4 text-sm">
          <p className="text-xs text-[var(--admin-text-muted)]">{t('nonBinding')}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">{t('aggregateNote', { total: memberTotal.toFixed(2) })}</p>
          <StatusBadge status={g.groupStatus} />
          <p>{t('listing')}: <Link href={`/admin/listings/${g.listingId}`} className="text-[var(--admin-brand-primary)] hover:underline">{g.listingId}</Link></p>
          <p>{t('target')}: {g.targetSharePercent}%</p>
          <p>{t('coordinator')}: {g.assignedStaffId}</p>
          {g.notes ? <p className="whitespace-pre-wrap">{g.notes}</p> : null}
          <h2 className="font-semibold">{t('members')}</h2>
          <DataTable>
            <thead><tr><Th>{t('col.proposal')}</Th><Th>{t('col.share')}</Th><Th>{t('col.status')}</Th></tr></thead>
            <tbody>
              {g.members.map((m) => (
                <tr key={m.id}>
                  <Td><Link href={`/admin/proposals/${m.proposalId}`} className="hover:underline">{m.proposalId}</Link></Td>
                  <Td>{m.proposedSharePercent}%</Td>
                  <Td><StatusBadge status={m.memberStatus} /></Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
        <CoPurchaseActionsPanel groupId={g.id} staffOptions={caseAgentOptions} />
      </div>
    </PageContainer>
  );
}
