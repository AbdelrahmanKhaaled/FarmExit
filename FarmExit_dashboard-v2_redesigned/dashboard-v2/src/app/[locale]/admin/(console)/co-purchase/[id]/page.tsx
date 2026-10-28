import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/components/ui';
import { DetailWorkspace } from '@/components/ui/workspace/DetailWorkspace';
import { DataTable, Td, Th } from '@/components/ui/workspace/DataTable';
import { CoPurchaseActionsPanel } from '@/features/admin/workflows/CoPurchaseActionsPanel';
import { AdminDetailHeader } from '@/features/admin/workspace/AdminDetailHeader';
import { AdminDetailSection } from '@/features/admin/workspace/AdminDetailSection';
import { EntityLink } from '@/features/admin/workspace/EntityLink';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdminResult } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
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
  const session = await requireConsolePage(locale, 'coPurchaseDetail');
  const t = await getTranslations('admin.coPurchaseDetail');
  const res = await apiFetchAdminResult<Group>(`/staff/co-purchase-groups/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const g = res.data;
  const { caseAgentOptions } = await loadStaffOptionSets(session.accessToken);
  const memberTotal = g.members.reduce((sum, m) => sum + Number(m.proposedSharePercent), 0);

  return (
    <PageContainer>
      <AdminDetailHeader
        backHref="/admin/co-purchase"
        backLabel={t('back')}
        title={t('title', { id: g.id })}
        status={g.groupStatus}
        refreshLabel={t('refresh')}
      />
      <DetailWorkspace
        main={
          <div className="space-y-6">
            <AdminDetailSection>
              <p className="mb-3 text-xs leading-relaxed text-[var(--admin-text-muted)]">{t('nonBinding')}</p>
              <p className="mb-4 text-xs text-[var(--admin-text-muted)]">{t('aggregateNote', { total: memberTotal.toFixed(2) })}</p>
              <dl className="admin-detail-dl sm:grid-cols-2">
                <div>
                  <dt>{t('listing')}</dt>
                  <dd>
                    <Link href={`/admin/listings/${g.listingId}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                      {g.listingId}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt>{t('target')}</dt>
                  <dd className="tabular-nums">{g.targetSharePercent}%</dd>
                </div>
                <div>
                  <dt>{t('coordinator')}</dt>
                  <dd className="font-mono text-xs break-all" title={g.assignedStaffId}>{g.assignedStaffId}</dd>
                </div>
              </dl>
              {g.notes ? <p className="mt-4 whitespace-pre-wrap text-sm">{g.notes}</p> : null}
            </AdminDetailSection>
            <AdminDetailSection title={t('members')}>
              <DataTable embedded>
                <thead>
                  <tr>
                    <Th>{t('col.proposal')}</Th>
                    <Th>{t('col.share')}</Th>
                    <Th>{t('col.status')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {g.members.map((m) => (
                    <tr key={m.id}>
                      <Td>
                        <EntityLink href={`/admin/proposals/${m.proposalId}`} label={m.proposalId} />
                      </Td>
                      <Td className="tabular-nums">{m.proposedSharePercent}%</Td>
                      <Td><StatusBadge status={m.memberStatus} /></Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </AdminDetailSection>
          </div>
        }
        aside={<CoPurchaseActionsPanel groupId={g.id} staffOptions={caseAgentOptions} members={g.members} />}
      />
    </PageContainer>
  );
}
