# FarmExit Admin Dashboard — Route Matrix (detail workspaces)

**Updated:** 2026-10-22  
**Reports:** `DASHBOARD_DETAIL_WORKSPACES_COMPLETION_REPORT.md`, `DASHBOARD_PREMIUM_UI_COMPLETION_REPORT.md`

| Verdict | Meaning |
|---------|---------|
| **COMPLETE — LIVE VISUALLY VERIFIED** | User browser confirmation |
| **COMPLETE — CODE VERIFIED, VISUAL QA PENDING** | Build/tests pass; refresh to verify UI |
| **PARTIALLY COMPLETE** | Functional gaps or API limits |
| **BLOCKED** | External dependency |

---

## List routes

All operational list routes: **COMPLETE — CODE VERIFIED, VISUAL QA PENDING** (shared list shell from premium pass).

---

## Detail routes

| Route | Visual / code | EN/AR | Mobile/RTL | Notes |
|-------|---------------|-------|------------|-------|
| `/admin/requests/[id]` | CODE VERIFIED | OK | Pending | DetailWorkspace (prior) |
| `/admin/listings/[id]` | CODE VERIFIED | OK | Pending | DetailWorkspace (prior) |
| `/admin/farms/[id]` | CODE VERIFIED | OK | Pending | DetailWorkspace (prior pass) |
| `/admin/proposals/[id]` | CODE VERIFIED | OK | Pending | DetailWorkspace (prior pass) |
| `/admin/farm-details/[id]` | **CODE VERIFIED** | OK | Pending | This pass |
| `/admin/farm-management/[id]` | **CODE VERIFIED** | OK | Pending | This pass |
| `/admin/partnerships/[id]` | **CODE VERIFIED** | OK | Pending | This pass |
| `/admin/partnerships/applications/[id]` | **CODE VERIFIED** | OK | Pending | This pass |
| `/admin/verification/[id]` | **CODE VERIFIED** | OK | Pending | This pass |
| `/admin/evaluations/[farmId]/[evaluationId]` | **CODE VERIFIED** | OK | Pending | This pass |
| `/admin/co-purchase/[id]` | **CODE VERIFIED** | OK | Pending | This pass |
| `/admin/users/[id]` | **CODE VERIFIED** | OK | Pending | This pass |
| `/admin/communications/[id]` | **CODE VERIFIED** | OK | Pending | Agent ID display API-limited |

---

## Shell / other

| Route | Status |
|-------|--------|
| `/admin/login` | CODE VERIFIED (prior QA) |
| `/admin` overview | CODE VERIFIED |
| `/admin/analytics` | CODE VERIFIED |

---

## Summary

**All implementable detail workspaces: COMPLETE — CODE VERIFIED, VISUAL QA PENDING.**

Live EN/AR verification remains on the user (Super Admin session on :3002).
