# FarmExit Dashboard — Functional Completion Report

**Date:** 2026-10-21  
**Scope:** All independently implementable dashboard integrations (DASH-003–006 + operational completion). **No visual redesign.** DASH-001/DASH-002 preserved.

---

## 1. Executive summary

The admin dashboard now wires remaining **existing API** gaps for evaluations (create + checks), staff private farm location (read-only), generic request status transitions, forwarding on key workflow pages, co-purchase member updates, communications history pagination, and consistent API error messaging. **Typecheck, lint, unit tests (22), and production build pass.** Live UAT with dev credentials is still required before **LIVE VERIFIED**.

**Verdict:** **FUNCTIONALLY COMPLETE (CODE VERIFIED)** — ready for manual UAT; redesign is a separate prompt.

---

## 2. DASH-003 — Evaluation creation

| Item | Detail |
|------|--------|
| API | `POST /api/v1/farms/:farmId/evaluations` (`CreateEvaluationDto`) |
| Permission | `evaluations.manage` (staff guard + server action) |
| UI | `/admin/evaluations/new?farmId=` + farm detail link + evaluations list CTA |
| Behavior | Draft/inReview only; confirmation; navigates to `/admin/evaluations/{farmId}/{id}` on success |

---

## 3. DASH-004 — Evaluation checks

| Item | Detail |
|------|--------|
| API | `POST …/checks`, `PUT …/checks/:checkKey` (via `recordCheck` upsert) |
| UI | `EvaluationChecksPanel` on evaluation detail; locked when approved/published/superseded/withdrawn |
| Check keys | Staff-entered (ERD: approved criterion keys); examples from API contract in UI hint |

---

## 4. DASH-005 — Private farm location

| Item | Detail |
|------|--------|
| API | `GET /api/v1/farms/:id/private-location` |
| Permission | `farms.private-location.read` (**admin/superAdmin only** in current matrix) |
| UI | `PrivateFarmLocationPanel` on farm detail — map embed + coordinates + road fields |
| **BLOCKED** | `PATCH` private location is **owner-only** per API; staff cannot update coordinates (documented, not weakened) |

---

## 5. DASH-006 — Request status

| Item | Detail |
|------|--------|
| API | `POST /api/v1/staff/requests/:id/status` |
| Permission | `requests.review` |
| UI | `RequestStatusTransitionPanel` on unified request hub |
| Rules | Hidden for `SPECIALIZED_REQUEST_TYPES`; conservative `closed` / admin `withdrawn` only |

---

## 6. Forwarding integration

- **Embedded panel:** purchase proposals, farm-details requests (same request id).
- **Hub link:** listings (`#forwarding` anchor on panel).
- **Full panel:** unified `/admin/requests/[id]` (DASH-002 + hardening unchanged).

---

## 7. Co-purchase

- Added `PATCH /staff/co-purchase-groups/:id/members/:memberId` via `updateCoPurchaseMemberAction`.
- Member status + share update forms on group detail.

---

## 8. Communications

- `fetchStaffConversationMessagesAction` supports `page` parameter.
- **Load older messages** merges pages into thread (REST source of truth; Socket.IO unchanged).

---

## 9. Permissions & errors

- `staffApiErrorMessage()` for 401/403/404/409/5xx in new/updated actions.
- DASH-001 route guards and server actions unchanged.

---

## 10. Files changed (summary)

New: `evaluation-domain.ts`, `CreateEvaluationForm.tsx`, `EvaluationChecksPanel.tsx`, `PrivateFarmLocationPanel.tsx`, `RequestStatusTransitionPanel.tsx`, `request-status-transitions.ts`, `EmbeddedRequestForwardingSection.tsx`, `RequestHubForwardingLink.tsx`, `staff-api-result.ts`, `evaluations/new/page.tsx`, tests.

Updated: `platform.ts`, `requests.ts`, `co-purchase.ts`, `EvaluationEditPanel.tsx`, `RequestActions.tsx`, `RequestForwardingPanel.tsx`, `CommunicationCaseWorkspace.tsx`, farm/evaluations/proposals/farm-details/listings/co-purchase pages, `en/ar/admin.json`, `package.json`.

---

## 11. Test results

| Suite | Result |
|-------|--------|
| `npm run typecheck` | **PASSED** |
| `npm run lint` (+ message/direction checks) | **PASSED** |
| `npm run test:unit` (22 tests) | **PASSED MOCKED** |
| `npm run build` | **PASSED** |
| API tests | **Not run** (no API changes) |
| Live staff UAT | **SKIPPED** — needs approved fixtures |

---

## 12. Remaining blockers

See `DASHBOARD_REMAINING_BLOCKERS.md`.

---

## 13. Manual UAT checklist

- Reviewer: create evaluation on assigned farm; record check; cannot publish.
- Admin: read private pin on farm; confirm reviewer cannot.
- Case agent: forward + record decision on proposal; 409 on repeat.
- Communications: load >50 messages; relay + realtime still work.
- Co-purchase: update member status/share.

---

## 14. Redesign handoff (preserve behavior)

**Routes:** all `/admin/*` console routes, especially evaluations/new, request hub `#forwarding`, communications case workspace.

**Shared components:** `RequestForwardingPanel`, `EvaluationEditPanel`/`EvaluationChecksPanel`, `CommunicationCaseWorkspace`, `PrivateFarmLocationPanel`, `console-routes` + `staff-action-session`, BFF auth + realtime ticket routes.

**Do not drop:** permission decorators alignment, staff vs website JWT separation, non-binding co-purchase/forwarding copy.
