import type { MessageRow } from './messages-types';

function messageSortKey(m: MessageRow): [number, string] {
  const t = m.sentAt ? Date.parse(m.sentAt) : 0;
  return [Number.isFinite(t) ? t : 0, m.id];
}

/** Merge by `message.id`, preserve chronological order (sentAt, then id). */
export function mergeMessageRows(existing: readonly MessageRow[], incoming: readonly MessageRow[]): MessageRow[] {
  const map = new Map<string, MessageRow>();
  for (const m of existing) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => {
    const [ta, ia] = messageSortKey(a);
    const [tb, ib] = messageSortKey(b);
    if (ta !== tb) return ta - tb;
    return ia.localeCompare(ib);
  });
}

export function appendMessageIfNew(
  existing: MessageRow[] | null,
  activeCaseId: string,
  payloadCaseId: string,
  message: MessageRow,
): MessageRow[] | null {
  if (payloadCaseId !== activeCaseId) return existing;
  if (!existing) return [message];
  if (existing.some((m) => m.id === message.id)) return existing;
  return mergeMessageRows(existing, [message]);
}
