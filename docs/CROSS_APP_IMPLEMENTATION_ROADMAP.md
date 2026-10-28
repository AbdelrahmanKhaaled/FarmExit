# FarmExit — Cross-App Implementation Roadmap (Stage 1)

**Date:** 2026-10-21  
**Prerequisite docs:** `docs/CROSS_APP_INTEGRATION_GAP_MAP.md`, `FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_REDESIGN_BLUEPRINT.md`, `web/docs/FINAL_FRONTEND_COMPLETENESS_AUDIT.md`.

**Policy:** No new backend features until explicitly un-paused. This roadmap only connects **existing** APIs and improves dashboard UX.

---

## Phase 0 — Decisions & environment (1–2 days)

| Task | Owner | Output |
|------|-------|--------|
| **DASH-001:** Case agent dashboard access | Product + eng | Decision: (A) admin-only console unchanged, agents use future tool; (B) expand console to `caseAgent`/`reviewer` with permission-scoped nav; (C) separate lightweight agent app |
| Dev staff accounts | Ops | Admin + case agent credentials on :4001 |
| Dev website OTP | Ops | `DEV_FIXED_OTP_ENABLED` for web UAT |
| Baseline screenshots | Design | Dashboard EN/AR before redesign |

**Exit criteria:** Written decision on DASH-001; smoke login to dashboard and website.

---

## Phase 1 — Existing API integration fixes (P0/P1, dashboard-heavy)

**Goal:** Close disconnected staff workflows without API changes.

| # | Gap ID | Work | Key files | Depends |
|---|--------|------|-----------|---------|
| 1.1 | DASH-002 | Forwarding decision UI + server action → `POST .../forwardings/:id/decision` | `RequestForwardingPanel.tsx`, `platform.ts` | Request detail data includes forwarding ids |
| 1.2 | DASH-003 | “Create evaluation” from farm detail or evaluations inbox → `POST /farms/:farmId/evaluations` | `evaluations/page.tsx`, new action | Admin role |
| 1.3 | DASH-004 | Evaluation check edit → `POST/PUT .../checks` | `EvaluationEditPanel.tsx`, `platform.ts` | 1.2 |
| 1.4 | DASH-005 | Private location panel (staff only) → `GET/PUT /farms/:id/private-location` | `farms/[id]/page.tsx`, new action | Permission in API |
| 1.5 | DASH-006 | Optional request status control → `POST /staff/requests/:id/status` | `RequestActions.tsx`, `requests.ts` | Workflow rules doc |
| 1.6 | — | Permission-aware error display (403/404) on all `apiFetchAdminResult` pages | shared helper | — |

**Website (same phase, small):**

| # | Gap ID | Work |
|---|--------|------|
| 1.7 | WEB-005 | Align marketplace filters with supported query params; disable unsupported with helper text |

**Testing:** Targeted dashboard unit tests for new actions; manual staff UAT checklist per request type.

**Exit criteria:** Forwarding decision retrievable in UI; evaluation lifecycle creatable end-to-end in dashboard; marketplace filters honest.

---

## Phase 2 — Dashboard missing functionality polish (P1/P2)

| # | Work | Notes |
|---|------|-------|
| 2.1 | Implement DASH-001 decision (if B or C chosen) | Nav split, layout guard, permission-filtered routes |
| 2.2 | Distinct sidebar icons (DASH-007) | `admin-navigation.ts` + icons |
| 2.3 | Migrate list filters to `FilterBar` (DASH-008) | communications, evaluations, audit, farms |
| 2.4 | Co-purchase member actions audit | Match all `offers.controller` staff member endpoints |
| 2.5 | Communications message pagination | API supports pages; dashboard currently loads page 1 size 50 |

**Exit criteria:** Case agents (if in scope) can open assigned cases; list filters validated.

---

## Phase 3 — Dashboard redesign — foundation (see blueprint §13 order 1–3)

| # | Work | Deliverable |
|---|------|-------------|
| 3.1 | Token alignment with website greens | Updated `admin-tokens.css` |
| 3.2 | Shell + sidebar + header | Visual refresh, RTL pass on shell |
| 3.3 | Login page | Branded, accessible form |
| 3.4 | Overview page | KPI + charts + queue cards |
| 3.5 | Extract `ReviewDecisionForm` + `ActionPanel` | Used in phase 4 pages |

**Constraint:** No change to server action signatures or API paths.

**Exit criteria:** Design review approval on shell + overview; AR screenshot parity check.

---

## Phase 4 — Dashboard redesign — operational pages (blueprint §13 order 4–8)

| Sprint | Pages |
|--------|-------|
| 4a | Requests hub, listings, listing-pipeline |
| 4b | Communications workspace (thread + relay) |
| 4c | Specialized review detail pages (farm-details, management, verification, partnerships) |
| 4d | Proposals, co-purchase |

Each sprint: apply table template, detail two-column layout, empty/loading/error states.

**Exit criteria:** All console routes visually consistent; no regression in actions.

---

## Phase 5 — Dashboard redesign — directory & compliance (blueprint §13 order 9–12)

| Page | Notes |
|------|-------|
| Farms + evaluations | Include private location panel from Phase 1 |
| Users + administrators | PII masking patterns |
| Analytics | Chart polish inside `ChartShell` |
| Audit logs | Read-only; export deferred unless API adds it |

---

## Phase 6 — Website integration fixes (no redesign)

| # | Gap ID | Work |
|---|--------|------|
| 6.1 | WEB-006 | Public navbar session indicator (if UAT confirms gap) |
| 6.2 | WEB-008 | Execute manual UAT matrix from `FINAL_FRONTEND_COMPLETENESS_AUDIT.md` |
| 6.3 | WEB-009 | Live three-party messaging test with staff case |

**Blocked items (do not implement until API approved):** WEB-001, WEB-002, WEB-003, WEB-004.

---

## Phase 7 — Cross-app regression & UAT

| Stream | Checks |
|--------|--------|
| API | Existing e2e suites (`api` in-memory); smoke on dev DB read-only |
| Website | Playwright public suites; authenticated spec when OTP configured |
| Dashboard | New Playwright smoke for login, overview load, listing decision path, communication send |
| Cross-app | Listing published on dashboard → appears on website marketplace; proposal submitted on web → visible on dashboard |
| Realtime | Website + dashboard socket ticket + message.created after REST |
| Security | Website token cannot call `/staff/*`; staff cannot use website BFF |

**Sign-off artifacts:** UAT checklist signed; open P2 backlog for post-launch.

---

## Timeline sketch (indicative)

| Phase | Duration (eng) |
|-------|----------------|
| 0 | 1–2 days |
| 1 | 3–5 days |
| 2 | 3–5 days |
| 3 | 3–4 days |
| 4 | 8–12 days (parallelizable 4a–4d) |
| 5 | 4–6 days |
| 6 | 3–5 days (parallel with 4–5) |
| 7 | 2–3 days |

Total **~4–7 weeks** with one full-stack focus; redesign phases shrink if scope limited to shell + requests + listings only.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| DASH-001 unresolved blocks agent messaging ops | Escalate in Phase 0 |
| Redesign breaks server actions | Component-only changes; no API contract edits |
| Permission mismatch after nav expansion | Feature flags per role |
| Realtime multi-instance tickets | Production checklist from Phase 9E (sticky/Redis) — infra, not this roadmap |

---

## Definition of done (program)

1. All **P0/P1** items in gap map closed or explicitly BLOCKED with ticket.
2. Dashboard passes visual review on blueprint order 1–12.
3. Website UAT complete for wired flows; blocked features documented.
4. No invented public discovery, notifications, or deal-closure UI.

---

*End of roadmap. Implementation not started in Stage 1.*
