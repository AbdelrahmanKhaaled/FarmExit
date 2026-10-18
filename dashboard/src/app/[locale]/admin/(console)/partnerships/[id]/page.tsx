import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer } from '@/design-system';
import { DataTable, Td, Th } from '@/design-system/workspace/DataTable';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { decidePartnershipRequestAction } from '@/features/admin/actions/workflows';
import { SpecializedWorkflowPanel } from '@/features/admin/workflows/SpecializedWorkflowPanel';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { loadStaffOptionSets } from '@/lib/admin/assignable-staff.server';
import { apiFetchAdmin, apiFetchAdminResult, getAdminSession } from '@/lib/admin/session.server';
import { routing } from '@/i18n/routing';

type Item = { id: string; requestNumber: string; farmId: string; farmName: string; status: string; description: string | null; reviews: { decision: string; comment: string | null }[] };

export default async function PartnershipDetailPage({ params }: PageProps<'/[locale]/admin/partnerships/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.isAdmin) return null;
  const t = await getTranslations('admin.partnershipDetail');
  const res = await apiFetchAdminResult<Item>(`/staff/partnership-requests/${id}`, session.accessToken);
  if (!res.ok) notFound();
  const item = res.data;
  const staff = await loadStaffOptionSets(session.accessToken);
  const apps = await apiFetchAdmin<{ items: { id: string; status: string }[] }>(`/staff/partnership-requests/${id}/applications?page=1&pageSize=20`, session.accessToken);

  return (
    <PageContainer>
      <Link href="/admin/partnerships" className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('back')}</Link>
      <div className="mb-6 mt-1 flex justify-between"><h1 className="text-2xl font-semibold">{item.requestNumber}</h1><RefreshButton label={t('refresh')} /></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(18rem,22rem)]">
        <div className="space-y-3 text-sm">
          <StatusBadge status={item.status} />
          <p><Link href={`/admin/farms/${item.farmId}`} className="text-[var(--admin-brand-primary)] hover:underline">{item.farmName}</Link></p>
          {item.description ? <p className="whitespace-pre-wrap">{item.description}</p> : null}
          <Link href={`/admin/requests/${item.id}`} className="text-xs text-[var(--admin-brand-primary)] hover:underline">{t('unifiedRequest')}</Link>
          <h2 className="font-semibold">{t('applications')}</h2>
          <DataTable><thead><tr><Th>{t('col.id')}</Th><Th>{t('col.status')}</Th></tr></thead><tbody>{apps.items.map((a) => (<tr key={a.id}><Td><Link href={`/admin/partnerships/applications/${a.id}`} className="hover:underline">{a.id}</Link></Td><Td><StatusBadge status={a.status} /></Td></tr>))}</tbody></DataTable>
          <DataTable><thead><tr><Th>{t('col.decision')}</Th><Th>{t('col.comment')}</Th></tr></thead><tbody>{item.reviews.map((r, i) => (<tr key={i}><Td>{r.decision}</Td><Td>{r.comment ?? '—'}</Td></tr>))}</tbody></DataTable>
        </div>
        <SpecializedWorkflowPanel requestId={item.id} status={item.status} reviewerOptions={staff.reviewerOptions} caseAgentOptions={staff.caseAgentOptions} onDecide={decidePartnershipRequestAction} nonBindingNote={t('nonBinding')} />
      </div>
    </PageContainer>
  );
}
