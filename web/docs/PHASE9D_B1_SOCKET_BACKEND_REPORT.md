# Phase 9D-B1 — Secure Real-Time Messaging (Backend + BFF Tickets)

## Summary

Socket.IO notification infrastructure is wired into the existing Nest API (port **4001**). Messages are still written only via REST; after a successful DB commit, `message.created` is emitted to authorized rooms. Website and dashboard clients obtain **single-use, 60s opaque tickets** through authenticated mint endpoints (API + BFF). No Prisma migration, no Redis, no Socket.IO UI in web/dashboard yet.

## Dependencies

Already present in `api/package.json`:

- `@nestjs/websockets` ^12.2.0
- `@nestjs/platform-socket.io` ^12.2.0
- `socket.io` (compatible with Nest 12)

No new packages were added in this phase.

## Changed / added files

### API (`api/`)

| File | Role |
|------|------|
| `src/main.ts` | `FarmExitSocketIoAdapter` for configurable `SOCKET_IO_PATH` |
| `src/common/socket-io.adapter.ts` | Socket.IO path from env |
| `src/config/env.validation.ts` | `SOCKET_IO_PATH`, `REALTIME_SESSION_REVALIDATE_MS` |
| `.env.example` | Documented optional realtime env vars |
| `src/modules/admin-auth/website-audience.guard.ts` | Website session audience for ticket mint |
| `src/modules/admin-auth/admin-auth.module.ts` | Export website/dashboard audience guards |
| `src/modules/communication/communication.module.ts` | Gateway, ticket service, publisher |
| `src/modules/communication/communication.controller.ts` | `POST /communication/realtime-ticket` |
| `src/modules/communication/staff-communication.controller.ts` | `POST /staff/communication/realtime-ticket` |
| `src/modules/communication/communication-messages.service.ts` | Publish after send/relay |
| `src/modules/communication/communication-realtime.*` | Tickets, gateway, publisher, constants, types |
| `src/modules/communication/dto/realtime-ticket.dto.ts` | Mint response DTO |
| `src/modules/communication/dto/realtime-join.dto.ts` | `conv.join` / `case.join` body |
| `*.spec.ts` | Focused unit tests (ticket, gateway, publisher, messages) |

### BFF

| File | Role |
|------|------|
| `web/src/app/api/communication/realtime-ticket/route.ts` | Website HttpOnly session → API mint |
| `dashboard/src/app/api/admin/communication/realtime-ticket/route.ts` | Dashboard HttpOnly session → API mint |

## Ticket architecture

- **Mint:** `CommunicationRealtimeTicketService.mint(userId, sessionId, audience)` — 32-byte `base64url` ticket; only **SHA-256 hash** stored in an in-memory `Map` with expiry and `used` flag.
- **TTL:** 60 seconds (`REALTIME_TICKET_TTL_MS`).
- **Single-use:** `consume()` marks used and deletes the entry.
- **Audience:** Ticket record bound to `website` or `dashboard`; handshake must pass matching `auth.audience`.
- **Limits:** Up to 10k pending tickets; periodic purge every 30s; mint rate limit 30/min per route (shared `RateLimitGuard`).

### Mint endpoints (REST, Bearer access token)

| Audience | Method | Path |
|----------|--------|------|
| Website | `POST` | `/api/v1/communication/realtime-ticket` — `WebsiteAudienceGuard` |
| Dashboard staff | `POST` | `/api/v1/staff/communication/realtime-ticket` — `@StaffDashboardOnly()` + `CommunicationRelay` permission |

Response (`RealtimeTicketResponseDto`): `ticket`, `expiresAt`, `namespace`, `path` (no JWTs).

### BFF (no-store)

| App | `POST` route | Upstream |
|-----|--------------|----------|
| Website | `/api/communication/realtime-ticket` | `/communication/realtime-ticket` |
| Dashboard | `/api/admin/communication/realtime-ticket` | `/staff/communication/realtime-ticket` |

Clients must **not** put tickets in URLs, query strings, or persistent storage; pass only in Socket.IO handshake `auth` at connect time.

### Deployment limitation (MVP)

Tickets are **in-memory, single-process only**. Restart or horizontal scale without sticky sessions breaks mint/consume pairing. Production multi-instance requires shared ticket store (e.g. Redis) — **not** in this phase.

## Socket.IO surface

- **Namespace:** `/communication` (`REALTIME_NAMESPACE`)
- **Path:** `/socket.io` by default (`SOCKET_IO_PATH` env, applied via `FarmExitSocketIoAdapter`)
- **Transport:** Same host/port as API (**4001**); production should use **WSS** behind TLS.
- **CORS:** Handshake `Origin` must be in `CORS_ORIGINS` (no wildcard in production). Gateway sets `cors: { origin: false }` and validates origin manually.

### Handshake `auth`

```json
{ "ticket": "<opaque>", "audience": "website" | "dashboard" }
```

Server: validate origin → `consume(ticket, audience)` → live `userSession` (not revoked, not expired, matching audience, user `active`).

### Rooms (server-assigned only)

| Client | Room pattern | Join event |
|--------|--------------|------------|
| Website | `conv:{conversationId}` | `conv.join` `{ caseId }` — conversation resolved from DB for `externalUserId` |
| Staff | `case:{caseId}:staff` | `case.join` `{ caseId }` — `assertStaffCaseAccess` |

Leave: `conv.leave` / `case.leave` with `{ caseId }`. Website sessions **cannot** `case.join`.

### Events

| Event | When | Payload |
|-------|------|---------|
| `message.created` | After REST persistence | `{ caseId, conversationId, message: MessageResponseDto }` |

Routing:

- **User message:** emit to that user’s `conv:*` + `case:*:staff` (not another external participant’s room).
- **Staff message / relay:** target `conv:*` + `case:*:staff`. Relay emits **relayed** message only.

Publisher errors are logged and **do not** fail REST. Clients should refetch via existing REST on missed events.

Excluded from socket payload by design: `relayNote`, private docs, coordinates, internal notes, secrets (payload is `MessageResponseDto` only).

## Session revocation & reconnection

- Ticket expiry applies to **connection establishment** only.
- After connect: session re-checked on **handshake**, every **join**, and on interval `REALTIME_SESSION_REVALIDATE_MS` (default **30s**).
- Revoked/expired/wrong-audience/inactive user → `disconnect(true)`.
- **Max revocation detection delay:** ≈ `REALTIME_SESSION_REVALIDATE_MS` (plus immediate check on join).
- Reconnect requires a **new** ticket from BFF/API mint.

## Security tests & results

| # | Scenario | Coverage |
|---|----------|----------|
| 1 | Missing ticket | `communication-realtime.gateway.spec.ts` |
| 2 | Expired ticket | `communication-realtime-ticket.service.spec.ts` |
| 3 | Replayed ticket | ticket service spec |
| 4 | Wrong audience | ticket service spec |
| 5 | Revoked session | gateway revalidation spec |
| 6 | Website cannot staff join | gateway spec |
| 7 | Unauthorized conv join | gateway spec |
| 8 | Authorized conv join | gateway spec |
| 9 | Authorized staff case join | gateway spec |
| 10 | Emit after persistence | `communication-messages.service.spec.ts` |
| 11–13 | Room routing / safe payload | publisher spec + architecture (per-conversation rooms) |
| 14 | Revocation disconnect | gateway spec |
| 15 | Duplicate joins | Socket.IO `join` idempotent (documented) |
| 16 | REST unchanged | existing message service tests still pass |

### Commands run

```text
cd api && npm run build          # success
cd api && npm test -- --testPathPatterns=communication-realtime   # 13 passed
cd api && npm test -- --testPathPatterns=communication-messages.service  # 3 passed
```

ESLint: run on changed API paths (no new errors reported on those files).

## Remaining risks

- Single-instance ticket store; load balancer without sticky sessions will fail handshakes.
- Periodic revalidation does not re-run full case permission matrix on every tick (join + session state); permission loss mid-session may lag until next join or interval + staff case rules edge cases.
- No connection/join caps beyond ticket store and rate limits (tune in ops if needed).
- Dashboard BFF uses read-only cookie access (refresh via middleware); 401 if token stale until refresh.

## Handoff — 9D-B2 (website client)

1. `POST /api/communication/realtime-ticket` → `{ ticket, expiresAt, namespace, path }`.
2. Connect Socket.IO to API origin (port 4001), `path`, namespace `/communication`, `auth: { ticket, audience: 'website' }`.
3. On connect, emit `conv.join` with `{ caseId }` for active case.
4. Listen for `message.created`; merge by message `id`; refetch `GET` messages on gap.
5. On disconnect/auth error, mint new ticket (never reuse).

## Handoff — 9D-B3 (dashboard client)

1. `POST /api/admin/communication/realtime-ticket`.
2. Same transport; `auth.audience: 'dashboard'`.
3. Emit `case.join` `{ caseId }` when viewing a case.
4. Listen for `message.created` across staff room; still send via existing staff REST APIs.

## Explicitly not in this phase

- Socket.IO client code in `web/` or `dashboard/` UI.
- Phase 9E or schema changes.
