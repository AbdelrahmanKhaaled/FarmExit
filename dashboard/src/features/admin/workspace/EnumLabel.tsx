'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

export type EnumGroup =
  | 'status'
  | 'requestType'
  | 'professionalType'
  | 'listingType'
  | 'adminRole'
  | 'accountStatus'
  | 'caseStatus'
  | 'proposalKind';

type Props = {
  value: string;
  group: EnumGroup;
  className?: string;
  title?: string;
};

export function EnumLabel({ value, group, className, title }: Props) {
  const t = useTranslations('admin.enums');
  const key = value.trim();
  const path = `${group}.${key}` as Parameters<typeof t.has>[0];
  const label = t.has(path) ? t(path) : t('unknown');
  return (
    <span
      className={cn('text-[var(--admin-text-secondary)]', className)}
      title={title ?? (label !== key ? key : undefined)}
    >
      {label}
    </span>
  );
}
