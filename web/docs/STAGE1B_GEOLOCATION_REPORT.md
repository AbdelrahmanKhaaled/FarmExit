# Stage 1B — Functional geolocation, existing UI preserved

Completed 20 October 2026. Scope: Add Farm Location & Land and its private API/BFF contract. No schema/migration, global CSS, shared tokens, Dashboard, public Farm Details or authentication implementation changed. No commits, seeds, resets, record deletions or Figma MCP calls.

## Functionality and contracts

`GET /api/v1/farms/:id/private-location` returns only:

```json
{
  "farmId": "486",
  "privatePinLatitude": null,
  "privatePinLongitude": null,
  "nearestMainRoad": null,
  "roadDistanceKm": null
}
```

This response is private/no-store. Active, in-window farm owners can read it. Staff require the dedicated `farms.private-location.read` permission; the existing admin/super-admin full-authority rule grants it, while case agents/reviewers receive no additional access. Managers, other farm relationships and strangers cannot read it. Unauthorized resource access returns the same 404 as a missing farm; unauthenticated access returns 401.

`PATCH /api/v1/farms/:id/private-location` accepts the four optional location/road properties above, without `farmId`. Only an active farm owner may write. Staff editing rules are unchanged: staff permission grants read only.

- Coordinates are numeric, finite, latitude −90…90 and longitude −180…180, with at most eight decimal places. Both must be supplied together; both `null` explicitly clear. Omission preserves existing coordinates, including during road-only edits. Zero is valid.
- Road name is trimmed nonempty text, maximum 255 characters, or `null` to clear. Distance is a finite nonnegative number in kilometres, or `null` to clear. Unknown properties are rejected.
- Road fields are stored as `nearestMainRoad` and `roadDistanceKm` in existing `access_details`. Only these keys change; unrelated/nested JSON keys survive. Legacy scalar/array JSON causes 409 instead of silent replacement. Updates use a transaction and timestamp compare-and-swap.
- No write copies values into `public_map_*`. Generic farm/mine responses remain unchanged and omit location/road details. Marketplace uses its existing explicit public allow-list; the private forbidden-field list now also names both road fields.

The same authenticated GET/PATCH contract is forwarded by `/api/farms/:id/private-location`. Existing HttpOnly cookie/session refresh handling is reused; responses are private/no-store.

The client-only Leaflet map supports click/tap selection, zoom/pan, dragging, keyboard map navigation with Place pin at the centre, and explicit clearing. Egypt is an initial viewport, never a default saved pin. The existing brand pin icon and controls are reused. Road inputs are enabled with validation. Save is explicit; failures retain entries and never claim success. Resume fetches private values on the server; a failed fetch triggers a client retry state and blocks edits/saving until loaded. Raw coordinate output is screen-reader-only, preserving the reference's visible pin-status layout.

## Visual preservation

Inspected local Add Farm PDF renders: desktop page 7, tablet page 31, mobile page 40; Arabic reference page 4 and both reference contact sheets. Captured all six before screens before editing source.

- [Before/after comparison](../artifacts/stage1b/comparison.html)
- [Pixel measurements](../artifacts/stage1b/comparison-metrics.json): **zero changed pixels** in every captured header, plus desktop sidebar/info-card regions in EN/AR.
- Desktop columns remain **296 / 656 / 264px**, with aligned rows. Tablet columns remain **680 / 240px** and reverse appropriately in RTL. Mobile has no horizontal overflow. Back/Continue remain in normal document flow.
- Existing cards, land disclosure, navigation, typography, gutters, tokens and surrounding layout are preserved. Changes inside the location card replace the disabled placeholder with a real map/status/clear controls; road fields become editable and their obsolete unavailable notice is removed.
- Actual OSM tiles differ from Figma's illustrative geographic artwork, as expected for the approved provider. Map attribution and standard zoom controls remain visible. This is functional/structural verification, not a claim of pixel parity for the map artwork.

| Viewport | EN before | AR before | EN production reload | AR production reload |
|---|---|---|---|---|
| 1440 | [PNG](../artifacts/phase5-6-fixes/stage1b-before/en-1440-wizard-2.png) | [PNG](../artifacts/phase5-6-fixes/stage1b-before/ar-1440-wizard-2.png) | [PNG](../artifacts/stage1b/production/en-1440-reload.png) | [PNG](../artifacts/stage1b/production/ar-1440-reload.png) |
| 1024 | [PNG](../artifacts/phase5-6-fixes/stage1b-before/en-1024-wizard-2.png) | [PNG](../artifacts/phase5-6-fixes/stage1b-before/ar-1024-wizard-2.png) | [PNG](../artifacts/stage1b/production/en-1024-reload.png) | [PNG](../artifacts/stage1b/production/ar-1024-reload.png) |
| 390 | [PNG](../artifacts/phase5-6-fixes/stage1b-before/en-390-wizard-2.png) | [PNG](../artifacts/phase5-6-fixes/stage1b-before/ar-390-wizard-2.png) | [PNG](../artifacts/stage1b/production/en-390-reload.png) | [PNG](../artifacts/stage1b/production/ar-390-reload.png) |

## Verification

| Check | Result |
|---|---|
| Before EN/AR captures, all three widths | 6 passed |
| DTO/service, staff matrix, public contract | 33 passed |
| Dedicated real MySQL API suite | 3 passed, including browser subprocess |
| Production authenticated page → real BFF → API 4001 → MySQL → fresh reload | 6 passed, EN/AR × 1440/1024/390 |
| Isolated map selection, dragging, edit/clear, road restore, loading/save errors and layout | 7 passed |
| Existing wizard, facilities, uploads, submission/error and layout regressions | 15 passed |
| Existing authentication regressions | 25 passed; 5 intentional skips for desktop-only interception test |
| Web typecheck, lint, production build | Passed |
| API production build and ESLint on all changed API files | Passed |
| Full API typecheck | Fails: 27 errors in untouched bootstrap/auth/test-support code, predominantly fake-Prisma type incompatibilities. No errors in the new geolocation files. [Log](../artifacts/stage1b/api-typecheck.log) |
| Full API lint | Fails: 17 errors in untouched seed/admin/auth/test-support files. [Log](../artifacts/stage1b/api-lint.log) |

MySQL verification first queried the existing location columns successfully; no migration was needed. Tests checked exact eight-decimal round trips, editing/clearing, zero distance, retained legacy JSON, no public coordinate writes, owner/manager/stranger access, case-agent denial, admin read-only access, and generic/public response exclusions.

Production browser verification uses a real dedicated owner session cookie and the actual resume route/BFF; it does not intercept API requests. Isolated browser tests separately cover state/failure behavior and screenshot preservation. No production fixture switch was added.

Dedicated test farms **483–486** and their new test identities remain for review. The first run's API assertions passed but its browser subprocess needed an inherited-Jest-environment correction; subsequent runs passed. Temporary sessions were revoked and test staff memberships made inactive after every run. No pre-existing user/farm records were modified. API test listeners used **4001**; browser servers used **3103/3104/3105** and were stopped by their harnesses. Port 4000 was not used or terminated.

Logs: [MySQL/production](../artifacts/stage1b/mysql-production.log), [map interactions](../artifacts/stage1b/geolocation.log), [wizard regressions](../artifacts/stage1b/wizard-regression.log), [authentication](../artifacts/stage1b/auth-regression.log), [web build](../artifacts/stage1b/web-build.log), [web lint](../artifacts/stage1b/web-lint.log).

## Files changed

Backend:

- `api/src/modules/farms/dto/private-location.dto.ts` — new private request/response DTOs.
- `api/src/modules/farms/private-location.controller.ts` — new guarded GET/PATCH resource.
- `api/src/modules/farms/private-location.service.ts` — authorization, persistence, JSON merge and response allow-list.
- `api/src/modules/farms/private-location.spec.ts` — validation/security/merge unit tests.
- `api/src/modules/farms/private-location.integration-spec.ts` — opt-in, nondeleting MySQL/browser verification.
- `api/src/modules/farms/farms.module.ts` — resource registration.
- `api/src/modules/authorization/staff-permissions.ts` — dedicated staff read permission.
- `api/src/modules/listing-requests/public-listing-contract.ts` — explicit road-field exclusions.

Frontend:

- `web/src/features/my-farms/FarmLocationMap.tsx` — client-only map using existing UI components/icon.
- `web/src/features/my-farms/AddFarmWizard.tsx` — controlled location/road state, loading/errors and confirmed persistence.
- `web/src/features/my-farms/types.ts` — separate private-location type.
- `web/src/app/[locale]/my/farms/[id]/list/page.tsx` — authorized private-location resume fetch.
- `web/src/app/api/farms/[id]/private-location/route.ts` — authenticated BFF resource.
- `web/messages/en/workspace.json`, `web/messages/ar/workspace.json` — scoped location/road strings.
- `web/package.json`, `web/package-lock.json` — Leaflet 1.9.4 and its TypeScript types.

Tests/report:

- `web/tests/visual/geolocation.spec.ts`, `geolocation.config.ts` — isolated interaction/visual matrix.
- `web/tests/visual/geolocation-production.spec.ts`, `geolocation-production.config.ts` — real production/BFF persistence matrix.
- `web/tests/visual/geolocation-auth.config.ts` — existing auth tests against the production build.
- `web/tests/visual/phase6-fixtures.ts` — private-location mock contract, test-only.
- `web/tests/visual/phase56.spec.ts` — replaces obsolete disabled-location assertions with the approved enabled contract.
- This report and local comparison/screenshot/log artifacts.

## Remaining limitations

No functional geolocation blocker was found. Full repository API typecheck/lint remain blocked by the unrelated errors listed above. Existing logo sizing/workspace-root warnings remain unchanged. OSM tile availability depends on network/provider availability; errors are visible rather than simulated. No geocoding, public-pin publishing, automatic road calculation or subsequent phase was added.

Implementation references: [Leaflet API](https://leafletjs.com/reference.html), [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/). No Figma network requests were made.
