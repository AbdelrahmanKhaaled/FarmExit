import { Badge } from '@/design-system';

const POSITIVE = new Set(['approved', 'published', 'active', 'accepted']);
const WARNING = new Set(['underFarmExitReview', 'submitted', 'changesRequested', 'pending', 'uploaded']);
const NEGATIVE = new Set(['rejected', 'withdrawn', 'closed']);

export function StatusBadge({ status }: { status: string }) {
  const key = status.trim();
  let variant: 'default' | 'gold' | 'warning' | 'muted' | 'outline' = 'outline';
  if (POSITIVE.has(key)) variant = 'default';
  else if (WARNING.has(key)) variant = 'warning';
  else if (NEGATIVE.has(key)) variant = 'muted';
  return <Badge variant={variant}>{key}</Badge>;
}
