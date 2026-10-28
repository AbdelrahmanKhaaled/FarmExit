import { Badge } from '../Badge';
import { Button } from '../Button';

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  onRefresh,
  refreshLabel,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  onRefresh?: () => void;
  refreshLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="admin-page-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <Badge variant="gold" className="mb-2 normal-case tracking-wide">{eyebrow}</Badge>
        <h1 className="text-[var(--admin-text-2xl)] font-semibold tracking-tight text-[var(--admin-text-primary)]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-[var(--admin-text-muted)]">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {onRefresh && refreshLabel && (
          <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>
            {refreshLabel}
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
