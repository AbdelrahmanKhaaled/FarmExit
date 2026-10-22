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
    <div className="mb-6 flex flex-col gap-4 border-b border-[var(--admin-border-subtle)] pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Link href={backHref} className="text-xs font-semibold text-[var(--admin-brand-primary)] hover:underline">
          {backLabel}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[var(--admin-text-2xl)] font-semibold tracking-tight text-[var(--admin-text-primary)]">{title}</h1>
          {status ? <StatusBadge status={status} group={statusGroup} /> : null}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{subtitle}</p> : null}
      </div>
      <RefreshButton label={refreshLabel} />
    </div>
  );
}
