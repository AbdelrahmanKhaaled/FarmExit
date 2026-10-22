'use client';

import { Badge } from '@/design-system';
import { EnumLabel } from './EnumLabel';
import { statusVariant } from './status-variants';

export function StatusBadge({ status, group = 'status' }: { status: string; group?: 'status' | 'accountStatus' | 'caseStatus' }) {
  const variant = statusVariant(status);
  return (
    <Badge variant={variant} className="normal-case tracking-normal">
      <EnumLabel value={status} group={group} className="text-inherit" />
    </Badge>
  );
}
