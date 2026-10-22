# Phase 9D-B2 — Website Real-Time Messaging (Socket.IO Client)

## Summary

The existing website messaging UI (`ConversationView`) now subscribes to the Phase 9D-B1 Socket.IO gateway for `message.created` notifications. REST remains the source of truth for loading history and sending messages. Tickets are minted only through the same-origin BFF; credentials stay HttpOnly.

## Dependencies added

| Package | Version | Notes |
|---------|---------|--------|
| `socket.io-client` | ^4.8.4 | Matches API `socket.io` ^4.8.x |

## Files changed / added

| Path | Purpose |
|------|---------|
| `src/lib/api/realtime-config.ts` | `getRealtimeSocketOrigin()` from public env |
| `src/features/my-messages/useCommunicationSocket.ts` | Ticket mint, connect, join/leave, reconnect |
| `src/features/my-messages/message-merge.ts` | ID-based merge / append |
| `src/features/my-messages/message-merge.test.ts` | Unit tests (dedup, case filter) |
| `src/features/my-messages/messages-client.ts` | Shared REST message fetch |
| `src/features/my-messages/ConversationView.tsx` | Hook integration + reconnecting UI |
| `messages/en/workspace.json`, `messages/ar/workspace.json` | `realtimeReconnecting` |
| `.env.example` | `NEXT_PUBLIC_FARMEXIT_API_URL` / realtime origin docs |
| `package.json` | `socket.io-client`, `test:unit` script |

**Not modified:** `MessagesWorkspace.tsx` (layout only), `MessageThread.tsx` (wrapper), API/dashboard, Prisma, marketplace.

## Environment configuration

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_FARMEXIT_API_URL` | Browser build | e.g. `http://127.0.0.1:4001/api/v1` → origin `http://127.0.0.1:4001` |
| `NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN` | Browser build | Optional explicit Socket origin (no `/api/v1`) |
| `FARMEXIT_API_URL` | Server BFF only | Unchanged; not used for browser socket |

Development fallback: `http://127.0.0.1:4001` when public vars unset (`NODE_ENV=development` only). Production requires explicit `NEXT_PUBLIC_*` configuration. Port **4001** only; never 4000.

## Socket lifecycle

1. User opens an authorized conversation (`ConversationView`, not preview mode).
2. REST loads case + messages (`fetchCaseMessages`).
3. Hook `POST /api/communication/realtime-ticket` (in-memory ticket only).
4. `io(origin + namespace, { path, auth: { ticket, audience: 'website' }, reconnection: false })`.
5. On `connect` → `conv.join { caseId }` → `onResync()` merges REST page 1 (`pageSize=100`).
6. `message.created` → validate payload + `caseId` → `appendMessageIfNew` (dedup by `message.id`).
7. On unmount / case switch → `conv.leave`, disconnect, cancel timers (Strict Mode safe via generation counter).

Staff rooms are never joined from the website client.

## Ticket and reconnection

- **Single-use tickets:** `reconnection: false` on the Socket.IO client; every reconnect calls BFF mint again.
- **Backoff:** 1s → 2s → 4s → 8s → 15s (max 8 rounds), then `offline` (REST-only UX).
- **401/403 on mint:** `auth_required` — no further reconnect attempts in that session.
- **Gateway down / mint failure:** `offline` after retries; composer and REST send unchanged.
- **Status UI:** Subtle `realtimeReconnecting` banner while `connecting` / `reconnecting`.

## Message deduplication and rendering

- Outbound: still `POST /api/communication/cases/:id/messages`; append API response to state.
- Inbound socket: same `MessageRow` shape (`id`, `senderId`, `body`, `sentAt`, `isRelayedCopy`).
- `mergeMessageRows` / `appendMessageIfNew` prevent duplicate bubbles when REST and socket both deliver the same `id`.
- Staff / relayed messages: `senderId !== userId` → existing “FarmExit” meta and bubble styles unchanged.

## Pagination / outage limitation

Resync after reconnect only refetches **page 1, pageSize 100**. If more than 100 messages exist, very long offline gaps may not recover older rows without a future pagination API — documented here; no new API invented.

## Tests and results

| Command | Result |
|---------|--------|
| `npm run typecheck` (web) | Pass |
| `npm run lint` (web) | Pass |
| `npm run test:unit` (web) | 4/4 pass (`message-merge`) |
| `npx playwright test --config=tests/visual/stage9b.config.ts` | **12 passed** (EN/AR × 1440/1024/390; preview mode, no socket) |
| `npx playwright test --config=tests/visual/stage9c.config.ts` | **4 passed** |

### Live Socket.IO against API :4001

**Pending** — not run in this session (requires signed-in website user + assigned communication case + API running). Manual check: open `/my/messages/:caseId`, confirm Network → `realtime-ticket` POST, WS to `:4001/socket.io`, and staff message appears without refresh.

## Security / deployment notes (client)

- Client drops `message.created` when `payload.caseId !==` active case.
- No JWT in JS; ticket never logged or stored in `localStorage` / URL.
- Backend permission revocation on long-lived sockets remains a **server** concern (9D-B1 revalidation); document for final security review.

## Handoff

### Phase 9D-B3 (dashboard)

- `POST /api/admin/communication/realtime-ticket`
- `auth.audience: 'dashboard'`, `case.join { caseId }`, same `message.created` payload
- Reuse patterns from `useCommunicationSocket` (new hook, staff rooms only)

### Phase 9E

- Optional: unread counts, delivery state, typing — **not** started here
- Optional: multi-page REST backfill after reconnect if product requires full history recovery
