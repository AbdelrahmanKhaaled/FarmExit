import { RefreshButton } from '@/features/admin/RefreshButton';

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
    <header className="luxe-page-head flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="luxe-page-head__eyebrow">{eyebrow}</p>
        <h1 className="luxe-page-head__title">{title}</h1>
        {description ? <p className="luxe-page-head__desc">{description}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {actions}
        <RefreshButton label={refreshLabel} />
      </div>
    </header>
  );
}
