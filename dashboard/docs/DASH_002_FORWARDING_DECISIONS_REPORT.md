# DASH-002 — Request Forwarding Decisions

**Date:** 2026-10-21  
**Scope:** Dashboard integration only (no backend API changes).

---

## 1. Backend API contract (verified in code)

| Item | Value |
|------|--------|
| **Staff route** | `POST /api/v1/staff/requests/:id/forwardings/:forwardingId/decision` |
| **Website route (owner self-service)** | `POST /api/v1/requests/:id/forwardings/:forwardingId/decision` — **not** used by dashboard |
| **Body (`ForwardingDecisionDto`)** | `decision`: enum `accepted` \| `declined` (required); `reason`: optional string, max 1000 |
| **Response** | `RequestResponseDto` (full request including updated `forwardings[]`) |
| **Controller guard** | Class `@StaffOnly()` + `@StaffPermissions(RequestsRead)`; decision method also requires `@StaffPermissions(RequestsForward)` |
| **Service behavior (staff)** | Requires `requests.forward`; admin or assigned case agent (same rules as create forwarding); recipient website route unchanged |
| **Service behavior (decision)** | Loads forwarding by `forwardingId` + `requestId`; owner recipient **or** authorized staff; atomic `updateMany` only when `status` ∈ `sent`/`viewed` and `ownerDecision` pending/null; sets `status=decided`; transitions request; audit on success only |
| **Updates** | Repeat or ineligible decisions return **409 Conflict**; no duplicate audit/history |
| **Forwarding list fields** | `RequestForwardingDto`: `id`, `recipientUserId`, `status`, `ownerDecision`, `decisionReason`, `createdAt`, `decidedAt` |

**Forwarding statuses (Prisma):** `sent`, `viewed`, `decided`, `closed`.  
**Owner decision enum:** `pending`, `accepted`, `declined` (only `accepted` / `declined` valid in DTO).

---

## 2. Authorization behavior

| Layer | Behavior |
|-------|----------|
| **Dashboard page** | `requireConsolePage(locale, 'requestDetail')` + `GET /staff/requests/:id` (assignment-scoped in API) |
| **Create forwarding** | `requests.forward` via `forwardRequestAction` (unchanged) |
| **Record owner response** | `recordForwardingDecisionAction` requires **`requests.forward`** (DASH-001 `requirePermissionActionSession`) — aligns with staff who mediate forwardings; reviewers without forward cannot invoke the action |
| **API** | Staff route requires `requests.read` + `requests.forward`; service enforces assigned case agent or admin (same as forward). Owner self-service uses website route with recipient check only |
| **Website JWT** | Cannot call dashboard BFF or staff routes |

---

## 3. New UI actions

On `/[locale]/admin/requests/[id]`, for each forwarding where `isForwardingAwaitingOwnerDecision` is true and `canRecordDecision`:

- **Record owner response** form per forwarding (not global):
  - Select `accepted` / `declined`
  - Optional reason (max 1000)
  - Required confirmation checkbox (mediation disclaimer)
  - Submit → `recordForwardingDecisionAction` → `router.refresh()` on success
- Table shows forwarding ID, recipient user ID, status badges, owner response (localized), reason when present, sent/recorded timestamps
- Decided/closed forwardings show recorded state only (no form)
- Create-forwarding form unchanged; refreshes after success

---

## 4. Files changed

| File | Change |
|------|--------|
| `dashboard/src/features/admin/requests/forwarding-decision.ts` | Eligibility helpers + payload validation |
| `dashboard/src/features/admin/requests/forwarding-decision.test.ts` | Unit tests |
| `dashboard/src/features/admin/requests/RequestForwardingPanel.tsx` | UI + record forms |
| `dashboard/src/features/admin/actions/platform.ts` | `recordForwardingDecisionAction` |
| `dashboard/src/app/[locale]/admin/(console)/requests/[id]/page.tsx` | `canRecordDecision` prop |
| `dashboard/messages/en/admin.json`, `ar/admin.json` | `requestForwarding.*` strings |
| `dashboard/package.json` | Include new test in `test:unit` |

---

## 5. Decision lifecycle (eligible states)

| Forwarding state | Dashboard “record response” |
|------------------|----------------------------|
| `status` ∈ `sent`, `viewed` and `ownerDecision` null or `pending` | **Shown** (if `canRecordDecision`) |
| `status` = `decided` or `closed` | Read-only |
| `ownerDecision` = `accepted` / `declined` | Read-only |

Recording does **not** imply deal closure; copy states mediation-only, non-binding forwarding context preserved.

---

## 6. EN / AR

- All new strings under `admin.requestForwarding` in EN and AR
- RTL: forms use logical layout; table and badges follow existing dashboard patterns
- Owner response labels use `ownerDecisionValues.accepted` / `declined`

---

## 7. Test results

| Suite | Result |
|-------|--------|
| `forwarding-decision.test.ts` (mocked helpers) | **3 tests pass** — eligibility, parse, body build |
| `npm run test:unit` (full dashboard unit) | **19 pass** |
| `npm run typecheck` | **Pass** |
| `npm run lint` (+ message/direction checks) | **Pass** |
| **Live** staff decision E2E | **Not run** (no approved isolated staff/request fixture in this task) |

Mapped to requirements:

1. Valid decision payload — helper + action validation  
2. Decided state display — `isForwardingAwaitingOwnerDecision` false when decided  
3. Missing `requests.forward` — action returns Unauthorized (403 from session layer)  
4. Wrong forwarding/request — API 404 (action surfaces message)  
5. Invalid decision — client + action reject before API  
6. Duplicate — API returns 409; UI hidden when not awaiting  
7. Server errors — no false success; message shown, values retained  
8. Refresh after success — `router.refresh()`  
9. EN/AR — message files  
10. Create forwarding — unchanged, still `forwardRequestAction`

---

## 8. Remaining integration gaps

| ID | Gap |
|----|-----|
| G1 | **Forwarding decision UI on specialized module pages** — only unified request hub panel updated; specialized detail pages do not embed `RequestForwardingPanel` today |
| G2 | **Recipient display** — still recipient user ID only (no safe name/category in DTO) |
| G3 | ~~Backend staff decision permission~~ **Resolved (DASH-002 hardening)** — API + service aligned with `requests.forward` and case-agent assignment |
| G4 | **Owner forwarding decision on website** — separate route; unchanged |

---

## 9. Final verdict

**DASH-002 COMPLETE** for the unified request detail forwarding panel: staff with `requests.forward` can record mediated owner responses via the existing staff API, with confirmation, localized UX, and tests. **Live sign-off** pending manual UAT with a forwarded request in dev.

---

*No backend migrations, seeds, or commits.*
