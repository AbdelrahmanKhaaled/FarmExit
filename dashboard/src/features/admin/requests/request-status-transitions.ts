import { SPECIALIZED_REQUEST_TYPES } from '@/lib/api/types/staff';

const FINAL_STATUSES = new Set([
  'published',
  'closed',
  'rejected',
  'declined',
  'withdrawn',
]);

/** Staff generic status endpoint applies only to non-specialized unified request types. */
export function supportsGenericStatusTransition(requestType: string): boolean {
  return !SPECIALIZED_REQUEST_TYPES.has(requestType);
}

export type StatusTransitionOption = {
  status: string;
  requiresReason: boolean;
  confirm: boolean;
};

/**
 * Conservative transitions exposed in the dashboard — backend may allow more for admins;
 * we only offer staff-safe closure from active coordination states.
 */
export function allowedGenericStatusTransitions(
  currentStatus: string,
  isAdmin: boolean,
): StatusTransitionOption[] {
  if (FINAL_STATUSES.has(currentStatus)) {
    return isAdmin && currentStatus !== 'closed'
      ? [{ status: 'closed', requiresReason: true, confirm: true }]
      : [];
  }
  const options: StatusTransitionOption[] = [];
  if (currentStatus !== 'closed') {
    options.push({ status: 'closed', requiresReason: true, confirm: true });
  }
  if (isAdmin && currentStatus !== 'withdrawn' && !FINAL_STATUSES.has(currentStatus)) {
    options.push({ status: 'withdrawn', requiresReason: true, confirm: true });
  }
  return options;
}
