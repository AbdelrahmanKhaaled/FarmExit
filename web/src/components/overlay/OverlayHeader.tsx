'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui/IconButton';

/*
 * Header shared by Dialog and Sheet. Figma: Auth Layout header (44px round Back / Close on bg/muted) and
 * Filter Drawer header (Heading/H4 title + Label/Caption summary + 44px close).
 */
export function OverlayHeader({
  titleId,
  descriptionId,
  title,
  description,
  onBack,
  onClose,
  className,
}: {
  titleId: string;
  descriptionId: string;
  title: ReactNode;
  description?: ReactNode;
  onBack?: () => void;
  onClose: () => void;
  className?: string;
}) {
  const t = useTranslations('common.actions');
  return (
    <div className={cn('flex items-center gap-12', className)}>
      {onBack && <IconButton variant="round" icon="arrow-left" label={t('back')} onClick={onBack} />}
      <div className="flex min-w-0 grow flex-col">
        <h2 id={titleId} className="type-heading-h4 text-text-primary">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="type-label-caption text-text-muted">
            {description}
          </p>
        )}
      </div>
      <IconButton variant="round" icon="close" label={t('close')} onClick={onClose} />
    </div>
  );
}
