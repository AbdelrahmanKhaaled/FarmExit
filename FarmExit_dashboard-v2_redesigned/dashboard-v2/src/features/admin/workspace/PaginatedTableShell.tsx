import { DataTable } from '@/components/ui/workspace/DataTable';
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
    <div className="luxe-card admin-table-shell overflow-hidden p-0 shadow-[var(--admin-shadow-card)]">
      <DataTable embedded>{children}</DataTable>
      <TablePaginationLinks {...pagination} />
    </div>
  );
}
