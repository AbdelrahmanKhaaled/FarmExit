import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, type IconName } from '@/components/icons/Icon';

/** Native disclosure keeps entered fields mounted when collapsed. */
export function WizardDisclosure({
  title,
  description,
  icon,
  children,
  open,
}: {
  title: string;
  description: string;
  icon: IconName;
  children: ReactNode;
  open?: boolean;
}) {
  const t = useTranslations('workspace.wizard');
  return (
    <details open={open} className="group rounded-card border border-border-hairline bg-bg-surface p-20 tablet:p-24">
      <summary className="flex cursor-pointer list-none items-center gap-16 [&::-webkit-details-marker]:hidden">
        <span className="flex size-44 shrink-0 items-center justify-center rounded-full bg-bg-muted text-text-brand">
          <Icon name={icon} size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-8">
            <span className="type-label-large">{title}</span>
            <span className="rounded-full bg-bg-muted px-8 py-2 type-label-caption text-text-muted">
              {t('optional')}
            </span>
          </span>
          <span className="mt-6 block type-body-caption text-text-muted">{description}</span>
        </span>
        <span className="flex shrink-0 items-center gap-6 type-label-caption-strong text-text-brand">
          <span className="hidden tablet:block group-open:hidden">{t('addDetails')}</span>
          <span aria-hidden="true" className="group-open:hidden">
            +
          </span>
          <span aria-hidden="true" className="hidden group-open:inline">
            −
          </span>
        </span>
      </summary>
      <div className="mt-24 flex flex-col gap-24">{children}</div>
    </details>
  );
}
