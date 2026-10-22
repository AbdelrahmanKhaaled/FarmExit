# Phase 9D-A — Real-time messaging WebSocket architecture (read-only audit)

**Date:** 2026-10-21 · **Status:** Architecture only — **no implementation** in this phase.  
**Builds on:** Phase 9A–9C audits/reports. **API:** port **4001** (`FARMEXIT_API_URL` → `/api/v1`).

---

## 1. Current authentication & communication architecture

### REST & persistence (source of truth)

| Layer | Role |
|-------|------|
| **MySQL / Prisma** | `CommunicationCase` → per-external-user `Conversation` → `Message`; staff mediation via `MessageRelay` (relay note DB-only, not in user DTOs). |
| **NestJS** | `CommunicationController` (website), `StaffCommunicationController` (staff); business rules in `CommunicationAccessService`, `CommunicationMessagesService`. |
| **Website BFF** | `web/src/app/api/communication/**` — reads HttpOnly cookies, attaches `Authorization: Bearer` to upstream REST. |
| **Dashboard** | Server actions → `apiFetchAdmin` with `fx_admin_at` HttpOnly cookie; `CommunicationCaseWorkspace` (client) posts via actions. |

**Mediation (unchanged):** Each external user has **one conversation per case** (`@@unique([caseId, externalUserId])`). Users only **list/send** within their conversation. Staff sees multiple conversations per case and **relays** to another external user’s conversation. There is **no** buyer↔owner channel.

**Bootstrap:** `api/src/main.ts` → Express via `@nestjs/platform-express`; `configureApp()` sets global prefix `api`, URI versioning `v1`, CORS with `credentials: true`, `trust proxy: 1`. **No WebSocket gateway today.**

### JWT & sessions

| Item | Detail |
|------|--------|
| Access token | HS256 JWT (`TokenService`): `sub` (user id), `sid` (session id), `iss`, `iat`, `exp`. |
| REST guard | `AccessTokenGuard` — Bearer header, verifies JWT, loads `userSession` (revoked/expired/active user). **Does not embed roles/permissions.** |
| Website cookies | `fx_web_at` / `fx_web_rt` — **HttpOnly**, `sameSite: lax`, path `/` (`web/src/lib/auth/cookies.ts`). BFF reads/refreshes server-side only (`readBffAccessToken`). |
| Dashboard cookies | `fx_admin_at` / `fx_admin_rt` — same pattern (`dashboard/src/lib/admin/cookies.ts`). |
| Session audience | `user_sessions.auth_audience` = `website` \| `dashboard`. **`DashboardAudienceGuard`** enforces dashboard audience on `@StaffDashboardOnly()` routes. |
| Staff REST | `staff/communication/*` uses `@StaffOnly()` (`AccessTokenGuard` + staff guards) — **not** `@StaffDashboardOnly()`. Same JWT format works for any valid session; staff checks are membership/permission-based. **WebSocket should explicitly require dashboard audience for dashboard clients and website audience for website clients.** |

**Website → API:** Browser calls **Next BFF** (same origin); BFF calls **4001** with Bearer from cookie. Browser **does not** send `fx_web_at` to the API host when API is on another origin (typical dev: web `3000`, API `4001`).

### Real-time today

- **No** `socket.io`, `@nestjs/websockets`, or WS usage in `api/package.json` dependencies (only optional peer refs in lockfile).
- **No** server push; `ConversationView` loads/sends via REST; staff dashboard polls via server actions after mutations.
- **`MessageRead`** exists in schema but **no API** — not required for first real-time slice.

---

## 2. Can Socket.IO use existing infrastructure?

**Yes, with additive NestJS modules** on the **same Node process** as HTTP:

1. Add `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`.
2. Register a `CommunicationGateway` (or dedicated `RealtimeModule`) in `AppModule`.
3. Attach Socket.IO to the **existing HTTP server** (`NestFactory.create` + IoAdapter) so port **4001** serves both REST and WS.
4. Reuse **`TokenService`**, **`PrismaService`**, **`CommunicationAccessService`** in gateway guards/handlers — **do not duplicate permission logic.**

**Not present today:** gateway, handshake auth, room manager, emit hooks after `CommunicationMessagesService` commits, BFF “socket session” endpoint, client `socket.io-client`.

---

## 3. Recommended WebSocket authentication strategy

### Problem

HttpOnly cookies **cannot** be read by browser JavaScript. Socket.IO clients on the **website** cannot attach `fx_web_at` to the **API origin** when origins differ. **Do not** expose access/refresh tokens to JS, `localStorage`, query strings, or logs.

### Recommended pattern (minimal + review gate)

**Short-lived, scoped socket credential issued only server-side:**

| Step | Website | Dashboard |
|------|---------|-----------|
| 1 | Client (explicit user action, e.g. opening a thread) calls **BFF** `POST /api/communication/realtime-session` (name TBD). | Client calls **dashboard BFF/action** equivalent. |
| 2 | BFF reads HttpOnly cookie (`readBffAccessToken` / admin equivalent), validates session. | Same with `fx_admin_at`. |
| 3 | BFF calls API **internal** mint endpoint **or** signs an opaque ticket stored in memory/Redis (TTL **30–120s**, single-use optional). | Mint includes `audience: website` \| `dashboard`, `userId`, `sessionId`. |
| 4 | BFF returns **only the short-lived ticket** to the browser (JSON body, not a cookie). | Same. |
| 5 | `socket.io-client` connects to API with `auth: { ticket }` (or `Authorization: Bearer <ticket>` in handshake middleware). | Same. |
| 6 | Gateway validates ticket, loads session (revoked/expired/audience), attaches `userId` to socket. **Reject** if invalid. | Dashboard sockets **must** require `authAudience === dashboard`. |

**Alternatives (need explicit approval):**

| Approach | Verdict |
|----------|---------|
| Pass normal access JWT to browser for `auth.token` | **Reject** — defeats HttpOnly model, lengthens XSS blast radius. |
| Cookie sent directly to API on WS | Only if **API and web share site** (e.g. `api.farmexit.com` + `www.farmexit.com` with `Domain=.farmexit.com` cookies). **Not current** dev layout; would be deployment-wide change. |
| Query `?token=` | **Reject** — leaks via logs, Referer, history. |

> **Approval required:** ticket shape (signed JWT vs opaque store), TTL, single-use vs reusable within TTL, and whether mint is BFF-only or public API route.

### Revalidation

On **every** `join` / sensitive event: re-run `assertCaseParticipant` or `assertStaffCaseAccess` (and conversation lookup). On **session revoke** (logout elsewhere): tickets expire quickly; optionally disconnect sockets when session revoked (session table poll or TTL).

---

## 4. Room and event design

### Room naming (server-assigned only — never trust client room names)

| Room | Members | Purpose |
|------|---------|---------|
| `user:{userId}` | One socket set per authenticated user | Optional inbox-level signals (new case activity) — **defer** if not needed. |
| `conv:{conversationId}` | External user whose `conversation.externalUserId === userId`, after `assertCaseParticipant` | **User thread** updates. |
| `case:{caseId}:staff` | Staff with `assertStaffCaseAccess` | Staff console: all conversations in case (staff already lists by `conversationId`). |

**Forbidden:** `case:{caseId}:all`, buyer+owner shared room, rooms keyed only by `requestId` without case/conversation checks.

### Safe server → client events

| Event | Payload (minimal) | Recipients |
|-------|-------------------|------------|
| `message.created` | `{ caseId, conversationId, message: MessageResponseDto }` | **Only** sockets in `conv:{conversationId}` for that message **plus** `case:{caseId}:staff` when staff should see it. |
| `case.updated` | `{ caseId, status }` (optional) | Participants with open case + staff. |
| `conversation.joined` / `error` | Ack or error code | Connecting socket only. |

**Never emit:** `relayNote`, other party PII, staff-only notes, raw source message to **non-source** external conversation, `sender` display names implying the other external party.

### Client → server (minimal)

| Event | Body | Server checks |
|-------|------|----------------|
| `conv.join` | `{ caseId }` | Auth + `assertCaseParticipant` → resolve **own** `conversationId` → join `conv:{id}`. |
| `conv.leave` | `{ caseId }` | Leave rooms. |
| `case.join` (staff) | `{ caseId }` | `assertStaffCaseAccess` → join `case:{caseId}:staff` (+ per-conv as needed). |

**Do not** implement `message.send` over socket initially — keep **POST REST** as write path; socket = **notifications only**. Reduces duplicate-write races and keeps MySQL authoritative.

---

## 5. Message persistence & relay integration

**Emit only after successful DB commit** inside `CommunicationMessagesService`:

| Method | Emit to |
|--------|---------|
| `sendUser` | `conv:{userConversationId}` + `case:{caseId}:staff` (staff sees new customer message in case view). **Not** other externals’ `conv:*`. |
| `sendStaff` (to external) | Target `conv:{targetConversationId}` only (+ staff room). |
| `relayStaff` | Target `conv:{targetConversationId}` with `isRelayedCopy: true` message DTO (+ staff room). **Never** emit source message body to target’s room as if from buyer/owner. |

**Integration point:** inject a narrow `CommunicationRealtimePublisher` interface into `CommunicationMessagesService` (no-op in tests; gateway impl calls `server.to(room).emit(...)`). Keeps controllers unchanged.

**Staff relay rules (REST already enforce):** target ≠ source external user; source in same case; `relayNote` stays DB-only.

---

## 6. Frontend & dashboard responsibilities

### Website (`MessagesWorkspace` / `ConversationView`)

- Connect socket **only while** a conversation is open (or inbox mounted) — user-initiated navigation, not on every `/my` load.
- Obtain ticket via BFF immediately before `io.connect`.
- On `message.created`, **upsert by `message.id`** if not already present (see §7).
- On disconnect: show “reconnecting…”; **do not** clear thread; on reconnect re-`conv.join` + optional REST gap fill (`GET messages` with `sentAt > last` or refetch page 1).
- **Keep REST send**; append POST response + dedupe socket duplicate.
- **No** change to ownership UI (“FarmExit” vs “You” via `senderId === userId`).

### Dashboard (`CommunicationCaseWorkspace`)

- Same ticket pattern via dashboard server route/action.
- Staff joins `case:{caseId}:staff` and subscribes to active `conversationId` (already selected in UI).
- Refresh thread on `message.created` for active conversation; optional append-by-id like website.
- **Still use** existing server actions for send/relay (REST); socket for inbound only in v1.

### BFF

- New routes: mint realtime ticket (website + dashboard variants or shared with audience flag).
- **Do not** proxy WebSocket through Next unless product mandates single origin — connecting **directly to API WS URL** with ticket is simpler if CORS/WS origins configured.

---

## 7. Reconnection & duplicate-message strategy

| Concern | Strategy |
|---------|----------|
| REST + socket same send | Client sends via REST only; socket is inbound. POST response adds message; socket `message.created` with same `id` → **ignore**. |
| Dedupe key | `message.id` (server-generated bigint string). |
| Ordering | Sort by `sentAt` + `id`; on reconnect refetch tail via REST (`pageSize=100` or cursor later). |
| Missed events while offline | After reconnect: `GET /communication/cases/:id/messages` (authoritative merge). |
| Double connect | One socket per tab; `conv.leave` on unmount; idempotent `conv.join`. |
| Staff relay | Only one `message.created` per persisted row in **target** conversation. |

---

## 8. Deployment considerations

| Topic | Guidance |
|-------|----------|
| **Reverse proxy** | Enable WebSocket upgrade (nginx `proxy_http_version 1.1`, `Upgrade`, `Connection`). |
| **Sticky sessions** | Required for **multiple API instances** with default in-memory adapter. |
| **Horizontal scale** | Plan **`@socket.io/redis-adapter`** (or MariaDB-compatible pub/sub) before second instance. |
| **Single instance** | In-memory adapter OK for MVP; **no** Redis required day one. |
| **CORS / origins** | Socket.IO CORS must allow website + dashboard origins; `credentials` if using cookies (prefer ticket auth instead). |
| **Path / namespace** | e.g. namespace `/communication`, path `/socket.io` — document in env (`WS_PATH`). |
| **TLS** | WSS in production. |

---

## 9. Files expected to change (implementation phase — not done in 9D-A)

### API (`api/`)

- `package.json` — add socket deps.
- `src/main.ts` or `app-setup.ts` — IoAdapter wiring.
- `src/modules/communication/communication-realtime.gateway.ts` (new).
- `src/modules/communication/communication-realtime.publisher.ts` (new interface + impl).
- `src/modules/communication/communication-messages.service.ts` — emit after commit.
- `src/modules/communication/communication.module.ts` — register gateway.
- `src/modules/communication/dto/` — ticket/realtime DTOs if REST mint added.
- Optional: `src/modules/auth/` or `communication-realtime-ticket.service.ts` — ticket mint/verify.
- `*.spec.ts` / `communication-realtime*.spec.ts` — handshake & room tests.

### Website (`web/`)

- `src/app/api/communication/realtime-session/route.ts` (new BFF).
- `src/features/my-messages/useCommunicationSocket.ts` (new hook).
- `ConversationView.tsx` — subscribe lifecycle.
- `src/lib/api/config.ts` — `getWsUrl()` from env.
- `.env.example` — `FARMEXIT_WS_URL` or derive from API URL.

### Dashboard (`dashboard/`)

- BFF/action for staff realtime ticket.
- `CommunicationCaseWorkspace.tsx` — socket lifecycle.
- `.env.example`.

### Docs

- `web/docs/PHASE9_API_MAPPING.md` — realtime session + WS URL.

**Out of scope:** Prisma schema, Phase 8/1E modules, global CSS, unrelated ports.

---

## 10. Required dependencies (implementation)

```text
@nestjs/websockets
@nestjs/platform-socket.io
socket.io
socket.io-client          # web + dashboard
```

**Later (multi-instance):** `@socket.io/redis-adapter`, `redis` (or approved pub/sub).

---

## 11. Security tests required (before production)

| # | Test |
|---|------|
| 1 | Handshake without ticket → disconnect / error. |
| 2 | Expired or reused ticket → rejected. |
| 3 | Website ticket cannot join `case:*:staff`. |
| 4 | Dashboard ticket cannot impersonate external `conv.join` without staff permission. |
| 5 | User A cannot `conv.join` case where only user B is participant → forbidden. |
| 6 | After `sendUser`, only **that user’s** `conv` + staff room receive event — not other external’s `conv`. |
| 7 | After `relayStaff`, only **target** `conv` receives relayed message; source external does not see relay as “from owner/buyer”. |
| 8 | Payload never contains `relayNote`, phone, email, exact coordinates. |
| 9 | Revoked session → ticket invalid / socket disconnected within TTL. |
| 10 | `join` re-checks closed case → reject or leave room. |
| 11 | Fuzz client-supplied `conversationId` / `senderId` — ignored; server derives from auth. |

Integration tests with mocked gateway; e2e with single case/agent fixture optional.

---

## 12. Schema / database migration

**None required** for MVP real-time notifications if:

- Writes stay on existing `Message` rows.
- Auth uses signed short-lived tickets **without** server-side store, **or** ephemeral Redis only.

**Optional later (product decision):**

- `realtime_ticket` table (audit/revocation) — only if opaque tickets must be revocable before expiry.
- `MessageRead` — separate “read receipts” feature, not 9D-A.

---

## 13. Architecture decisions requiring approval

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Browser auth to WS** | Ticket via BFF vs shared-domain cookies vs JS access JWT | **Ticket via BFF** (short TTL); security review mandatory. |
| **Write path** | REST-only vs socket send | **REST-only v1**; socket notify only. |
| **Staff audience on WS** | `StaffOnly` vs `StaffDashboardOnly` | **`StaffDashboardOnly` equivalent** for dashboard sockets; website sockets require website session audience (add guard symmetric to `DashboardAudienceGuard`). |
| **Mint endpoint location** | API public vs BFF-signed vs internal | API endpoint called **only from BFF** (shared secret) or BFF signs with `JWT_ACCESS_SECRET` — **pick one**; avoid public mint without rate limit. |
| **Scaling** | Single node vs Redis adapter day one | **Single node MVP**; document Redis before second replica. |
| **Inbox push** | Per-case only vs `user:{id}` room | **Per open conversation only** in v1 (smallest blast radius). |
| **Next.js WS proxy** | Direct to 4001 vs proxy | **Direct to API** with ticket + CORS/WSS config. |

---

## Answers to investigation checklist

| # | Answer |
|---|--------|
| 1 | Socket.IO can be added to existing Nest 12 app; no WS today. |
| 2 | HttpOnly cookies → **BFF-minted short-lived ticket** for browser `auth`; do not read cookies in browser for API WS. |
| 3 | Dashboard: separate cookie + ticket mint path; enforce **`authAudience: dashboard`**. |
| 4 | Reuse session validation logic (`AccessTokenGuard` + audience + `CommunicationAccessService`); **do not** expose refresh/access tokens to JS. |
| 5 | Join validates case/conversation membership server-side; rooms derived from DB. |
| 6 | Rooms above; payloads = `MessageResponseDto` only; no cross-party leakage. |
| 7 | Emit in `CommunicationMessagesService` after transaction success via publisher. |
| 8 | Reconnect → re-auth ticket + re-join + REST backfill. |
| 9 | Dedupe by `message.id`; REST authoritative for sends. |
| 10 | Proxy WS upgrade; sticky sessions or Redis adapter for multi-instance. |
| 11 | **Yes** — single instance in-memory adapter works; swap adapter later without client protocol change. |

---

**Stop line:** Phase 9D-A ends here. No 9D-B implementation, no 9E, no code/migration/commits in this phase.
