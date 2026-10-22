import { AuthSessionAudience } from '../../generated/prisma/enums';

export const REALTIME_TICKET_TTL_MS = 60_000;
export const REALTIME_TICKET_MAX_STORED = 10_000;
export const REALTIME_TICKET_CLEANUP_MS = 30_000;
export const REALTIME_SESSION_REVALIDATE_MS = 30_000;
export const REALTIME_NAMESPACE = '/communication';
export const REALTIME_SOCKET_PATH_DEFAULT = '/socket.io';
export const REALTIME_JOIN_RATE_LIMIT = { limit: 60, windowSeconds: 60 };

export type RealtimeAudience =
  | typeof AuthSessionAudience.website
  | typeof AuthSessionAudience.dashboard;

export function convRoom(conversationId: bigint | string): string {
  return `conv:${conversationId.toString()}`;
}

export function caseStaffRoom(caseId: bigint | string): string {
  return `case:${caseId.toString()}:staff`;
}
