import type { CaseMessage } from './communications-types';

function sortKey(m: CaseMessage): [number, string] {
  const t = m.sentAt ? Date.parse(m.sentAt) : 0;
  return [Number.isFinite(t) ? t : 0, m.id];
}

export function mergeCaseMessages(existing: readonly CaseMessage[], incoming: readonly CaseMessage[]): CaseMessage[] {
  const map = new Map<string, CaseMessage>();
  for (const m of existing) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => {
    const [ta, ia] = sortKey(a);
    const [tb, ib] = sortKey(b);
    if (ta !== tb) return ta - tb;
    return ia.localeCompare(ib);
  });
}

export function appendCaseMessageIfNew(
  existing: CaseMessage[],
  message: CaseMessage,
): CaseMessage[] {
  if (existing.some((m) => m.id === message.id)) return existing;
  return mergeCaseMessages(existing, [message]);
}
