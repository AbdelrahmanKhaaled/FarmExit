# FarmExit Admin Dashboard — Detail Workspaces Completion Report

**Date:** 2026-10-22  
**Scope:** Nine legacy detail route groups + users filter labels. Dashboard only. No commits.

---

## Executive summary

All **nine** detail route groups now use **`AdminDetailHeader` + `DetailWorkspace`** (communications: main thread + context aside). Workflow routes keep **`SpecializedWorkflowPanel`** / **`CoPurchaseActionsPanel`** / **`EvaluationEditPanel`** with unchanged server actions. **Users** list filter shows localized account status labels while submitting the same enum values.

**Verdict:** **COMPLETE — CODE VERIFIED, VISUAL QA PENDING** (no authenticated browser capture in agent environment).

---

## Per-route changes

| Route | Layout | Preserved behavior |
|-------|--------|-------------------|
| `/admin/farm-details/[id]` | Summary panel, review history, forwarding section; workflow aside | `decideFarmDetailsAction`, `EmbeddedRequestForwardingSection` |
| `/admin/farm-management/[id]` | Farm/need/types/goals/situation; reviews; workflow aside | `decideFarmManagementAction` |
| `/admin/partnerships/[id]` | Farm context, description, linked applications table, reviews | `decidePartnershipRequestAction`, applications API |
| `/admin/partnerships/applications/[id]` | Parent link, applicant fields, reviews | `decidePartnershipApplicationAction` |
| `/admin/verification/[id]` | Professional type (EnumLabel), capability ID, reviews | `decideProfessionalVerificationAction` |
| `/admin/evaluations/[farmId]/[evaluationId]` | Header + farm link; panel wraps `EvaluationEditPanel` | DASH-003/004 checks, lock rules, `updateEvaluationAction` |
| `/admin/co-purchase/[id]` | Group summary, members table, actions aside | `CoPurchaseActionsPanel`, member PATCH flow |
| `/admin/users/[id]` | Profile dl, farm relationships table | Read-only staff user API |
| `/admin/communications/[id]` | Thread workspace + case context aside | REST messages, Socket.IO, relay/send actions |

**Already premium (unchanged this pass):** `/admin/requests/[id]`, `/admin/listings/[id]`, `/admin/farms/[id]`, `/admin/proposals/[id]`.

---

## Components reused / created

**Reused:** `PageContainer`, `DetailWorkspace`, `AdminDetailHeader`, `StatusBadge`, `EnumLabel`, `EntityLink`, `DataTable` (`embedded`), `SpecializedWorkflowPanel`, `CoPurchaseActionsPanel`, `EvaluationEditPanel`, `CommunicationCaseWorkspace`, `EmbeddedRequestForwardingSection`.

**Created:**

- `AdminDetailSection` — titled `admin-detail-panel` sections
- `WorkflowReviewsTable` — localized decision badges + comments
- `UnifiedRequestLink` — link to unified request hub

`DetailList` / `ActionPanel` are not present in this codebase; workflow actions remain in existing panels.

---

## EN/AR

- `admin.workflowCommon` (summary, review history, no reviews)
- `communicationsDetail.assignedStaff`, `caseContext`
- `userDetail.profile`, `partnershipDetail.noApplications`, `farmManagementDetail` field labels
- Users filter: `admin.enums.accountStatus.active` / `suspended` (values unchanged)

`check-messages` passes for EN/AR parity.

---

## Responsive

- `DetailWorkspace` stacks on small viewports; sticky aside on `lg+`
- Tables use embedded shell + horizontal scroll from shared table styles
- Communications thread uses `admin-comm-thread` max-height

---

## Small fixes

- Users page `<select>` options localized (not raw `active` / `suspended`)
- Long IDs: `EntityLink` truncation + `title`, `break-all` mono for staff/capability IDs
- `CommunicationCaseWorkspace`: optional `hideRequestBanner` to avoid duplicate request line when header/aside show context
- `EvaluationEditPanel`: `admin-form-control` on edit fields

---

## Test results

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | 27/27 pass |
| `npm run build` | Pass |

No new unit tests (presentation-only; existing action tests unchanged).

---

## Browser verification

**Not performed** in agent session. Please hard-refresh port **3002** and spot-check each detail route in EN and AR.

---

## Remaining UI defects

- No request **documents** on specialized workflow detail APIs (not in response types) — cannot add `RequestDocumentsPanel` without backend fields
- Communications **case agent** still shows staff user ID when API has no display name
- Evaluation status `<select>` options still use backend status keys (editable set); table/badge uses `StatusBadge`
- Farm management **management type / goal** strings are API-provided (not enum-mapped)

---

## Files changed

**Pages:**  
`farm-details/[id]/page.tsx`, `farm-management/[id]/page.tsx`, `partnerships/[id]/page.tsx`, `partnerships/applications/[id]/page.tsx`, `verification/[id]/page.tsx`, `evaluations/[farmId]/[evaluationId]/page.tsx`, `co-purchase/[id]/page.tsx`, `users/[id]/page.tsx`, `communications/[id]/page.tsx`, `users/page.tsx`

**Features:**  
`workspace/AdminDetailSection.tsx`, `WorkflowReviewsTable.tsx`, `UnifiedRequestLink.tsx`, `communications/CommunicationCaseWorkspace.tsx`, `evaluations/EvaluationEditPanel.tsx`

**Messages:** `messages/en/admin.json`, `messages/ar/admin.json`
