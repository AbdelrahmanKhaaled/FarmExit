# Dashboard V2 — Batch 1 implementation and verification

Date: 2026-10-26, Africa/Cairo. No commit or push.

## Target and evidence

**CODE VERIFIED:** Port 3003 was verified before editing through listener PID 25080 and its Windows process command line. It serves:

`F:\Abdo Khaled projects\Qeema_Node_Projects\FarmExit\FarmExit_dashboard-v2_redesigned\dashboard-v2`

All dashboard implementation changes are in that physical project. The root `dashboard-v2`, Dashboard V1 and Website frontend were not edited. Related backend changes are limited to Farm management, Farm registry publication metadata and the confirmed specialized listing authorization defect. Existing working-tree changes, including the earlier publication fix, were retained. No migration, reset, live seed, live publication or customer-record mutation was performed. Port 4000 was not accessed or managed.

All 11 supplied images were inspected inline, in order. None was unavailable.

| Image | Requirement mapping |
| --- | --- |
| 1, Overview | Issue 1: sidebar whitespace and tallest workload bar/header overlap |
| 2, current Analytics | Issue 2: repetitive charts and weak composition |
| 3, ORÉ CARE Analytics | Issue 2: preferred analytical hierarchy, filter bar, KPI treatment and varied widgets |
| 4, Farms | Issue 3: filters, CRUD and row actions |
| 5, Farm 662 | Issue 4: Farm detail composition |
| 6, create evaluation | Issue 5: internal evaluation form |
| 7, Listings | Issue 6: remove Request column, link from Farm, add creation date |
| 8, Listing 760 | Issue 7: specialized detail and Assign/Approve denial |
| 9, Request 756 | Issue 8 and Issue 9: detail structure, recipient input and communications link |
| 10, filtered Communications | Issue 9: honest zero-case behavior |
| 11, publication queue | Issue 10: publication versus Farm registry semantics |

Issue 11's shared visual consistency requirements apply across these views rather than to one separate image.

**LIVE BROWSER VERIFIED:** The text/web reader could not access Paces, but Chromium could. The supplied `#charts` URL opens the default dashboard. Its chart-menu links were inspected, then the dedicated [area](https://themes.coderthemes.com/paces/bootstrap/charts-apex-area.html), [column](https://themes.coderthemes.com/paces/bootstrap/charts-apex-column.html) and [pie](https://themes.coderthemes.com/paces/bootstrap/charts-apex-pie.html) pages were opened. After dismissing the demo settings overlay, area and pie tooltips were exercised. Reference captures: `paces-charts-reference.png`, `paces-area-reference.png`, `paces-column-reference.png`, `paces-pie-reference.png`. ORÉ CARE's branding and data were not copied.

## Implemented changes by issue

### 1. Sidebar and workload chart

**TESTED:** The shell now has a fixed `100dvh` height chain and hidden outer overflow. Its main content scrolls independently; the sidebar has a separately scrolling navigation region with a nonshrinking brand and footer. Logical positioning and the existing off-canvas behavior remain intact.

The workload plot reserves space beneath its header and above its columns. Value labels have their own region; the maximum bar is bounded by the plot. Small screens can scroll the wide category plot without making the page overflow. Neither totals nor categories were hidden.

QA verified the maximum workload bar and all value labels clear the header, sidebar collapse/expand works, navigation scrolling does not move main content, and mobile drawers open and dismiss in both LTR and RTL.

### 2. Analytics redesign

**CODE VERIFIED / TESTED:** Replaced the repeated visual composition with:

- Five compact, icon-backed KPI cards using real API overview values.
- Registration and request area trends with linear paths that preserve actual bucket values.
- Rounded Farm creation columns.
- Stacked Sale/Rent publication columns using the existing `listingsPublishedSale` and `listingsPublishedRent` series, with a legend.
- Communication case area trend.
- Ranked request-type bars and semantically colored request-status distribution.
- Publication donut with total and external legend.
- Proposal-kind breakdown with an optional secondary trend and compact empty state.
- Operational workload ranking explicitly labeled as live/all-time, and period-based partnership comparison.

Extended the existing native SVG approach without adding or mixing chart libraries. Grid lines, localized date ticks, keyboard-focusable buckets and pointer/focus tooltips are shared. No trends, comparisons or totals were fabricated in the application.

The segmented date filters retain 7d/30d/90d/12m/all API presets. Custom dates are revealed on demand, validated and represented in URL/API query state. The server presents a useful error state for invalid or failed responses. UTC bucketing remains the backend's responsibility.

Visual QA caught an SSR hydration mismatch caused by SVG `<title>` children on bucket rectangles. Those children were removed in favor of the existing accessible labels and custom tooltip; the final 72-view run captured no hydration or missing-message errors.

### 3. Farm filters and Super Admin CRUD

**CODE VERIFIED / TESTED:** Governorate is now a searchable datalist constrained to actual registry values for filtering. Farm status is a select using actual stored values. Both sources come from `GET /staff/admin/farm-filter-options`; no invented status taxonomy was introduced. Search, exact governorate matching, pagination query state, Apply and Clear are preserved.

Super Admin receives Add New Farm and icon-backed View/Edit/Archive actions. New routes exist at `/admin/farms/new` and `/admin/farms/[id]/edit`.

New staff management API contract:

| Operation | Endpoint | Authorization/behavior |
| --- | --- | --- |
| Create | `POST /staff/admin/farms` | Dashboard audience, active Super Admin; explicit existing active `ownerUserId` |
| Edit prefill | `GET /staff/admin/farms/:id/edit` | Same authorization; explicit editable response, no exact coordinates |
| Update | `PATCH /staff/admin/farms/:id` | Same authorization; existing farm field allowlist and validation; preserves ownership |
| Archive | `POST /staff/admin/farms/:id/archive` | Same authorization, `confirmed: true`; conservative soft archive only |

Service-layer authorization supplements controller guards. Create records the staff actor separately from the declared owner and creates the owner's relationship transactionally. These relationships do not certify legal ownership. Create/update/archive are audited.

Archive sets existing `deletedAt` in a serializable transaction; it performs no cascades. It refuses any linked requests, evaluations, agricultural facilities or site visits, including historical ones. Ownership and audit records remain intact. Confirmation is required by both dialog and validated API body.

Reusable wizard mapping:

1. Basic information: `name`, `farmType`, `description`.
2. Location/ownership: `governorate`, `areaName`, explicit `ownerUserId` on create; ownership preserved on edit.
3. Agriculture: `areaFeddan`, `mainActivity`, `waterSource`, `irrigationMethod`, `energySource`, `soilType`.
4. Review/confirmation: summarized values, explicit confirmation and final save.

Website wizard structure, field vocabularies and backend DTOs were inspected. The dashboard reuses backend validators and allowlists without copying Website styling. Required fields, area bounds/precision, pending states, edit prepopulation, unload/internal-link unsaved-change protection and accessible Previous/Next controls are implemented. There is no Farm draft endpoint; the UI states that saving happens at final confirmation.

**BLOCKED — existing authorization contract:** Staff currently cannot edit facilities/specifications or upload private Farm media through the owner/manager endpoints. Staff cannot edit exact private pins. The wizard does not impersonate the owner or widen these permissions. Those unsupported attachment/location operations are explained rather than simulated. Existing authorized owner workflows remain unchanged.

### 4. Single Farm detail

**TESTED:** Rebuilt around summary stat cards, basic information, agricultural details, ownership, recent requests and a contextual panel for evaluations, publication and private location. Authorized basic fields are fetched through the existing Farm read contract. Publication metadata is queried independently of the 15 recent-request limit, so an older published listing is not falsely reported absent.

Edit and archive actions are role aware. Evaluation actions respect `evaluations.manage`; exact location remains behind `farms.private-location.read` and is read only. Facility counts exclude deleted facilities. Private media is not exposed through public URLs or guessed endpoints.

### 5. Create evaluation

**TESTED:** Rebuilt the narrow unstructured form as Farm context, scoring/methodology, scope/internal evidence, and confirmation sections. It uses consistent controls, paired score and methodology fields, larger text areas and clear submission placement.

Validation follows the backend's score range/precision: nonnegative value, positive maximum, up to two decimals, maximum 99999.99, value no greater than maximum. Optional listing IDs are numeric. Existing confirmation and draft/in-review creation behavior remain; creating an evaluation never silently publishes it. No criteria or score was invented.

### 6. Listings table

**CODE VERIFIED / TESTED:** Removed the separate Request column. Farm name now links to `/admin/listings/:id`, with the request number as secondary text. Added localized `createdAt`; neither submittedAt nor updatedAt is substituted. Pagination, type and status remain. Publication-queue navigation is shown only to admin scope.

The isolated UI test verifies the specialized link target and exact Created at column. Actual request 760's creation timestamp was also inspected read only: `2026-10-21T10:30:18.822Z`.

### 7. Listing detail and specialized 403

**CODE VERIFIED:** Traced Server Actions to `PUT /staff/listing-requests/:id/assignments` and `POST /staff/listing-requests/:id/decision`, using the same dashboard session/Bearer mechanism as the working generic request actions. StaffGuard already accepts Super Admin as admin scope. The specialized service's transaction checks instead required literal `admin` membership in both `writeOnce` and `decideOnce`.

Those two checks now accept active admin or Super Admin membership. Reviewer assignment restrictions, `requests.review`, assigned-reviewer checks, account activity and transactional lifecycle checks remain. Authorized assignment attempts outside review now return an explicit conflict instead of an ambiguous missing-resource result. Drafts/unavailable resources remain concealed.

The page now has summary metrics, lifecycle progress, structured overview, assignments/reviews, authorized documents and a contextual action panel. Assignment appears only for admin scope during review, review actions require review permission, and publication is separate and admin-only after approval. Successful assignments/decisions refresh the view. Switching assignment slots clears stale staff selections. Approval/publication differences are explained.

**TESTED:** In-memory real-controller/service tests cover Super Admin and Admin assigning both roles, persistence, assigned Reviewer decisions, approval staying private, unauthorized staff being blocked and transaction rollback. No real customer request was changed.

### 8. Unified request detail and recipient input

**CODE VERIFIED / TESTED:** Added grouped overview/assignment/review/document/forwarding cards, readable request types and a real status-history timeline. Generic review stays unavailable for specialized types; existing generic assignment uses its original contract and is shown only to authorized admin scope.

The recipient field was already initialized with an empty string: the screenshot's `FL...` value was not generated by the inspected data mapping. Added disabled autofill, numeric identity guidance and positive numeric ID validation in the form and Server Action. Forwarding availability now matches backend non-draft/nonfinal eligibility and requires a Farm. Backend existence, active-owner relationship and mediation checks remain authoritative. Nothing is forwarded automatically, and no unrelated users are exposed for selection.

### 9. Related communications

**CODE VERIFIED:** The request page now queries the existing case API with the real numeric `requestId` and the current staff token. When authorized cases exist it shows their count and a filtered View communications action. Zero cases produce an explicit explanation rather than a misleading link. A missing/denied response is not treated as zero cases. Communications pagination retains `requestId` and status filters.

**CODE VERIFIED — live database, read only:** Request **756 has zero communication cases**. Both request 756 and listing request 760 are still `underFarmExitReview`, private, and unpublished. Opening a communication case is an existing external-participant workflow requiring an assigned case agent; no staff creation action or direct owner/buyer chat was invented.

### 10. Published listing visibility

**LIVE API VERIFIED / CODE VERIFIED:** The reported records are not missing publications:

| Published request | Farm | Default Farm registry page, 10 rows/page |
| --- | --- | --- |
| 507 | 469 | 25 |
| 512 | 474 | 25 |
| 517 | 479 | 26 |

All three are public/published in the database and present in the live public marketplace API. Their Farms are not deleted. The apparent absence is explained by the registry's existing **Farm creation date** ordering: publication does not create or move a Farm to page 1.

Added a truthful listing-publication column to the registry and publication context on Farm detail/queue, while keeping Farm status separate. Publishing invalidates the queue, specialized listing, Farm list/detail, related request, overview and Analytics paths. No duplicate Farm is created.

Evidence: [live read-only findings](batch-one-live-readonly.json).

**TESTED:** An isolated API test publishes an approved fixture through the real publication endpoint, verifies persisted public state, verifies marketplace and registry results, confirms one Farm remains, and checks archive is blocked afterward. **NOT TESTED:** a new live customer or live test-account publication; no real publication was performed during this task.

### 11. Shared consistency

**TESTED:** Added shared operational cards, stat summaries, grouped forms, wizard steps, confirmations, progress/timeline, icon actions and analytical widget styling. Green/gold identity, existing brand assets, sidebar/topbar appearance and working deep links remain. Request-specific data stays uncached and request scoped. The existing REST and Socket.IO communication implementation was not replaced.

## Verification results

| Evidence label | Check | Result |
| --- | --- | --- |
| TESTED | Dashboard `npm run typecheck` | Passed |
| TESTED | Dashboard `npm run lint` | Passed, including direction, messages, sidebar motion and read-only-session checks |
| TESTED | Dashboard `npm run test:unit` | 28 passed |
| TESTED | Dashboard `npm run test:translations` | 2 passed; locale parity also covers new batch messages |
| TESTED | Dashboard `npm run build` | Passed, Next.js 16.4.1, 114 pages, Cache Components and Partial Prefetching enabled |
| TESTED | API build-config TypeScript check | Passed |
| TESTED | API authorization/publication unit tests | 3 suites, 26 passed |
| TESTED | API Farm CRUD, listing reviews, staff inbox and publication E2E tests | 4 suites, 13 passed, isolated in-memory database |
| LIVE BROWSER VERIFIED | Actual port 3003, 12 route families × 3 widths × EN/AR | 71 passed initially; one cold new-route compilation timeout passed on an isolated rerun |
| TESTED | Production-output visual QA with isolated API fixtures | 72 views passed, no captured page errors/missing messages/hydration errors or page-level horizontal overflow |
| TESTED | Focused UI interactions | Sidebar collapse/expand, independent navigation scroll, LTR/RTL drawers, workload bounds, keyboard tooltip, custom date/API query state, invalid dates, wizard required steps/confirmation, edit prefill, numeric forwarding, and Listing links/columns passed |
| LIVE API VERIFIED | Public marketplace on existing port 4001 | HTTP 200, published requests 507/512/517 present |

Actual port-3003 browser tests establish authentication redirects, route existence and RTL behavior without credentials. They do not establish authenticated CRUD success. Authenticated screenshots and UI interactions use the same production code on isolated port 3303 with an in-memory fixture API on 4403. Their data is visibly marked `[QA FIXTURE]`. The live API origin/environment was not altered. Visual QA submits **no write requests**.

Backend test stderr contains deliberate `review failed`/`audit failed` exceptions from rollback tests; the suites pass. The repository's default broad API NodeNext tooling issue from the previous report was not rewritten; the existing working build configuration and E2E harness were used.

### Reproduction commands

Dashboard project:

```powershell
npm run typecheck
npm run lint
npm run test:unit
npm run test:translations
npm run build
$env:PORT='3003'
npx playwright test tests/e2e/batch-one-routes.spec.ts --workers=1
node scripts/batch-one-visual-qa.mjs
```

API project, with no real database writes:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit
npm run test:e2e -- --runInBand --runTestsByPath test/admin-farm-management.e2e-spec.ts test/listing-reviews.e2e-spec.ts test/staff-listing-reviews.e2e-spec.ts test/listing-publication.e2e-spec.ts
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest-publication.json --runInBand --runTestsByPath src/modules/listing-requests/listing-publication-authorization.spec.ts src/modules/authorization/staff-permissions.spec.ts src/modules/authorization/staff.guard.spec.ts
```

### Screenshots and logs

All 72 view captures, additional Analytics bottom captures and LTR/RTL open-drawer captures are in [batch-one-qa](batch-one-qa/). Examples:

- [Analytics desktop EN](batch-one-qa/en-1440-analytics.png), [Analytics mobile EN](batch-one-qa/en-390-analytics.png).
- [Farm details EN](batch-one-qa/en-1440-farms-662.png), [new Farm mobile RTL](batch-one-qa/ar-390-farms-new.png).
- [Evaluation EN](batch-one-qa/en-1440-evaluations-new.png), [Listing detail EN](batch-one-qa/en-1440-listings-760.png).
- [Request detail EN](batch-one-qa/en-1440-requests-756.png), [Communications EN](batch-one-qa/en-1440-communications.png).

Machine-readable evidence: `batch-one-qa/results.json`, `batch-one-qa/interaction-results.json`. Logs: `batch-one-build.log`, `batch-one-visual-qa.log`, `batch-one-interactions.log`, `batch-one-live-browser.log`, `batch-one-live-browser-retry.log`.

## Exact implementation files

Paths below are relative to the physical dashboard unless prefixed with `api/` (workspace-relative).

```text
messages/en/batch.json
messages/ar/batch.json
src/i18n/messages.ts
src/styles/components.css
src/styles/batch-one.css
src/app/[locale]/admin/layout.tsx
src/app/[locale]/admin/(console)/analytics/page.tsx
src/app/[locale]/admin/(console)/farms/page.tsx
src/app/[locale]/admin/(console)/farms/[id]/page.tsx
src/app/[locale]/admin/(console)/farms/new/page.tsx
src/app/[locale]/admin/(console)/farms/[id]/edit/page.tsx
src/app/[locale]/admin/(console)/evaluations/new/page.tsx
src/app/[locale]/admin/(console)/listings/page.tsx
src/app/[locale]/admin/(console)/listings/[id]/page.tsx
src/app/[locale]/admin/(console)/requests/[id]/page.tsx
src/app/[locale]/admin/(console)/communications/page.tsx
src/app/[locale]/admin/(console)/listing-pipeline/page.tsx
src/features/admin/AdminShell.tsx
src/features/admin/analytics/AnalyticsDateFilters.tsx
src/features/admin/analytics/AnalyticsWorkspace.tsx
src/features/admin/analytics/TimeSeriesChart.tsx
src/features/admin/farms/FarmWizard.tsx
src/features/admin/farms/FarmFilters.tsx
src/features/admin/farms/FarmRowActions.tsx
src/features/admin/evaluations/CreateEvaluationForm.tsx
src/features/admin/listings/ListingActions.tsx
src/features/admin/requests/RequestActions.tsx
src/features/admin/requests/RequestForwardingPanel.tsx
src/features/admin/workspace/ActionIcon.tsx
src/features/admin/workspace/StaffAssignmentForm.tsx
src/features/admin/actions/farms.ts
src/features/admin/actions/listings.ts
src/features/admin/actions/platform.ts
src/lib/api/types/admin-ops.ts
src/lib/api/types/staff.ts
scripts/batch-one-visual-qa.mjs
tests/e2e/batch-one-routes.spec.ts
api/src/modules/admin-operations/admin-dashboard.controller.ts
api/src/modules/admin-operations/admin-farms.service.ts
api/src/modules/admin-operations/dto/admin-farms.dto.ts
api/src/modules/farms/admin-farm-management.controller.ts
api/src/modules/farms/dto/admin-farm.dto.ts
api/src/modules/farms/farms.module.ts
api/src/modules/farms/farms.service.ts
api/src/modules/listing-requests/staff-listing-reviews.service.ts
api/test/admin-farm-management.e2e-spec.ts
api/test/listing-reviews.e2e-spec.ts
```

The earlier publication service correction and its focused test/configuration were preserved, not replaced. Generated build artifacts and the evidence files above are additional verification outputs.

## Remaining limits

**BLOCKED:** No existing test Super Admin/Reviewer credentials were provided, so successful live staff login, a new live staff write lifecycle and authenticated navigation against the actual 4001 API remain **NOT TESTED**. Authorization/workflow success is supported by real-controller/service tests with isolated data, not by screenshots alone.

**BLOCKED:** Staff facility/specification editing, private-media upload and exact-pin editing have no authorized staff contract in the existing owner APIs. They were not enabled by impersonation or broad permission changes. Farm CRUD and its four-step wizard support the explicitly authorized fields described above.

Existing development-only instant-validation diagnostics during unauthenticated login redirects and existing logo aspect-ratio warnings were not suppressed. The final production fixture QA captured no application page errors. No claim is made that fixture screenshots prove a live staff session or publication.
