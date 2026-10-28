import { cn } from '@/lib/cn';
import { Card } from './Card';
import { CardBody, CardHeader } from './CardChrome';
import { EmptyState } from './EmptyState';

export function ChartShell({
  title,
  description,
  children,
  emptyTitle,
  emptyDescription,
  isEmpty,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  isEmpty?: boolean;
  className?: string;
}) {
  return (
    <Card variant="elevated" className={cn('luxe-card overflow-hidden p-0', className)}>
      <CardHeader title={title} description={description} />
      <CardBody className="pt-4">
        {isEmpty && emptyTitle ? (
          <EmptyState title={emptyTitle} description={emptyDescription} className="border-0 bg-transparent py-8 shadow-none" />
        ) : (
          children
        )}
      </CardBody>
    </Card>
  );
}
