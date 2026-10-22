import { RefreshButton } from '@/features/admin/RefreshButton';
import { Badge } from '@/design-system';

export function AdminListPageHeader({
  eyebrow,
  title,
  description,
  refreshLabel,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  refreshLabel: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-[var(--admin-border-subtle)] pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Badge variant="gold" className="mb-2 normal-case tracking-wide">{eyebrow}</Badge>
        <h1 className="text-[var(--admin-text-2xl)] font-semibold tracking-tight text-[var(--admin-text-primary)]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">{description}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {actions}
        <RefreshButton label={refreshLabel} />
      </div>
    </div>
  );
}
