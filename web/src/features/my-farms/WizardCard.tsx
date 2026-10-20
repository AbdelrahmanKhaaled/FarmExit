import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Surface';
import { Icon, type IconName } from '@/components/icons/Icon';
export function WizardCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-24 p-20 tablet:p-32">
      <header className="flex items-start gap-16">
        <span className="flex size-44 shrink-0 items-center justify-center rounded-full bg-bg-muted text-text-brand">
          <Icon name={icon} size={24} />
        </span>
        <div className="min-w-0">
          <h3 className="type-label-large text-text-primary">{title}</h3>
          {description && <p className="mt-6 type-body-caption text-text-muted">{description}</p>}
        </div>
      </header>
      {children}
    </Card>
  );
}
