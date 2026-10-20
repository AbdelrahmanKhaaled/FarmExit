# Stage 1D — Phase 7 stability and session consistency

20 October 2026. Scope: existing Management and Professional flows, shared public session presentation, public-navigation stability, and publication readiness. No migration, seed, destructive database action, Dashboard redesign, commit, push, or Phase 8 work.

## Findings and fixes

| Problem | Actual evidence | Correction |
| --- | --- | --- |
| Submission reported as failure | NestJS submits requests with `underFarmExitReview`; Management and Professional UI confirmation expected `underReview`. Fixtures incorrectly returned the latter and masked the mismatch. | Corrected both submission confirmations, active verification-request reuse and list filters to the canonical API status. Existing request statuses were not renamed or rewritten. |
| Intermittent authenticated failure | Two simultaneous BFF session reads with a refresh cookie and no access cookie returned **401 / 200** before correction. | Coalesce the in-flight rotation for the same refresh secret within the website server. Final real requests return **200 / 200**. No completed token pairs are cached; backend rotation, duplicate grace, replay protection and cookie policies are unchanged. |
| Public navbar shows guest while signed in | Before screenshots show Sign in on `/en/management` while the same context's `/api/auth/me` returns **200**. Public callers supplied no navbar user. | Shared navbar reads its session through the BFF when no server user is supplied. It renders a neutral account space while checking, updates on focus/visibility, and retains server-provided portal users without an extra read. No polling, token exposure or forced logout. API unavailability is distinguished from an actual 401. |
| Public request storm | Before: `/management` generated **1,554 EN / 2,129 AR RSC requests in six seconds**, with one document navigation. Traces identify speculative partial-prefetch requests, especially `/farms`. An anonymous probe reproduced it too. | Disabled speculative prefetch only on the shared farm-navigation/footer links. Ordinary client navigation remains. A route-level setting was tried and did not stop metadata retries; it is absent from the final code. Global Next/React safeguards and partial-prefetch configuration remain enabled. |
| Expected outcomes cannot restore | Existing update service writes `outcomes`, `challenges` and `additionalInformation`, but the response DTO/projection omitted them. The UI disabled the write-only sections. | Added the private read projection and matching optional create fields; enabled outcomes/additional information using existing columns and update contract. |
| First-time Professional flow fails | Real capability creation returned **404: Professional profile not found**. The UI attempted capability creation before creating the required profile; fixtures allowed this invalid order. | Upsert the actual profile through the existing PUT endpoint before creating its capability. Added a prerequisite-aware fixture regression. |

**Request 699:** read-only inspection confirmed `farmManagement`, private visibility and `underFarmExitReview`. It is already submitted, so the API correctly prevents further edits until changes are requested. Its row/detail snapshot was checked unchanged during successful acceptance. Automated mutations targeted newly created isolated requests only. The original Goals PATCH failure on 699 was not recreated by editing it: an ordinary isolated Goals PATCH already returned 200 before changes. The confirmed defects above explain false submission failures and a reproducible intermittent session failure; no claim is made that every historical save failure has the same cause.

## HTTP and MySQL verification

[Acceptance events](../artifacts/stage1d/acceptance/events.json), [run identity and outcome](../artifacts/stage1d/acceptance.log), [request MySQL readback](../artifacts/stage1d/acceptance-mysql.json), [professional MySQL readback](../artifacts/stage1d/final-professional-mysql.json).

Final acceptance used dedicated farm **517**, Management request **715** and Professional verification request **716**. Both requests remained private and under FarmExit review.

- Valid management **PATCH 200**, followed by reload/resume, restored goals, selected challenges, outcomes and additional information. Editing and saving the outcome restored the revised value.
- Scalar `goals` returned **400** with validation messages; unsupported `visibility: public` was rejected. UI regressions verify 400/401/409 preserve entered goals/outcomes and never claim success.
- Anonymous private BFF read returned **401**; another user's private API read returned **404**. A submitted request PATCH returned **409**.
- Management **POST submit 201** returned canonical `underFarmExitReview`, rendered the success screen, appeared in My Management Requests and remained **private** in MySQL.
- First-time professional profile, capability, governorate, expertise and service areas saved and restored from MySQL. A real browser-generated PDF uploaded privately with **201**; verification submission returned **201 / underFarmExitReview** and rendered confirmed success. Capability verification remains API-controlled; no approval/badge was fabricated.
- Explicit test logout was followed by the genuine guest navbar. Cross-tab checks used one browser context and origin; cookies stayed HttpOnly and private data stayed user-scoped.
- Concurrent BFF and protected-page SSR refresh also passed: the BFF returned 200 and the portal rendered authenticated. Home and Partnerships additionally showed the signed-in shared header; logout updated the already-open public tab and protected navigation returned to sign-in.

The in-flight refresh coordination is local to a website server instance. Distributed multi-instance coordination was not implemented or tested; backend replay protection remains authoritative.

## Public navigation results

[Before traces](../artifacts/stage1d/before/events.json), [final production traces](../artifacts/stage1d/final/events.json), [original rotation race](../artifacts/stage1d/refresh-race-events.json).

Across EN/AR at 1440/1024/390px, the corrected public routes had one document navigation, bounded initial prefetch work, and **zero additional document/RSC/API requests during the follow-up observation window**. `/management` settled after 18–21 RSC requests; `/farms` after 13. Scroll positions stayed unchanged. No `router.refresh()` loop was found in these routes; this production reproduction excludes development HMR as its cause.

A separate anonymous network/console probe recorded expected authentication 401s and **404s for existing `/en/about` and `/en/careers` links**, with no captured JavaScript page exception: [evidence](../artifacts/stage1d/public-console.json). Those unrelated destinations were not implemented in this stage. The final signed-in flow's network evidence is separate. No development error indicator or logging safeguard was hidden.

## Figma field parity audit

Used existing local `05 · Management Request.pdf` (42 pages), `06 · Professional Experience.pdf` (46 pages), their rendered references, inventory and style guidelines. No Figma MCP calls. Existing columns, cards, tokens, RTL direction and action placement were retained; no global CSS/token edits.

| Screen / field group | Result |
| --- | --- |
| Management step 1: farm selection/context | Existing owner-scoped selection and locked farm association retained. No private imagery or fabricated farm data. |
| Step 2: professional need | Existing Farm Manager / Agricultural Engineer / Both radio cards retained. |
| Step 2: management type | Corrected checkbox behavior to the Figma single-choice radio control. Existing stored arrays survive untouched until the user explicitly selects a replacement. |
| Step 2: expected term | Native select for the visible one-year reference value, with an honest custom-term input preserving existing strings. Unexported dropdown options were not invented. |
| Step 3: current situation | Existing supported text and validation retained. Current-team dropdown remains a contract gap below. |
| Step 3: challenges/goals | Added the four visible challenge checkboxes and three approved goal choices. Custom/legacy goals remain editable and coexist with selected goals; multiline typing and save serialization are tested. |
| Step 3: expected outcomes | Optional disclosure now edits, saves, reloads and reviews the supported private field. |
| Steps 4–5: responsibilities/resources | Existing honest unavailable states and real read-only facilities retained. No simulated saving of unsupported fields. |
| Step 6: additional information/documents | Enabled supported additional text. Existing real private upload, replacement/history and error handling retained. |
| Step 7: review/submission | Includes restored private fields, localized reference goal/challenge labels, real confirmation and canonical API status. Custom text and canonical persisted values are preserved. No automatic publication or appointment. |
| Professional type/name/profile | Existing type radio cards and authenticated read-only name retained. First-time API ordering corrected. Existing headline, bio, years and experience summary retained. |
| Professional base governorate | Changed free text to a select using the existing project options plus custom fallback; preserves unrecognized legacy values. |
| Expertise | Existing farm-activity, management-type and technical-expertise multi-select cards and crop text retained. |
| Service areas | Changed comma-only entry to an expandable multi-select with existing and legacy values plus explicit custom additions; actual string-array API saving/reload verified. |
| Verification | Existing private documents, review, tracking and corrections retained; canonical status confirmation and active-request reuse corrected. |

Remaining field gaps: current-team, responsibilities, expected experience, on-site presence/team leadership and structured management resources have existing database columns but lack complete typed owner create/update/read contracts. Professional experience-level and working-preference UI likewise lack an approved complete API mapping. These were not packed into arbitrary JSON or simulated as saved. A required-document category catalog is still unapproved. The existing larger custom-goal text area and unsupported sections mean full pixel/feature parity is not claimed.

## Management Marketplace readiness

**Public discovery remains blocked.** `StaffFarmManagementReviewsService` authorizes review decisions and changes status to approved/changesRequested/rejected; it does not set public visibility or a publication timestamp. Creation/submission remain private. The generic request service blocks specialized management workflow bypasses. Having `published`/`public` in shared vocabulary is not an approved management publication workflow.

No private opportunities, documents, exact pins, owner contacts, staff notes or invented listings were exposed. Request and tracking CTAs now point to the actual Management wizard/list and use existing authentication guards.

Needed before public discovery:

1. Approve eligibility and consent rules, publish/unpublish/archive transitions, and the explicitly authorized staff action and audit requirements.
2. Define the safe public field allowlist and approximate-location policy, including what corrections/withdrawal do to publication.
3. Add the authorized publication contract with lifecycle/visibility checks and approved timestamp behavior; review approval alone must not publish.
4. Add paginated public list/filter and stable detail/slug projections guarded by that publication gate. Define supported application/communication actions through FarmExit.
5. Confirm exact marketplace references. Inventory records page `1:10` and historical frames `116:16067`, `116:16099`, `116:16131`, preview `118:1593`; those remain unverified. No dedicated approved Management Marketplace PDF was found under local baselines.

## Files changed for Stage 1D

- API: `api/src/modules/farm-management-requests/dto/farm-management-request.dto.ts`, `farm-management-requests.service.ts`, `farm-management-requests.service.spec.ts`.
- Sessions/header: `web/src/lib/auth/refresh-tokens.ts`, `web/src/app/api/auth/me/route.ts`, `web/src/components/layout/{Navbar,PublicNavbar,PublicShell,MobileMenu,Footer}.tsx`, `web/src/components/layout/use-navbar-session.ts`.
- Routes: `web/src/app/[locale]/{management,farms}/page.tsx` (header integration/Management CTAs only).
- Phase 7: `web/src/features/my-management/{ManagementWizard,ManagementRequestDetail}.tsx`, `web/src/features/my-professional/{ProfessionalHub,VerificationRequestDetail}.tsx`, `web/src/features/phase7/{RequestList,GovernorateFields}.tsx`, `reference-options.ts`.
- EN/AR workspace messages; `web/tests/visual/stage1d.{config,spec}.ts`, existing Phase 7 fixtures/workflow specification and fixture page; this report.

Pre-existing Stage 1B/1C and user changes were preserved. No Add Farm implementation, Farm Details content/layout, Dashboard, schema, migrations or seeds were edited for Stage 1D. Shared navbar session behavior now also applies to its existing public callers.

## Screenshots and checks

[72 before/after production pairs](../artifacts/stage1d/comparison.html): seven Management steps, three Professional steps, Management public page and Farm Marketplace, EN/AR at all three widths. Real confirmed states are also under [acceptance](../artifacts/stage1d/acceptance/real-management-submitted.png). The Phase 7 state suite includes documents, correction, tracking and success screens; production CSS checks preserve the 296/656/264px desktop columns, in-flow actions and no horizontal overflow.

| Check | Result |
| --- | --- |
| Focused API contract/geolocation/document authorization | 39 passed |
| Final focused Phase 7/session UI regressions | 14 passed; final visible Arabic review regression also passed separately |
| Phase 7 EN/AR state matrix and production CSS | 12 passed |
| Add Farm map/document/submission regressions | 12 passed; environment-gated real-MySQL case skipped in this fixture job and covered separately by real acceptance |
| OTP/authentication regressions | 25 passed, 5 intentional viewport skips |
| Real Management/Professional browser → API → MySQL | Passed; see acceptance evidence |
| Real Add Farm map/road/upload/replacement/submission | Passed; [log](../artifacts/stage1d/add-farm-real.log) |
| Web build, explicit typecheck and full lint | Passed: [build](../artifacts/stage1d/web-build.log), [typecheck](../artifacts/stage1d/web-typecheck.log), [lint](../artifacts/stage1d/web-lint.log) |
| API build and changed-file lint | Passed |
| Full API typecheck | 27 existing errors in unrelated bootstrap/auth/fake-Prisma tests; no changed management-file errors |

The full API lint baseline from Stage 1C remains separately documented; Stage 1D ran changed-file API lint rather than repairing unrelated files. Database tests used new dedicated records and isolated private local storage; no production storage deployment or distributed session coordination was verified. Test records are retained and temporary sessions revoked. API port 4001 only; port 4000 was untouched. No subsequent phase has started.
