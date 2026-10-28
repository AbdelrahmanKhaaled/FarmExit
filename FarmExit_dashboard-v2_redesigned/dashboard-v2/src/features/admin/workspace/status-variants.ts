export type StatusVariant = 'default' | 'gold' | 'warning' | 'muted' | 'outline';

const POSITIVE = new Set(['approved', 'published', 'active', 'accepted', 'verified', 'open']);
const WARNING = new Set([
  'underFarmExitReview',
  'submitted',
  'changesRequested',
  'pending',
  'uploaded',
  'inReview',
  'underReview',
  'collectingInterest',
  'underStaffFollowup',
  'waitingCustomer',
  'waitingOwner',
]);
const NEGATIVE = new Set(['rejected', 'withdrawn', 'closed', 'notApproved', 'archived']);

export function statusVariant(status: string): StatusVariant {
  const key = status.trim();
  if (POSITIVE.has(key)) return 'default';
  if (WARNING.has(key)) return 'warning';
  if (NEGATIVE.has(key)) return 'muted';
  return 'outline';
}
