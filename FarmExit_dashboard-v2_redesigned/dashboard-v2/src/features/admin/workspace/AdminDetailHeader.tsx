import { Link } from '@/i18n/navigation';
import { RefreshButton } from '@/features/admin/RefreshButton';
import { StatusBadge } from './StatusBadge';

export function AdminDetailHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  status,
  statusGroup = 'status',
  refreshLabel,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: React.ReactNode;
  status?: string;
  statusGroup?: 'status' | 'caseStatus' | 'accountStatus';
  refreshLabel: string;
}) {
  return (
    <header className="luxe-page-head flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Link href={backHref} className="text-xs font-semibold text-[var(--admin-brand-primary)] hover:underline">
          {backLabel}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="luxe-page-head__title">{title}</h1>
          {status ? <StatusBadge status={status} group={statusGroup} /> : null}
        </div>
        {subtitle ? <p className="luxe-page-head__desc mt-1">{subtitle}</p> : null}
      </div>
      <RefreshButton label={refreshLabel} />
    </header>
  );
}
