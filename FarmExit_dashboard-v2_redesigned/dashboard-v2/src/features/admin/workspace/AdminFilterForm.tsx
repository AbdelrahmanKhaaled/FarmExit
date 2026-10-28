import { FilterBar } from '@/components/ui';

export function AdminFilterForm({
  children,
  submitLabel,
  className,
}: {
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
}) {
  return (
    <form method="get" className={className ?? 'mb-6'}>
      <FilterBar>
        {children}
        <button type="submit" className="admin-btn-primary shrink-0">
          {submitLabel}
        </button>
      </FilterBar>
    </form>
  );
}
