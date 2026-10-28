# Dashboard V2 runtime fixes

Date: 2026-10-26 (Africa/Cairo). No commit or push.

## Implementation target and environment

The physical project serving port 3003 was verified from Windows process command lines before implementation:

`F:\Abdo Khaled projects\Qeema_Node_Projects\FarmExit\FarmExit_dashboard-v2_redesigned\dashboard-v2`

Original listener PID 19844 was the child of PID 5852, whose command line ran this directory's `node_modules/next/dist/bin/next dev -p 3003`. The server was subsequently restarted to load the security patch. Its startup log confirms Next.js 16.4.1, Cache Components and Partial Prefetching, on port 3003.

API listener PID 13472 runs FarmExit's `api/dist/main`. The dashboard has no `.env.local`; its API resolver defaults to `http://127.0.0.1:4001/api/v1`. A direct unauthenticated request to that origin's `/staff/me` returned HTTP 401. No API-origin or database configuration was changed. Ports 3000, 3002 and 4000 were not managed. Dashboard V1, the other Dashboard V2 copy and the public website were not edited. Existing uncommitted changes were preserved.

## Root causes and changes

### Missing translations

Analytics' proposal distribution uses a raw SQL result (`r.kind`) and can return the mapped database spelling `co_purchase`. The messages lacked both `coPurchase` and `co_purchase`. Direct calls to the translator therefore raised `MISSING_MESSAGE`.

Both locale files now cover Prisma API names and database aliases for proposal kinds, request types, staff roles, professional types, verification statuses, communication statuses and co-purchase group statuses. Proposal coverage includes cash, installment, exchange, mixed and both co-purchase spellings. Added reviewer/case-agent labels and verification-required labels. Existing request workflow status labels were inspected.

Analytics checks `t.has()` before translating request/status/proposal values. Shared `EnumLabel` also uses a localized Unknown label for future values; badges using it inherit this behavior. Unknown values do not produce raw translation keys. The existing loader explicitly imports `messages/{locale}/admin.json`; no loader change is needed.

`npm run test:translations` parses the actual backend Prisma enum definitions, verifies both mapped and API spellings through next-intl for English and Arabic, captures translation errors, and checks localized unknown fallback behavior. This complements the existing locale-key parity check.

### Publication queue 403

Trace: Listing Pipeline -> `requireConsolePage` -> dashboard access cookie -> `/staff/me` -> `apiFetchAdminResult` with Bearer token -> Nest AccessTokenGuard/StaffGuard -> `StaffListingReviewsController.queue` -> `ListingPublicationService.queue` -> `requireAdmin`.

The controller requires `requests.read` and admin scope. The database-backed StaffGuard already implements Super Admin's admin hierarchy and grants all permissions to active Super Admin. The service contradicted that policy in two places: `requireAdmin` accepted only a literal admin role, and the publication transaction searched only for an active admin membership. A Super Admin without a separate admin membership was consequently denied after passing the guard.

The service now uses the existing `staffHasAdminScope` helper, and the transactional recheck allows active admin or Super Admin membership. Guards, permissions, membership revocation checks, publication validation, transaction boundaries and business rules remain intact. Reviewers and case agents still receive backend 403.

The dashboard already hides the publication navigation and denies direct routes for restricted roles. Added explicit unit coverage for that behavior. Listing Pipeline now renders localized Access Denied if an otherwise admitted session receives a backend 403, without treating denial as an empty queue. Other API failures still surface as failures. The generic forbidden message now describes the denied page/action accurately for shared staff users.

The exact current browser account, JWT and effective `/staff/me` response could not be inspected: no authenticated browser session or staff credentials were available to the test runner. The service hierarchy defect is confirmed by source and focused tests; live account-specific authorization remains unverified.

### Uncached session reads during navigation

`getAdminSession` calls request cookies and uncached `/staff/me`. The console layout awaited this at its top level; affected pages also performed session/API reads before declaring a runtime rendering boundary. An ancestor layout boundary alone does not cover every client navigation, as documented by the installed Next.js authentication and instant-navigation guides.

The authenticated console shell now sits inside Suspense. Overview, Analytics, Farms, Requests, Listing Pipeline and Communications have their own Suspense boundaries around async page content, with a shared skeleton and localized loading announcement. Session resolution uses React `cache` for deduplication within a server render/request, not persistent Next.js caching. Staff fetches retain `cache: 'no-store'`. Refresh middleware, logout and authorization code were not changed. Cache Components and Partial Prefetching remain enabled; no additional `instant = false` workaround was introduced.

After these changes, the fresh dev log contained no `MISSING_MESSAGE`, uncached-data message or API `failed: 403` from the exercised routes. This observation applies to the unauthenticated browser checks; authenticated navigation still requires verification.

### Security patch

Official advisory: [Next.js security update, October 14, 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026).

The advisory identifies 16.4.1 as the patched 16.4 release. Upgraded Next.js and eslint-config-next from exactly 16.4.0 to exactly 16.4.1 and updated package-lock.json with npm. React and React DOM remain at 19.3.0. npm installation completed successfully and reported **0 vulnerabilities**. Production build and restarted development server both identify themselves as 16.4.1. No major upgrade or warning suppression was used.

## Exact source/configuration files changed

Relative to the physical dashboard project:

- `package.json`, `package-lock.json`
- `messages/en/admin.json`, `messages/ar/admin.json`
- `scripts/test-enum-coverage.mjs`
- `src/lib/admin/session.server.ts`
- `src/lib/admin/console-routes.test.ts`
- `src/features/admin/workspace/EnumLabel.tsx`
- `src/components/ui/LoadingState.tsx`
- `src/app/[locale]/admin/(console)/layout.tsx`
- `src/app/[locale]/admin/(console)/loading.tsx`
- `src/app/[locale]/admin/(console)/page.tsx`
- `src/app/[locale]/admin/(console)/analytics/page.tsx`
- `src/app/[locale]/admin/(console)/listing-pipeline/page.tsx`
- `src/app/[locale]/admin/(console)/farms/page.tsx`
- `src/app/[locale]/admin/(console)/requests/page.tsx`
- `src/app/[locale]/admin/(console)/communications/page.tsx`
- `tests/e2e/runtime-guards.spec.ts`
- This report. Build/dev logs in `docs/runtime-*.log` are verification artifacts.

Related backend files, relative to the workspace:

- `api/src/modules/listing-requests/listing-publication.service.ts`
- `api/src/modules/listing-requests/listing-publication-authorization.spec.ts`
- `api/jest-publication.json` (focused Jest configuration using the API's existing CommonJS build tsconfig).

No sidebar, topbar, chart, table, KPI, typography, color or spacing redesign was performed. Loading and denial states use existing UI components.

## Verification and limitations

| Check | Result |
| --- | --- |
| Dashboard `npm run typecheck` | Passed: route types generated; tsc passed |
| Dashboard `npm run lint` | Passed: ESLint, direction, message parity, sidebar motion and read-only session checks |
| Dashboard `npm run test:translations` | 2 passed, English and Arabic |
| Dashboard `npm run test:unit` | 28 passed |
| Dashboard `npm run build` | Passed; Next.js 16.4.1; 108 generated pages; Cache Components/Partial Prefetching enabled. Output: `docs/runtime-build.log` |
| API build-config typecheck | `node node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit` passed |
| API focused service, permission matrix and StaffGuard tests | 3 suites / 26 tests passed |
| Browser checks on port 3003 | Initial suite: 40 passed, 5 skipped, 1 timeout during Fast Refresh; the single timeout passed on an isolated rerun |

Backend test command, from `api`:

```powershell
node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest-publication.json --runInBand --runTestsByPath src/modules/listing-requests/listing-publication-authorization.spec.ts src/modules/authorization/staff-permissions.spec.ts src/modules/authorization/staff.guard.spec.ts
```

Browser command, from this dashboard:

```powershell
$env:PORT='3003'
npx playwright test tests/e2e/admin.spec.ts tests/e2e/admin-workflows.spec.ts tests/e2e/runtime-guards.spec.ts --workers=1
```

Confirmed in real Chromium: all six requested English routes and corresponding Arabic routes redirect unauthenticated users to login without a page exception; Arabic HTML uses RTL. Login renders, invalid email validation works, and a mocked rate-limit response displays the retry interval. These do **not** establish successful live login or authenticated data rendering. The authenticated navigation test is present and skips without `DASHBOARD_E2E_EMAIL` and `DASHBOARD_E2E_PASSWORD`.

Still unverified: successful live Super Admin queue data, live restricted-account 403/denial rendering, authenticated Analytics distributions, client navigation with a real staff session, successful session refresh and logout. No credentials were supplied, and no users, sessions or memberships were seeded or manufactured for verification. No publication writes, migrations or resets were run.

Remaining development diagnostics: Next.js instant validation logs `Could not validate instant` when an unauthenticated prefetch encounters the expected login redirect. Logo images also emit existing aspect-ratio warnings. Neither is reported as resolved or hidden. No affected-route uncached-data warning was observed in the fresh unauthenticated checks, but authenticated verification remains necessary.

The API's default broad `npm run typecheck` fails on existing NodeNext/extension-resolution errors across the repository. Default Jest configuration also hits an existing ESM/CommonJS import-cycle problem when loading Nest/Prisma services; the focused config uses the API's working build configuration and passed. API ESLint on the service/spec reports unresolved-type errors under the same default project configuration. These unrelated backend configuration issues were not rewritten. Dashboard typecheck, lint and build pass independently.

Tooling notes: initial sandboxed checks could not spawn workers or access SWC's native cache; checks were rerun with required process access. npm warned that an old loaded Windows SWC binary could not be removed during upgrade; the server was restarted and the installed patch builds successfully. Generated stale development artifacts were refreshed. No application errors were suppressed to make checks pass.
