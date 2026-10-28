# Linked applications in the request workspace

Date: 2026-10-27.

## Running project and boundaries

The listening process on port 3003 was inspected before editing. It runs `FarmExit_dashboard-v2_redesigned/dashboard-v2`, not the top-level `dashboard-v2` copy. Only this active frontend and the shared `api` backend were changed. Backend verification used port 4001. Port 4000 was not accessed. No commits, pushes, schema migrations, fixture inserts, publication changes or existing-record changes were performed.

`docs/BACKEND_RULES.md` was read before implementation. New production queries use PrismaService, explicit field selections and validated DTOs. No raw SQL or new domain relationships were introduced.

## Domain audit

- Unified `Request` has a real self-relation: `parentRequestId` / `parent_request_id`, with `parent` and `children` relations.
- Supported partnership applications are requests with `requestType=partnershipApplication`, linked to a `partnership` parent by that foreign key, plus `RequestApplicationDetail` keyed by the child's `requestId`.
- The existing creation workflow sets the parent ID explicitly. It accepts applications for approved/published partnership opportunities, excludes current owners, requires supporting documents before submission, and uses the dedicated review/forwarding workflows.
- No supported management-application create/submit API or corresponding workflow was found. The `professionalApplication` request-type enum alone does not establish a management application workflow. No management application section or decisions were added.
- Listings, purchase proposals, farm-detail inquiries, professional verification and owner-created management requests are not partnership applications. Sharing a farm/applicant never associates them with this section.
- The old staff application inbox listed under-review applications globally/within assignment scope, without a parent-scoped list/search/sort/summary API. It could not satisfy this page's requirements by itself.

## Implemented UI

`/[locale]/admin/requests/[id]` is now a two-column operational workspace:

- Header: readable request reference, type, current status, farm, created/submitted UTC dates, publication state for the applicable request types, breadcrumbs, existing specialized-workflow link, refresh.
- Section navigation: Overview; Applications for partnership parents only; Review & status history; Communications for callers with communication permission; Related documents.
- Overview retains the existing request context. Child partnership application pages additionally show the real submitted message, fit, experience, approach and supported company fields from the existing authorized detail API.
- Applications received is an opportunity inbox with four summary cards, applicant cards, references, dates, current statuses, application summaries, available staff assignments and View application links.
- Search by applicant name/reference, valid status filtering, submission-date sorting, pagination and Clear are backed by the new API. List filters are applied before pagination. Summary cards explicitly cover all submitted applications visible to the caller for the opportunity, independently of list filters.
- Application links open the existing unified request route `/admin/requests/:childId`; it now provides the application answers, documents, history, assignments, forwarding, permitted communications and supported review form together. The parent backlink returns to its Applications section. Existing dedicated application pages remain available through the specialized-workflow link.
- The right panel shows Reviewer/Case Agent assignments, existing assignment/actions controls, the existing partnership application review controls when authorized, and forwarding/owner-decision controls. No existing functional section was removed.
- Review controls call the existing `/staff/partnership-applications/:id/decide` workflow. Only `underFarmExitReview` applications can be decided; rejection/changes still require a comment. Historic `submitted` records are shown as submitted and are not silently moved to a reviewable state. Parent-page invalidation and a refresh follow supported decisions.
- Document download links remain behind existing authorized endpoints. Document review controls are hidden from callers lacking `requests.review`; backend checks remain in force.
- English and Arabic translations, RTL-aware layout, focusable links, labelled filters, status badges, empty/restricted states and responsive mobile styles were added. Mobile section navigation scrolls horizontally and header facts use a compact grid.

## Read-only API and relationship integrity

New endpoint: `GET /api/v1/staff/requests/:id/applications`.

Supported query parameters: `page`, `pageSize` (maximum 50), `search` (maximum 150 characters), `status`, `sort=newest|oldest`.

1. The existing RequestsService access check authorizes the parent first. Non-partnership parents return 404.
2. Active staff context and `requests.read` are checked server-side. Admin/super-admin receive their existing scope. Non-admin access additionally requires a case-agent role and a case-agent assignment on each child, matching the dedicated application workbench's assignment restriction. A reviewer assignment on the parent does not grant application visibility.
3. Both records and summary aggregates are scoped by exact `parentRequestId`, child `requestType=partnershipApplication`, a real application-detail row, non-draft state and non-null submission date. Unfinished/unsubmitted drafts are not included in Applications received.
4. The same authorized scope is used for full-result counting and status aggregation. Search/status predicates narrow the list, then Prisma sorts and pages it with an ID tie-breaker. Stale/excessive pages clamp to the last matching page.
5. The response explicitly exposes only application reference, name, kind, a bounded summary, status/date and assigned staff names/roles. No applicant email, mobile, company registration, document storage key or private farm coordinates are selected or returned in the list.

Current list statuses use existing vocabulary: submitted, underFarmExitReview, changesRequested, approved, rejected, sentToOwner, accepted, declined, withdrawn and closed. Pending means submitted or underFarmExitReview; Approved and Rejected are their actual current statuses. No new lifecycle states or mutation endpoints were added.

## Verification

- Frontend `npm run typecheck`: passed.
- Frontend `npm run lint`: passed, including all translation-parity, direction, sidebar and session checks.
- Frontend `npm run test:unit`: 31 passed, including two new application-query/pagination regression tests.
- Backend `npx tsc --noEmit -p tsconfig.build.json`: passed.
- Scoped ESLint for the new backend DTO/service/controller and module, using the build tsconfig: passed. New verification-script ESLint: passed.
- New backend tests: 17 passed. Coverage includes exact parent/type/submission predicates, independent summary scope, server pagination, stale-page clamping, search/sort, no contact-field serialization, unsupported parent types, denied parent access, denied reviewer inheritance, per-child case-agent scope, missing staff permissions and invalid query inputs.
- Read-only API verification against existing data: six real opportunities matched independent foreign-key/type/status checks; counts and list contents matched; pageSize=1 exercised multiple real backend pages; ascending/descending submission sort, applicant-name/reference search, status filters and no-match states passed.
- Live endpoint checks: unsupported management parent 404; invalid status/query 400; unauthenticated caller 401. Stale page=100 clamped correctly.
- Browser verification passed for English and Arabic: parent cards/counts, filter submission, search, Clear, correct application navigation, answers/history/documents sections, parent backlink, eligible empty parent, no Applications section on management, RTL/LTR direction and 390px mobile overflow checks.
- Desktop and mobile screenshots were saved; the Applications cards and Arabic mobile layout were visually inspected. A separate live console check on the request workspace returned no warnings/errors. No browser page exceptions occurred in the flow check.
- Read-only browser checks blocked non-GET/HEAD requests, including Next.js development stack-frame lookup, and reused an existing authorized local session without login/refresh/session writes.
- `git diff --check`: passed for tracked changes.

Reproduction from `api`:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest-dashboard-v2.json --runInBand --runTestsByPath src/modules/requests/linked-request-applications.service.spec.ts
node scripts/verify-linked-request-applications.cjs
```

The live script requires local development servers and an existing active authorized local dashboard session. Evidence is under `docs/artifacts/linked-request-applications/` in the active frontend: `verification.json`, desktop parent/application screenshots, and English/Arabic mobile screenshots.

## Verification limits and deliberately unsupported behavior

- The existing local dataset has at most two submitted applications for a sampled parent. Multiple real pages were therefore verified with API pageSize=1; the UI's six-card pagination links were covered by regression tests and preserve parent, filters and anchor.
- No real review/assignment/forwarding decision was submitted during verification, preserving existing records. Those controls reuse existing protected endpoints; no transitions or permissions were relaxed.
- Supporting document sections and authorized links were verified; file contents of existing uploaded documents were not downloaded or modified.
- Repository-wide backend lint/default typecheck retain the previously documented NodeNext/CommonJS configuration mismatch. The backend build configuration and changed-source lint were used successfully; that unrelated configuration was not changed here.

## Files changed in this task

Backend, relative to repository root:

- `api/src/modules/requests/dto/linked-applications.dto.ts` (new).
- `api/src/modules/requests/linked-request-applications.service.ts` (new).
- `api/src/modules/requests/staff-linked-applications.controller.ts` (new).
- `api/src/modules/requests/linked-request-applications.service.spec.ts` (new).
- `api/src/modules/requests/requests.module.ts`.
- `api/jest-dashboard-v2.json`.
- `api/eslint.config.mjs`.
- `api/scripts/verify-linked-request-applications.cjs` (new).

Frontend, relative to `FarmExit_dashboard-v2_redesigned/dashboard-v2/`:

- `src/app/[locale]/admin/(console)/requests/[id]/page.tsx`.
- `src/app/[locale]/admin/layout.tsx`.
- `src/features/admin/requests/RequestWorkspace.tsx` (new).
- `src/features/admin/requests/LinkedApplicationsPanel.tsx` (new).
- `src/features/admin/requests/linked-applications.ts` (new).
- `src/features/admin/requests/linked-applications.test.ts` (new).
- `src/features/admin/requests/PartnershipApplicationReview.tsx` (new).
- `src/features/admin/requests/RequestActions.tsx`.
- `src/features/admin/requests/RequestDocumentsPanel.tsx`.
- `src/features/admin/actions/workflows.ts`.
- `src/styles/request-workspace.css` (new).
- `messages/en/admin.json`.
- `messages/ar/admin.json`.
- `package.json`.
- `docs/LINKED_REQUEST_APPLICATIONS_IMPLEMENTATION_REPORT.md` (new).
- Generated verification JSON and PNG evidence under `docs/artifacts/linked-request-applications/`.
