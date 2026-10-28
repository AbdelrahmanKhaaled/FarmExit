import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Td, Th } from '@/components/ui/workspace/DataTable';
import { EntityLink } from '@/features/admin/workspace/EntityLink';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import type { StaffRequestList } from '@/lib/api/types/staff';
export async function OverviewRequestsTable({ data }: { data: StaffRequestList }) {
  const t = await getTranslations('admin.overview');
  const loc = await getLocale();

  return (
    <section className="luxe-card overflow-hidden">
      <div className="luxe-table-toolbar">
        <div>
          <h2 className="luxe-card-header__title">{t('requestsTableTitle')}</h2>
          <p className="luxe-card-header__desc">{t('requestsTableDesc')}</p>
        </div>
        <Link href="/admin/requests" className="admin-btn-secondary text-xs">
          {t('viewAllRequests')}
        </Link>
      </div>
      {data.items.length === 0 ? (
        <p className="p-6 text-sm text-[var(--admin-text-muted)]">{t('requestsTableEmpty')}</p>
      ) : (
        <div className="admin-table-shell overflow-x-auto border-0 shadow-none">
          <table className="admin-data-table w-full min-w-[48rem] border-collapse text-[var(--admin-text-sm)]">
            <thead>
              <tr>
                <Th>{t('requestsCol.id')}</Th>
                <Th>{t('requestsCol.type')}</Th>
                <Th>{t('requestsCol.farm')}</Th>
                <Th>{t('requestsCol.status')}</Th>
                <Th>{t('requestsCol.created')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <EntityLink href={`/admin/requests/${row.id}`} label={row.requestNumber} />
                  </Td>
                  <Td><EnumLabel value={row.requestType} group="requestType" /></Td>
                  <Td className="max-w-[12rem] truncate">{row.farm?.name ?? '—'}</Td>
                  <Td><StatusBadge status={row.status} /></Td>
                  <Td className="tabular-nums text-[var(--admin-text-muted)]">
                    {new Intl.DateTimeFormat(loc, { dateStyle: 'medium' }).format(new Date(row.createdAt))}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
