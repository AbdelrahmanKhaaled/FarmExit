import { DataTable } from '@/design-system/workspace/DataTable';
import { TablePaginationLinks } from './TablePaginationLinks';

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  query: Record<string, string | undefined>;
  pathname: string;
};

export async function PaginatedTableShell({
  pagination,
  children,
}: {
  pagination: PaginationProps;
  children: React.ReactNode;
}) {
  return (
    <div className="admin-table-shell overflow-hidden rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-soft)]">
      <DataTable embedded>{children}</DataTable>
      <TablePaginationLinks {...pagination} />
    </div>
  );
}
