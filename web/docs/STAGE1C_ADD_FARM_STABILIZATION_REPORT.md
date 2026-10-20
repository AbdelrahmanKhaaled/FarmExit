# Stage 1C — Add Farm stabilization

Completed 20 October 2026. Supported Add Farm flows were stabilized and tested against the real API on port 4001, real MySQL, and isolated private local file storage. Full Figma feature parity is not claimed: the missing contracts below remain explicit. No migration, seed, record deletion, commit, push, or Phase 7 implementation was performed.

## Upload root cause and correction

The original authenticated production-browser reproduction returned **201** from document upload and saved the PDF, followed by **404** from the metadata refresh: `Cannot GET /api/v1/requests/682/documents`. The service already implemented metadata listing, but its controller route was missing. The frontend treated this failed refresh as a failed upload and incorrectly invited another upload.

- Added the authorized GET metadata route, retaining existing request ownership and explicitly authorized staff permissions. Metadata and download/upload responses use private/no-store caching.
- A validated POST response now confirms upload immediately. A subsequent metadata refresh failure says the upload was confirmed and asks the user not to upload again. Malformed success responses are not accepted.
- Removed the visible internal slot ID field. First uploads generate a slot internally; replacement retains that slot. Latest documents and earlier versions remain accessible through authorized private downloads.
- Added genuine transfer progress, timeout handling, distinct authentication/permission/file/status errors, optional additional-document disclosure, and retry behavior without duplicate confirmation states.
- A separate real missing-file probe exposed `file.buffer` access before validation, causing 500. Passing the optional file through the existing validator now returns 400.

The fault was the missing read route and confirmation handling, not failed storage persistence. Evidence: [original network events](../artifacts/stage1c/before/events.json), [original error screenshot](../artifacts/stage1c/before/upload-result.png), [final real checks](../artifacts/stage1c/final/checks.json).

## Next.js issues

The exact reported “10 issues” count was not reproduced in a fresh browser. The initial development run exposed an uncached authenticated fetch outside Suspense, a fractional logo width warning, and the document metadata 404. Iteration also exposed the draft-resume route boundary and prerender timing insights.

Authenticated portal/new/resume data now execute inside explicit Suspense boundaries with `connection()` before live session access. Private data was not cached, and neither the development indicator nor lint rules were suppressed. The logo HTML width is rounded to an integer to avoid the reproduced intrinsic-size warning.

The final development run through all seven steps recorded **zero console warnings/errors and zero page errors**: [events](../artifacts/stage1c/after-dev/events.json). This does not assert that every unrelated route has zero issues. An existing footer logo warning seen in portal fixtures is outside this wizard's final development result. API type/lint failures below are separate repository quality-gate findings.

## Reference and field audit

Inspected the local Add Farm and Arabic PDFs and their existing page renders, including form, expanded, validation, upload, review, and rental states. No Figma MCP calls were used. Existing tokens, layout, icons, authentication, and actions were retained; global CSS and shared design tokens were not changed.

| Step | Controls and verified behavior | Limits |
| --- | --- | --- |
| 1. Basics | Existing name/main-activity fields, four farm-type radio cards, area and irrigation selector retained. Invalid/missing farm type and invalid area show field-level errors. | No invented farm types or irrigation options. |
| 2. Location & Land | Governorate select uses the existing project options with an Other/custom fallback that preserves existing values. Private Leaflet pin, road name/distance, optional collapsible land details save and reload. Save/Continue wait for private-location loading. | Existing governorate options are not presented as an exhaustive national catalog. Soil remains the supported text contract; unapproved options were not invented. |
| 3. Agriculture & Facilities | Water selector required to continue; six independent amenity cards now persist. Optional production/crop and three-highlight disclosures retained. Existing specialized facility creation/edit actions remain under an additional disclosure. | Draft saving remains possible without water. No fabricated licensing or certification claims. |
| 4. Listing details | Sale/rent radio cards, existing prices, two availability radios and the Figma conditional later-date input. Date restores on reload and displays in localized review. Existing description and price actions retained. | Date uses the existing availability string (`From YYYY-MM-DD`), not a new structured date contract. Unknown legacy availability strings remain intact. |
| 5. Photos | Real private file chooser and working file drop, upload progress and existing accessibility/licensing controls. Three columns at tablet/desktop, two on mobile. | Cover selection, reordering, replacement and deletion have no current mutation contracts; no simulated actions added. |
| 6. Documents | Real PDF/JPEG/PNG/WebP uploads, optional supported type, private download, same-slot replacement/history and optional additional uploads. Internal IDs are hidden. Actual invalid/oversized/auth/status errors are shown. | Approved required-document categories are absent; the illustrative three required slots were not invented. |
| 7. Review | Saved data, roads, amenities, crops, photos, document metadata and localized availability are reviewed before actual API submission. | API status remains private/under review; no automatic approval or publication. |

The optional energy-source review row was removed from this step's presentation without deleting stored data. Required existing API-related media controls were preserved even where the reference is more illustrative.

## API contracts and affected files

No schema changes were needed. Existing `Farm.facilities` JSON now supports a validated `amenities` array via the existing specifications GET/PATCH routes: six allowed values, unique entries, maximum six, null rejected, `[]` clears. Other object keys remain intact. Legacy scalar/array roots return 409 rather than being overwritten. Existing owner/manager edits, member reads and staff restrictions remain unchanged.

Stage 1C application files:

- `api/src/modules/requests/requests.controller.ts`, `request-documents.service.ts`: metadata route, private caching, missing-file validation and deterministic history ordering.
- `api/src/modules/farms/dto/farm-specification.dto.ts`, `farm-specifications.service.ts`: typed amenity persistence in existing JSON.
- `web/src/app/api/requests/[id]/documents/route.ts`: private BFF response caching; multipart and session-refresh integration retained.
- `web/src/features/my-farms/RequestDocumentsPanel.tsx`, `upload.ts`, `WizardDisclosure.tsx`: confirmed upload state, errors, history/replacement and optional disclosures.
- `web/src/features/my-farms/AddFarmWizard.tsx`, `FarmFacilitiesPanel.tsx`, `FarmMediaPanel.tsx`, `types.ts`: audited controls, date, amenities, drop zone and responsive fixes.
- `web/src/app/[locale]/my/layout.tsx`, `my/farms/new/page.tsx`, `my/farms/[id]/list/page.tsx`: authenticated rendering boundaries.
- `web/src/components/brand/Logo.tsx`, `web/messages/{en,ar}/workspace.json`: reproduced warning fix and EN/AR labels.
- API tests: `farm-amenities.spec.ts`, `request-documents-route.spec.ts`. Web tests/configuration: `stage1c.*` and affected existing Phase 5/6 fixtures/specifications.

Pre-existing Stage 1B geolocation changes and unrelated user changes were preserved. No Dashboard, Farm Details, database schema, or seed files were changed for Stage 1C.

## Real persistence and security evidence

Final end-to-end acceptance used dedicated **farm 502 / request 696**, test users 1034/1035, documents 8/9/10. The test created a farm through the UI, saved all seven steps, uploaded a real image and Chromium-generated PDF, replaced the PDF, added a separate JPEG document, reviewed, submitted, navigated to My Farms, and reloaded.

- Direct MySQL checks confirmed one photo, one crop, two amenities, three document versions/slots, private pin and road fields, and `From 2026-11-01` availability. Arabic date/radio restoration also passed.
- Exact authorized PDF download bytes matched the upload. The replacement retained its slot and earlier version; the additional document used another slot.
- Multipart upload succeeded after deliberately removing the access cookie while retaining a real valid refresh session; access cookie renewal was confirmed.
- Invalid signature returned 415, oversized PDF 413, missing file 400, submitted-request upload 409. Rejected attempts created no additional document metadata.
- Anonymous BFF access returned 401. Another user, a manager without document authorization, and wrong-request download attempts returned 404.
- Public marketplace responses excluded private coordinates, access details, private file/storage references and document data. Submission remained private with API `underFarmExitReview` status.

See [checks](../artifacts/stage1c/final/checks.json), [direct MySQL evidence](../artifacts/stage1c/final-mysql.json), and [run log](../artifacts/stage1c/final.log). These acceptance checks used real responses, not mocked success. Separate regression fixtures remain test-only.

All diagnostic records were newly created test records and are retained; test sessions were revoked. No existing customer record was reset/deleted. Private test objects use isolated `api/storage/stage1c`. Production S3 deployment/configuration was not tested. Port 4000 and the user's running frontend on 3000 were not stopped or overwritten.

## Visual comparisons

[Before/after comparison viewer](../artifacts/stage1c/comparison.html) contains all seven steps in EN/AR at **1440, 1024 and 390px**: 42 production before screenshots and 42 final after screenshots, plus six rental/date and eight real workflow/state captures (56 final screenshots).

Desktop sidebar/form/info columns measured 296/656/264px at 1440px. All 42 normal after captures passed horizontal-overflow checks. Buttons remain in document flow; no fixed bottom bars were added. Arabic direction, card selection, expanded sections, document history and mobile date states were checked. Live OSM tiles and actual authenticated data differ from Figma's illustrative content; whole-page pixel parity is not claimed.

## Verification results

- Focused API contracts/security tests: **39 passed**.
- Web wizard/geolocation/form regression matrix: **31 passed, 1 skipped**; [wizard-tests.log](../artifacts/stage1c/wizard-tests.log).
- Targeted form/upload failure-state suite: **9 passed** (overlaps the full matrix).
- Existing authentication regressions: **25 passed, 5 intentional viewport skips**.
- Web production build/type compilation and full lint: final logs [build](../artifacts/stage1c/web-build.log), [lint](../artifacts/stage1c/web-lint.log).
- API build and lint of changed API contracts/tests passed. Full API typecheck retains **27 pre-existing errors** in unrelated bootstrap/auth/fake-Prisma tests. Full API lint retains **17 errors** in unrelated files: [api-lint.log](../artifacts/stage1c/api-lint.log). These were not repaired in this scope.

## Remaining blockers / review decisions

1. Approve a required-document catalog and its enforcement contract before adding mandatory legal slots.
2. Define photo order/cover/replacement/removal APIs and retention rules. Existing `sortOrder` may support ordering without migration; cover/removal semantics are not currently defined and were not invented.
3. Legacy non-object facilities JSON intentionally requires explicit review before typed amenity edits; it is never silently replaced.
4. Resolve unrelated API type/lint failures separately. The exact historical ten-issue development session remains unreproduced.

Stage 1C stops here for review; no subsequent phase was started.
