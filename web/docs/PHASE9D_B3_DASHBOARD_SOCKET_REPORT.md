# Phase 9D-B3 — Dashboard Real-Time Messaging (Socket.IO Client)

## Summary

Staff `CommunicationCaseWorkspace` now subscribes to the existing `/communication` gateway via dashboard BFF tickets. Incoming `message.created` events update the **selected** external conversation only; REST/server actions remain the write path for send, relay, and status.

## Dependencies

| Package | Version |
|---------|---------|
| `socket.io-client` | ^4.8.4 (added) |

## Files changed / added

| Path | Role |
|------|------|
| `dashboard/src/lib/api/realtime-config.ts` | Public Socket origin for browser |
| `dashboard/src/features/admin/communications/communications-types.ts` | Shared `CaseMessage` / `ConversationSummary` |
| `dashboard/src/features/admin/communications/useStaffCommunicationSocket.ts` | Ticket, connect, `case.join` / `case.leave`, reconnect |
| `dashboard/src/features/admin/communications/message-merge.ts` | Dedup by `message.id` |
| `dashboard/src/features/admin/communications/message-merge.test.ts` | Unit tests |
| `dashboard/src/features/admin/communications/CommunicationCaseWorkspace.tsx` | Hook + local thread state |
| `dashboard/src/features/admin/actions/platform.ts` | `fetchStaffConversationMessagesAction` |
| `dashboard/messages/en/admin.json`, `ar/admin.json` | `realtimeReconnecting` |
| `dashboard/.env.example` | `NEXT_PUBLIC_FARMEXIT_API_URL` |
| `dashboard/package.json` | dependency + unit test path |

**Unchanged:** Nest gateway, website client, Prisma, BFF ticket route (`/api/admin/communication/realtime-ticket` from 9D-B1).

## Dashboard ticket lifecycle

1. Client `POST /api/admin/communication/realtime-ticket` (HttpOnly admin session on server).
2. Response: `ticket`, `expiresAt`, `namespace`, `path` — ticket held in memory only for handshake.
3. `io(origin + namespace, { path, auth: { ticket, audience: 'dashboard' }, reconnection: false })`.
4. On connect → `case.join { caseId }` → `fetchStaffConversationMessagesAction` resync.
5. On unmount / case change → `case.leave`, disconnect, cancel backoff timers.

## Connection / reconnection

Same pattern as Phase 9D-B2:

- No Socket.IO auto-reconnect with stale tickets; fresh BFF mint per attempt.
- Backoff: 1s → 15s, max 8 rounds → `offline` (REST/actions still work).
- `401`/`403` on mint → `auth_required`, no further retries.
- Subtle `realtimeReconnecting` status line while connecting/reconnecting.

## Staff room subscription

- One `case:{caseId}:staff` room per authorized case (server-side).
- Switching **conversation** within the same case does not re-handshake; client filters `message.created` by `conversationId === activeConversationId`.
- Events for other participants in the same case are ignored in the active thread (no cross-thread leakage).

## Incoming message handling

1. Validate payload shape (`caseId`, `conversationId`, `message` DTO fields).
2. Drop if `caseId` ≠ workspace case.
3. Drop if `conversationId` ≠ selected conversation (`activeConversationIdRef`).
4. Else `appendCaseMessageIfNew` by `message.id`.

## Send / relay deduplication

- Send/relay still use `sendStaffMessageAction` / `relayMessageAction` (server-side JWT).
- After success: `resyncMessages()` merges REST page (50 items) with local state — dedupes socket + REST.
- `revalidatePath` on actions preserved for RSC consistency on navigation.

Relay notes and internal fields never appear in socket payload (API `MessageResponseDto` only).

## Authentication & security

- Dashboard audience only; no website cookies or hooks imported.
- No JWT or ticket in `localStorage`, URLs, or logs.
- Client-side filtering is defense-in-depth; authorization remains on API gateway.
- **9E note:** long-lived socket permission revocation delay still governed by backend revalidation interval (9D-B1).

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FARMEXIT_API_URL` | Derive socket origin (strip `/api/v1`) |
| `NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN` | Optional explicit origin |
| Dev fallback | `http://127.0.0.1:4001` when unset |

## Tests run

| Command | Result |
|---------|--------|
| `npm run typecheck` (dashboard) | Pass |
| `npm run test:unit` (dashboard) | Pass (includes `message-merge.test.ts`) |
| `npm run lint` (dashboard) | Pass |

### Live Socket.IO (API :4001)

**Pending** — requires staff session with `CommunicationRelay`, assigned case, and website message from isolated test user. Manual: open `/admin/communications/:id`, confirm ticket POST + WS, customer message appears without Refresh.

## Known limitations

- Resync loads page 1 / 50 messages only (same as RSC page).
- No unread badges or delivery UI (by design).
- Other-conversation activity in the same case does not update participant chips (no existing summary UI).

## Phase 9E handoff checklist

- [ ] End-to-end live test: website send → dashboard receive → staff reply → website receive (9D-B2 + B3).
- [ ] Multi-instance ticket store (Redis) if API is scaled horizontally.
- [ ] Optional: lightweight “activity on other participant” hint without unread counts.
- [ ] Security review: socket session revocation + staff permission loss mid-session.
- [ ] Production env: set `NEXT_PUBLIC_FARMEXIT_*` on dashboard deploy.
