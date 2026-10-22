import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageContainer, EmptyState } from '@/design-system';
import { Td, Th } from '@/design-system/workspace/DataTable';
import { AdminListPageHeader } from '@/features/admin/workspace/AdminListPageHeader';
import { EnumLabel } from '@/features/admin/workspace/EnumLabel';
import { PaginatedTableShell } from '@/features/admin/workspace/PaginatedTableShell';
import { StatusBadge } from '@/features/admin/workspace/StatusBadge';
import { Link } from '@/i18n/navigation';
import { apiFetchAdmin } from '@/lib/admin/session.server';
import { requireConsolePage } from '@/lib/admin/console-page';
import { routing } from '@/i18n/routing';

type List = { items: { id: string; requestNumber: string; professionalType: string; status: string }[]; page: number; pageSize: number; total: number };

export default async function VerificationPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/verification'> & { searchParams: Promise<{ page?: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireConsolePage(locale, 'verification');
  const page = (await searchParams).page ?? '1';
  const t = await getTranslations('admin.verificationPage');
  const data = await apiFetchAdmin<List>(`/staff/professional-verification-requests?page=${page}&pageSize=10`, session.accessToken);
  const pagination = { page: data.page, pageSize: data.pageSize, total: data.total, query: {}, pathname: '/admin/verification' };

  return (
    <PageContainer>
      <AdminListPageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('desc')} refreshLabel={t('refresh')} />
      {data.items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <PaginatedTableShell pagination={pagination}>
          <thead>
            <tr>
              <Th>{t('col.request')}</Th>
              <Th>{t('col.type')}</Th>
              <Th>{t('col.status')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/admin/verification/${r.id}`} className="font-medium text-[var(--admin-brand-primary)] hover:underline">
                    {r.requestNumber}
                  </Link>
                </Td>
                <Td><EnumLabel value={r.professionalType} group="professionalType" /></Td>
                <Td><StatusBadge status={r.status} /></Td>
              </tr>
            ))}
          </tbody>
        </PaginatedTableShell>
      )}
    </PageContainer>
  );
}
