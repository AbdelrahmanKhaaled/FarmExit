# Phase 6 — Add Farm and listing management

Only Phase 6 was implemented. Authoritative sources were the 45-page Add Farm PDF and 11-page Arabic PDF. The two one-page preliminary concepts were inspected and excluded. No Figma MCP calls were made. [Complete reference/route/API map](PHASE6_REFERENCE_MAP.md).

| Area | Result |
| --- | --- |
| Seven-step wizard | Farm basics, location/land, agriculture/facilities, sale/rent details, private photos, request documents, review/edit/submit |
| Existing components updated | `AddFarmForm`, `FarmWorkspace`, `FarmFacilitiesPanel`, `FarmMediaPanel`, My Farms page, listing-only request detail branch |
| Shared UI reused | Phase 5 portal layout, existing tokens/fonts, `Card`, fields, buttons, badges, avatar, logo, icons and accessible dialogs |
| API integration | Existing farm/specification/facility/media/listing/request/document contracts; missing authenticated **web adapters** added; no backend implementation |
| Desktop / tablet / mobile | Browser comparisons at 1440 / 1024 / 390px, including all steps, review/success, corrections, validation and upload failures |
| Arabic | Arabic reference layouts, native Arabic font and labels, logical step/sidebar positioning, sale/rent choice order, directional arrows, private uploads and numeric units checked at all three widths |
| Business rules | Owner-scoped listing drafts, owner/manager farm editing, private media/documents, genuine status/history, correct EGP rent/sale units, no client publication or fabricated farm values |

## Screens and interactions

- `/[locale]/my/farms/new` opens the seven-step wizard. The compact task header replaces portal navigation only on wizard routes.
- `/[locale]/my/farms/[id]/list?listingId=…&step=…` restores authorized farm/listing/specification records. The URL records the current step; no unsupported backend wizard checkpoint or completeness score is invented.
- The first save requires the backend's name/type/area/governorate minimum. Step 1 can continue locally, but cannot claim an API-saved draft before location is supplied.
- Desktop Save & Exit and mobile Save use actual backend acknowledgments. Failed saves keep entries and stay on the page. The leave dialog offers save/leave or continued editing.
- Form values, staged facility entries and selected files survive moving between steps. Pending facility entries/files must be saved/uploaded or explicitly cleared before save/continue/submit. The review summary includes actual crops and loaded facilities. Upload progress comes from actual transferred bytes; 100% transfer means awaiting confirmation, not accepted storage.
- Sale/rent switching sends only the correct whole-EGP fields, clearing incompatible prices through the existing DTO. Rent remains **EGP per feddan per year**. No per-feddan price is derived.
- Submission uses the existing submit endpoint. A malformed 2xx response, failure or non-review status cannot become a success screen. Success requires the matching request id, request number and confirmed `underFarmExitReview` status.
- My Farms uses actual account farms and the most recent owner listing per farm, with real status filters/counts and resume/track/workspace actions. Existing farm relationships and editor permissions remain.
- Farm workspaces prioritize genuine review progress/documents where available. Existing detail editing, facility/media controls, partnership/management links and the existing listing action remain accessible. Auxiliary editors are grouped in disclosures.
- Listing request tracking shows actual recorded history/reviews. Documents are scoped to that request. New copies use the existing same-slot upload API; earlier versions remain in the history. Listing correction/resubmission is enabled only for draft/changesRequested states.

## Comparisons

[Interactive comparison viewer](../artifacts/phase6/comparison.html) includes **114 browser screenshots**: 19 presentations × EN/AR × three widths.

- [English desktop](../artifacts/phase6/en-1440-review.png), [tablet](../artifacts/phase6/en-1024-review.png), [mobile](../artifacts/phase6/en-390-review.png)
- [Arabic desktop](../artifacts/phase6/ar-1440-review.png), [tablet](../artifacts/phase6/ar-1024-review.png), [mobile](../artifacts/phase6/ar-390-review.png)
- [Full captures](../artifacts/phase6/screenshots/), [Add Farm PDF contact sheet](../artifacts/phase6/reference/add-farm/contact-sheet.png), [Arabic PDF contact sheet](../artifacts/phase6/reference/arabic/contact-sheet.png)

Verified corrections include the desktop three-column proportions, compact mobile header/progress, short farm-type options, sticky action spacing, native private file-picker styling, request tracking width, approved card treatment, submission overlay, and EN/AR directional layout.

The captures use shared production components in an environment-guarded visual app with explicitly synthetic test records and browser-intercepted responses. Approved local imagery is used only inside that fixture app. No fixture record, photo, document or user is inserted into the live UI or database. No real authenticated farm/listing mutation was performed. Live authenticated creation/upload/resubmission therefore remains unverified in this run.

PDF print margins, multiple frames per page, different real content and unavailable fields prevent a meaningful whole-page pixel-difference percentage. Exact pixel parity is not claimed.

## Supported versus blocked

| Interaction | Supported behavior / limitation |
| --- | --- |
| Farm create/edit | Exact existing DTOs and farm relationship permissions |
| Structured agriculture | Supported crop taxonomy and production text keys; unavailable existing production data is not overwritten |
| Facilities | Existing four facility types and create/update actions; unsupported decorative facility options omitted |
| Draft/resume | Confirmed private farm/listing values restored; optional step in URL. Resume without a step starts at basics because no persisted wizard checkpoint exists |
| Autosave | Not claimed or simulated; explicit confirmed save/continue only |
| Location/access | Accepted governorate, area and soil fields. Exact map pins, road distances and unsupported access controls are omitted with an explicit notice |
| Photos | Private upload, preview, alt text, illustrative flag, real progress, validation/error/retry. Ordering, cover selection, deletion and true replacement have no supported endpoint |
| Documents | Private upload/download/metadata and same-slot new copies in editable states. No invented fixed set of three required documents or silent deletion of old versions |
| Review/submit | Actual API confirmation and trackable private review status; no automatic publication or invented SLA |
| Changes requested | Genuine review text, authorized document copies, editable listing corrections and resubmission |

The introduction screens are not added as an extra marketing gate before the seven steps. The compact task shell and protected portal routing preserve the existing authentication/session flow. The existing legacy quick listing action is retained alongside the primary wizard path. No unapproved media, exact private coordinates, private documents or owner contact data is moved to public routes.

## Validation

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, including locale and direction checks |
| `npm run build` | Passed |
| Isolated workflow tests | 8 passed |
| Visual matrix | 6 passed; EN/AR × 1440/1024/390 |
| Production auth/portal/API-adapter regressions | 49 passed, 9 skipped |

Commands:

```text
npx playwright test --config tests/visual/phase6.config.ts
npx playwright test phase6-portal.spec.ts auth.spec.ts phase5-auth.spec.ts phase7-portal.spec.ts phase8-portal.spec.ts phase9-portal.spec.ts phase10-authenticated.spec.ts --workers=2
```

The nine skipped production cases are deliberate project exclusions and the real authenticated-session test, for which no dedicated `FX_E2E_MOBILE` development account was selected. No OTP SMS or fixture seeding was triggered. Browser workflow tests intercept mutations inside the isolated app; production checks verify real guest redirects and unauthorized API responses.

Tests verify retained values/files/facility entries, one farm/listing creation per workflow, correct rent payloads, failed save retention, failed uploads without false uploaded states, new document copies preserving old metadata, authorized resubmission, read-only review states, malformed submit responses, horizontal overflow, readable mobile document/title widths and action-bar clearance. File-input remounting, malformed submit data entering local state, and staged facility entries being omitted by wizard continuation were corrected and retested.

Logs: [build](../artifacts/phase6/build.log), [typecheck](../artifacts/phase6/typecheck.log), [lint](../artifacts/phase6/lint.log), [final isolated suite: eight workflow and six visual tests](../artifacts/phase6/visual-test.log), [production regressions](../artifacts/phase6/regression-test.log).

## Files and remaining differences

[Exact modified-file list](../artifacts/phase6/files-modified.txt). Changes are confined to web farm/listing presentation, narrowly scoped adapters, EN/AR workspace copy, tests and review artifacts. No dependency or design-token changes were needed.

Remaining differences are the unsupported controls above, real/fixture content and photo counts, generic document requirements, preserved auxiliary portal actions/extra navigation, native radio/select behavior and some text wrapping. Arabic exports chiefly document desktop wizard layouts; tablet/mobile Arabic behavior was checked using those layout rules and the English responsive frames.

The build retains the existing multiple-lockfile workspace warning. Isolated development renders log existing shared logo sizing/LCP recommendations; these do not fail rendering. Public Farm Details, Authentication, other marketplaces, unrelated portal pages, `api/`, `dashboard/`, database, migrations and seed data were not modified by Phase 6. No commit/push was made.

Stopped after Phase 6. No Phase 7 implementation was started.
