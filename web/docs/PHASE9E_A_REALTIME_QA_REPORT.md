# Phase 9E-A — Real-Time Messaging QA & Security Hardening

**Date:** 2026-10-21  
**Scope:** Verification + minimal backend fix for permission revalidation on active sockets. No schema changes, no three-party data mutation.

---

## 1. Environment checks

| Check | Result | Notes |
|-------|--------|--------|
| API port **4001** | **PASSED LIVE** | `http://localhost:4001/api/v1` listening (dev terminal); Swagger `200` at `/api/docs` |
| Website **3000** | **PASSED LIVE** | Next dev ready (`/en` → `200`) |
| Dashboard **3002** | **PASSED LIVE** | HTTP `307` (redirect, process expected up) |
| Port **4000** | **PASSED** | Not used by FarmExit stack |
| Namespace `/communication` | **PASSED MOCKED** | Gateway + client configs align with 9D-B1/B2/B3 |
| `SOCKET_IO_PATH` default `/socket.io` | **PASSED MOCKED** | `FarmExitSocketIoAdapter` + env default |
| `CORS_ORIGINS` | **PASSED CONFIG** | Example: `http://localhost:3000`, `http://localhost:3002` — must match browser `Origin` on handshake |
| Website BFF ticket | **PASSED CONFIG** | `POST /api/communication/realtime-ticket` |
| Dashboard BFF ticket | **PASSED CONFIG** | `POST /api/admin/communication/realtime-ticket` |
| Socket.IO versions | **PASSED** | API `socket.io@^4.8.4`; web/dashboard `socket.io-client@^4.8.4`; Nest WS `^12.2.0` |
| Public realtime origins | **PASSED CONFIG** | `NEXT_PUBLIC_FARMEXIT_API_URL` / `NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN` (web + dashboard `.env.example`) |

---

## 2. Files changed in 9E-A

| File | Change |
|------|--------|
| `api/src/modules/communication/communication-realtime.gateway.ts` | Periodic **room-level** revalidation via `revalidateJoinedRooms()` |
| `api/src/modules/communication/communication-realtime.gateway.spec.ts` | Tests: staff case access loss + website conv access loss on revalidation |
| `web/package.json` | `test:unit` targets single test file (reliable on Windows) |
| `web/tsconfig.json` | Exclude `**/*.test.ts` from `tsc` (strip-types imports use `.ts` suffix) |
| `web/src/features/my-messages/message-merge.test.ts` | `.ts` import paths for Node test runner |

**Unchanged:** Prisma, website/dashboard socket hooks (except QA fixes above), publisher routing, ticket service, BFF routes.

---

## 3. Security issue found and fix (Section 6)

### Finding (pre-9E-A)

Connected sockets revalidated **session** only (`userSession` revoked/expired/audience). **Case staff access**, `CommunicationRelay` permission, and **website case participation** were not re-checked after `case.join` / `conv.join`.

### Fix (minimal)

On each `REALTIME_SESSION_REVALIDATE_MS` tick (default **30s**, env-configurable), `revalidateSocket` now:

1. Confirms session still live (unchanged).
2. For each joined room:
   - `conv:{id}` — website audience only; conversation must belong to `auth.userId`; `assertCaseParticipant` on parent case.
   - `case:{id}:staff` — dashboard audience only; `assertStaffCaseAccess` (includes **CommunicationRelay** + assignment rules).

On failure → `disconnect(true)` (client must mint a **new** ticket to reconnect).

### Maximum revocation-detection delay

**≤ `REALTIME_SESSION_REVALIDATE_MS`** (default 30s) for permission/case loss after join, plus immediate checks on **join** and **handshake**. Session revocation uses the same interval.

Server-side enforcement; client-side conversation filtering (9D-B3) remains UX-only, not security.

---

## 4. Authentication & ticket verification

| Case | Method | Result |
|------|--------|--------|
| No / invalid ticket | `communication-realtime-ticket.service.spec.ts` + gateway spec | **PASSED MOCKED** |
| Expired ticket | ticket service spec | **PASSED MOCKED** |
| Replayed single-use ticket | ticket service spec | **PASSED MOCKED** |
| Wrong audience on consume | ticket service spec | **PASSED MOCKED** |
| Website vs dashboard ticket at handshake | consume binds audience to mint | **PASSED MOCKED** |
| Revoked session on revalidation | gateway spec | **PASSED MOCKED** |
| Missing ticket at runtime | Socket.IO client without `auth.ticket` | **PASSED LIVE** — brief client `connect` may fire; socket **not** connected after ~800ms (`DISCONNECTED`) |
| User joins other's conversation | gateway `convJoin` + access | **PASSED MOCKED** |
| Website `case.join` | gateway spec | **PASSED MOCKED** (forbidden) |
| Staff permission on join | `assertStaffCaseAccess` on `case.join` | **PASSED MOCKED** |
| JWT in browser JS | BFF + HttpOnly cookies only for REST; ticket only in handshake | **PASSED CONFIG** (code review) |
| Ticket in URL/storage/logs | hook/BFF design | **PASSED CONFIG** (code review) |
| Mint rate limit + no-store | 9D-B1 controllers + BFF `Cache-Control: no-store` | **PASSED CONFIG** (code review) |

---

## 5. Room isolation & event routing

| Scenario | Enforcement | Result |
|----------|-------------|--------|
| User message → own `conv:*` + `case:*:staff` | `CommunicationRealtimePublisher` | **PASSED MOCKED** (publisher spec) |
| Staff reply → target `conv:*` + staff room | same | **PASSED MOCKED** |
| Relay → target conv only (relayed body) | messages service emits after relay persist | **PASSED MOCKED** (service + publisher) |
| Payload = `MessageResponseDto` only | no `relayNote` in DTO | **PASSED CONFIG** |
| Cross-participant direct rooms | none in gateway | **PASSED CONFIG** |

---

## 6. Reconnection & deduplication (clients)

| Check | Web (9D-B2) | Dashboard (9D-B3) |
|-------|-------------|-------------------|
| Fresh ticket per connect (`reconnection: false`) | **PASSED CONFIG** | **PASSED CONFIG** |
| Bounded backoff | **PASSED CONFIG** | **PASSED CONFIG** |
| Case/conversation switch cleanup | effect teardown + `conv.leave` | effect teardown + `case.leave` |
| Dedup by `message.id` | `message-merge` unit tests | `message-merge` unit tests |
| REST send when socket offline | **PASSED CONFIG** | **PASSED CONFIG** |
| Resync window after reconnect | **pageSize 100** | **pageSize 50** |

Documented limits: missed history beyond first page is **not** fully recovered without pagination work (9E-B / product).

---

## 7. End-to-end three-party flow (buyer → staff → owner)

| Step | Result |
|------|--------|
| 1–13 live flow with real MySQL identities | **SKIPPED** |

**Blockers (do not create demo/customer data):**

- No approved isolated **buyer + owner + assigned case agent** credentials and case ID documented for this run.
- No scripted E2E harness wired to real OTP website login + dashboard staff session + two external participants on one case.

**Prerequisites for live 9E-A rerun:**

1. API `4001`, web `3000`, dashboard `3002`, env `CORS_ORIGINS` + `NEXT_PUBLIC_FARMEXIT_API_URL` on both apps.
2. Communication case with **two** external conversations (buyer/owner) and staff with `communication.relay`.
3. Staff assigned as case agent or admin scope.

---

## 8. Tests executed (actual)

| Suite | Result |
|-------|--------|
| `api` `npm test -- --testPathPatterns=communication-realtime` | **PASSED** — 15 tests (incl. 2 new revalidation tests) |
| `api` `npm run build` | **PASSED** |
| `web` `npm run typecheck` | **PASSED** |
| `web` `npm run test:unit` | **PASSED** — 4 tests |
| `dashboard` `npm run typecheck` | **PASSED** |
| `dashboard` `npm run test:unit` | **PASSED** — 10 tests |
| Live handshake without ticket | **PASSED LIVE** (disconnect, see §4) |
| Full buyer/staff/owner realtime | **SKIPPED** |

**Not run (9E-B scope):** Full visual/Figma suites, unrelated Playwright matrices.

---

## 9. Production deployment requirements

- Single API instance or **shared ticket store** (9D-B1 MVP limitation: in-memory tickets).
- TLS (**WSS**) on API; explicit `NEXT_PUBLIC_FARMEXIT_*` on web and dashboard builds.
- `CORS_ORIGINS` must list exact website and dashboard production origins.
- `REALTIME_SESSION_REVALIDATE_MS` tuned for security vs load (default 30s).
- Horizontal scale requires sticky sessions or Redis tickets (documented in 9D-B1).

---

## 10. Remaining blockers / 9E handoff

| Item | Priority |
|------|----------|
| Live three-party integration with approved test users | 9E-B |
| Brief Socket.IO client `connect` before server `disconnect` without ticket — cosmetic; no room join | Low — document for client UX |
| Multi-page message backfill after long outage | Product / 9E-B |
| Redis/shared tickets for multi-instance API | Infra approval |
| Full regression + visual messaging QA | **Phase 9E-B** |

---

## 11. Regression posture

Stage 1E, Phase 8, 9B/9C UI, 9D-B1/B2/B3 clients preserved. Only gateway revalidation and web test config touched.

**No commits or pushes** in this phase.
