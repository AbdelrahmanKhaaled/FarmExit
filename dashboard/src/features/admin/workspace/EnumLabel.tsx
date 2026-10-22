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

function fallbackLabel(value: string): string {
  const spaced = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
  if (!spaced) return value;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function EnumLabel({ value, group, className, title }: Props) {
  const t = useTranslations('admin.enums');
  const key = value.trim();
  const path = `${group}.${key}` as Parameters<typeof t.has>[0];
  const label = t.has(path) ? t(path) : fallbackLabel(key);
  return (
    <span className={cn('text-[var(--admin-text-secondary)]', className)} title={title ?? (label !== key ? key : undefined)}>
      {label}
    </span>
  );
}
