# Phase 9E-B — Final Messaging QA, Figma Parity & Regression Verification

**Date:** 2026-10-21  
**Prior phases preserved:** 9B UI, 9C context, 9D realtime (B1–B3), 9E-A room revalidation.

---

## Final verdict

**BLOCKED for “live three-party messaging fully verified”** — no approved isolated buyer + owner + staff case identities were available; customer/demo data was not created or modified.

**READY FOR NEXT FRONTEND PHASE** for website inbox/conversation UI, contextual entry points (mocked/automated), Socket.IO security (automated + targeted live probes), and staff workspace behavior (automated + code review)—provided production deploy checklist (§11) is applied before go-live realtime.

---

## 1. Figma screen-to-route verification

| Figma ref (from 9B pack) | Route / surface | Verification method | Result |
|--------------------------|-----------------|---------------------|--------|
| p03 / p11 / p24 Desktop inbox + thread | `/[locale]/my/messages`, `/[locale]/my/messages/[caseId]`; fixture `/[locale]/phase9b?screen=thread` | Playwright stage9b + screenshots | **PASSED MOCKED** (12/12) |
| p05 / p33 Mobile conversation | Same fixture; mobile project 390px | stage9b mobile tests | **PASSED MOCKED** |
| p38 Arabic RTL | `ar` locale in stage9b | **PASSED MOCKED** |
| p27 Request context header | `ConversationView` + `RequestContextHeader` on live thread; rich header on tracking via 9C | Code + 9C tests | **PASSED MOCKED** (fixture uses case/request refs; not full p27 farm card) |

**Figma PDF baseline pack:** Documented path `web/figma-baselines/phase9/` — **not present in workspace** (0 files). No automated pixel diff against PDFs was possible. Visual review uses **implementation screenshots** at `web/artifacts/phase9e/` (copied from latest stage9b run).

### Screenshots (EN/AR, 1440 / 1024 / 390)

| File | Viewport |
|------|----------|
| `desktop-1440-en-thread.png`, `desktop-1440-ar-thread.png` | 1440 |
| `tablet-1024-en-thread.png`, `tablet-1024-ar-thread.png` | 1024 |
| `mobile-390-en-thread.png`, `mobile-390-ar-thread.png` | 390 |

### Known visual gaps (nonblocking, documented in 9B)

- No inbox message previews, unread badges, farm thumbnails, or attachment UI (no API).
- Tablet uses same thread layout as mobile below `desktop` breakpoint unless widened.
- Logo aspect-ratio console warning in visual runs (global brand asset; not changed in 9E-B).

**UI code changes in 9E-B:** None (verification-only).

---

## 2. Real-time messaging integration (live)

| Step | Result |
|------|--------|
| 1–11 Buyer → staff → owner E2E with MySQL | **BLOCKED** |

**Missing setup (exact):**

- Documented isolated OTP website users (buyer + owner on same communication case).
- Dashboard staff with `communication.relay` + case agent assignment on that case.
- Explicit approval to use specific case/request IDs in a shared environment.

**Not performed:** listing publish, seed, assignment changes, or demo conversation mutation.

---

## 3. Security regression (9E-A + 9E-B probes)

| Check | Result | Evidence |
|-------|--------|----------|
| Missing/invalid ticket cannot join rooms | **PASSED LIVE** | Client without ticket: `conv.join` → no ack, `joinedAck=false`, disconnected |
| Expired/replayed/wrong-audience tickets | **PASSED MOCKED** | `communication-realtime-ticket.service.spec.ts` |
| Website cannot `case.join` | **PASSED MOCKED** | `communication-realtime.gateway.spec.ts` |
| Join handlers require `socket.data.auth` | **PASSED MOCKED** | `requireWebsite` / `requireDashboard` |
| Session revocation disconnects | **PASSED MOCKED** | gateway revalidation spec |
| Staff case / relay permission loss | **PASSED MOCKED** | 9E-A `revalidateJoinedRooms` + spec |
| Website participation loss in `conv:*` | **PASSED MOCKED** | 9E-A spec |
| Revalidation interval | **PASSED CONFIG** | `REALTIME_SESSION_REVALIDATE_MS` default 30s |
| Cross-conversation client filter | **PASSED CONFIG** | 9D-B2/B3 + merge unit tests |
| `relayNote` / JWT in socket payload | **PASSED CONFIG** | `MessageResponseDto` only |

### Brief `connect` without ticket (9E-A follow-up)

| Question | Finding |
|----------|---------|
| Can unauthorized socket join a room? | **No** — `data.auth` never set; `conv.join` does not complete (`joinedAck=false`). |
| Can it receive `message.created`? | **No** — publisher emits only to `conv:*` / `case:*:staff` rooms; unauthenticated sockets are not joined. |
| Transient client `connect` event? | **Yes (cosmetic)** — transport may flash `connect` before server `disconnect`; **no data exposure** observed in live probe. |

**Backend change in 9E-B:** None required.

---

## 4. Reconnection & deduplication

| Item | Website | Dashboard |
|------|---------|-----------|
| Fresh ticket per connect | **PASSED CONFIG** | **PASSED CONFIG** |
| Bounded backoff | **PASSED CONFIG** | **PASSED CONFIG** |
| Case/conversation switch cleanup | **PASSED CONFIG** | **PASSED CONFIG** |
| Dedup by `message.id` | **PASSED MOCKED** (4 unit tests) | **PASSED MOCKED** (2 unit tests) |
| REST when socket down | **PASSED CONFIG** | **PASSED CONFIG** |
| Resync limits | **100** msgs/page | **50** msgs/page |
| Closed case send | **PASSED CONFIG** | **PASSED CONFIG** (staff actions + API) |

---

## 5. Phase 9C request-context regression

| Entry surface | Request ID source | Automated test |
|---------------|-------------------|----------------|
| Listing / Quick Sale tracking | `request.id` | **PASSED CONFIG** (code) |
| Management / generic `RequestTracking` | route `id` | stage9c mocked flows |
| Purchase proposal | `proposal.id` | **PASSED CONFIG** (code) |
| Farm-details inquiry | `request.id` | **PASSED CONFIG** (code) |
| Partnership owner / application / professional verification | `RequestTracking` + `MessageFarmExitPanel` | **PASSED CONFIG** (9C report routes) |

**Playwright stage9c:** **4/4 PASSED MOCKED** (open case, dedupe, no agent error, 403).

**Not run live:** each CTA against real API for all seven types (no approved sessions).

---

## 6. Staff mediation & dashboard

| Item | Result |
|------|--------|
| Staff workspace send/relay via server actions | **PASSED CONFIG** |
| Socket `case.join` + `message.created` | **PASSED CONFIG** (9D-B3) |
| Relay note not in socket payload | **PASSED CONFIG** |
| Live staff inbox update | **BLOCKED** (same as §2) |

---

## 7. Regression suite results (this run)

| Suite | Result |
|-------|--------|
| API `communication-realtime` (15 tests) | **PASSED** |
| API `communication-messages.service` (3 tests) | **PASSED** |
| Web `typecheck` + `lint` + `test:unit` (4) | **PASSED** |
| Dashboard `typecheck` + `lint` + `test:unit` (10) | **PASSED** |
| Playwright `stage9b.config.ts` (12) | **PASSED MOCKED** |
| Playwright `stage9c.config.ts` (4) | **PASSED MOCKED** |
| Web `phase9-portal` sign-in guard | **Not re-run** (optional; unchanged) |

---

## 8. Live vs mocked vs skipped

| Category | Items |
|----------|--------|
| **PASSED LIVE** | API up (:4001 docs 200); socket reject without ticket + no room join |
| **PASSED MOCKED** | All automated tests above; visual fixtures; security unit tests |
| **SKIPPED** | Full portal E2E auth flows; pixel PDF diff (missing figma pack) |
| **BLOCKED** | Three-party realtime + persistence reload with real users |
| **FAILED** | None |

---

## 9. Remaining issues

| ID | Severity | Issue |
|----|----------|--------|
| B1 | **Blocking (production realtime)** | In-memory single-use tickets — multi-instance API needs shared store (approved separately) |
| B2 | **Blocking (live sign-off)** | No approved three-party test harness / identities |
| N1 | Nonblocking | Brief Socket.IO `connect` before disconnect without ticket |
| N2 | Nonblocking | Resync pagination caps (100/50) |
| N3 | Nonblocking | Inbox metadata vs Figma previews |
| N4 | Nonblocking | `figma-baselines/phase9` absent from repo — add for future pixel CI |

---

## 10. Production deployment checklist

- [ ] API **4001** (or reverse-proxied `/api/v1` + `/socket.io` + namespace `/communication`)
- [ ] **WSS/TLS** termination; `NEXT_PUBLIC_FARMEXIT_API_URL` / realtime origin on web **3000** and dashboard **3002**
- [ ] `CORS_ORIGINS` = exact production web + dashboard origins (no `*`)
- [ ] `SOCKET_IO_PATH` aligned with proxy path
- [ ] Sticky sessions **or** shared ticket store if >1 API replica
- [ ] Plan for API restart (all sockets + tickets invalidated; clients reconnect with new tickets)
- [ ] Do **not** use port **4000** (foreign project)

---

## 11. Handoff

- **Next frontend phase** may proceed on UI + integration contracts already delivered.
- **Before production realtime:** complete **BLOCKED** live three-party test with approved data; resolve **B1** if horizontally scaled.
- **Phase 10:** not started (per scope).

**No migrations, seeds, commits, or pushes in 9E-B.**
