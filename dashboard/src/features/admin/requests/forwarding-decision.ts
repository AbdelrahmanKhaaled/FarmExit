import type { RequestForwardingRow } from './RequestForwardingPanel';

/** Backend `OwnerDecision` values allowed in `ForwardingDecisionDto` (not `pending`). */
export const RECORDABLE_OWNER_DECISIONS = ['accepted', 'declined'] as const;
export type RecordableOwnerDecision = (typeof RECORDABLE_OWNER_DECISIONS)[number];

const CLOSED_FORWARDING_STATUSES = new Set(['decided', 'closed']);

export function isForwardingAwaitingOwnerDecision(row: RequestForwardingRow): boolean {
  if (CLOSED_FORWARDING_STATUSES.has(row.status)) return false;
  if (!row.ownerDecision || row.ownerDecision === 'pending') return true;
  return false;
}

export function parseRecordableOwnerDecision(value: string): RecordableOwnerDecision | null {
  return RECORDABLE_OWNER_DECISIONS.includes(value as RecordableOwnerDecision)
    ? (value as RecordableOwnerDecision)
    : null;
}

export function buildForwardingDecisionBody(
  decision: string,
  reason?: string,
): { decision: RecordableOwnerDecision; reason?: string } | { error: 'invalid_decision' } {
  const parsed = parseRecordableOwnerDecision(decision);
  if (!parsed) return { error: 'invalid_decision' };
  const trimmed = reason?.trim();
  return trimmed ? { decision: parsed, reason: trimmed } : { decision: parsed };
}
