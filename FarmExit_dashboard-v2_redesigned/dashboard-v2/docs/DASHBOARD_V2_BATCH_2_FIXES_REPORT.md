# Dashboard V2 batch 2 implementation report

Date: 2026-10-27

## Target and scope

Port 3003 runs `FarmExit_dashboard-v2_redesigned/dashboard-v2`, confirmed from the listening Node process. Its current chart styling, Suspense boundaries, green theme and dashboard shell were preserved. Corresponding account/request/navigation changes are also in the top-level `dashboard-v2` copy. Backend changes are under `api`. No commit or push was performed; pre-existing work was preserved.

The attachment supplied the written specification only. No screenshot files were attached, so screenshot-specific comparison against images 01–10 could not be performed. The numbered requirements were mapped to the live analytics, pipeline, communications, requests, users and administrators screens.

## Implemented changes

1. **Analytics:** SQL grouped weeks by Monday while zero-fill keys started on the arbitrary first weekday of the range. This discarded real weekly points and produced false 90-day empty states. Keys now use Monday boundaries and include partial first/last weeks. Monthly iteration starts at the first of each month, avoiding skipped months and missing final partial months. SQL returns date strings to avoid driver timezone conversion. Custom ranges override preset granularity and include the full UTC end day. All-time begins at the earliest actual record across the measured entities, rather than an arbitrary 2020 cutoff. The redesigned chart now parses `YYYY-MM` buckets as the first day of that month and labels them with month/year. Each chart retains its own empty state. Live tests compared all five requested series totals with their KPI/database aggregates for every preset.
2. **Pipeline detail:** `/[locale]/admin/listing-pipeline` already used the correct request ID and `/[locale]/admin/listings/:id` route. Its detail API incorrectly required `underFarmExitReview`, rejecting approved pipeline entries. Detail reads now accept non-draft listings, while assignment and review writes retain their original workflow restrictions and staff assignment authorization. Approved records with legacy null submission timestamps are readable too.
3. **Communication cases:** removed the terminal-closed rule after the existing access check. Authorized admins and assigned staff with communication permission can move among open, waitingCustomer, waitingOwner and closed. Closing sets `closedAt`; reopening clears it. Status and audit writes are atomic. Dropdown labels are localized, server refreshes synchronize the selected status, and affected overview/list pages are revalidated.
4. **Requests:** removed the visible ID column; Requester is first and links to request detail. The status select uses real request statuses, including sentToOwner, accepted and declined. The type select includes professional applications. Date filtering uses the inclusive UTC end millisecond.
5. **Navigation:** merged verification, partnership, management and inquiry queue entries into request filters. Kept their specialized details, Listings and Listing pipeline. See the separate IA audit for rationale and access paths.
6. **Users:** added persistent suspend/reactivate controls to list and detail, status badges, native confirmation dialog in the running app, pending/error/success states and refresh. Suspension revokes existing sessions; reactivation does not revive old sessions. Staff accounts are excluded from this endpoint.
7. **Administrators:** added a validated creation form with existing role scopes and human-readable permission previews. Backend role options come from the authoritative permissions matrix. Creation atomically writes a new identity, active memberships, Argon2 credentials and an audit record without passwords. Existing identities are never silently promoted. Normal admins can create restricted reviewer/case-agent accounts; only super admins can grant full admin authority. No endpoint grants super-admin membership. New accounts appear in the administrators/staff list, can log in normally, and receive enforced API permissions. Removed the obsolete creation-workflow warning. Password resets and editing existing memberships remain outside this batch.

## New API support

- `GET /api/v1/staff/admin/administrators/role-options`
- `POST /api/v1/staff/admin/administrators`
- `PATCH /api/v1/staff/admin/users/:id/status`

All require the existing dashboard audience, active authenticated membership and admin scope. Account management additionally checks `staff.manage` on the server; granting admin checks super-admin membership. DTO validation rejects unsupported statuses/roles. No schema migration is needed.

## Verification

- Active Dashboard V2 `npm run typecheck`: passed.
- Active Dashboard V2 `npm run lint`: passed, including direction, translation-key parity, sidebar motion and read-only session checks.
- Active Dashboard V2 `npm run test:unit`: 29 passed.
- Backend build-configuration typecheck (`npx tsc --noEmit -p tsconfig.build.json`): passed.
- Focused backend tests: 35 passed across 7 suites with `node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest-dashboard-v2.json --runInBand`; covers analytics boundary regression, account permissions/session handling, communication transitions, listing detail authorization and role permissions.
- Changed backend source also passes scoped ESLint using `tsconfig.build.json` for type resolution; the browser verification script passes ESLint.
- Real browser/API/database verification: `node api/scripts/verify-dashboard-v2-batch2.cjs` from repository root, or `node scripts/verify-dashboard-v2-batch2.cjs` from `api`. Requires both local servers and a local development database. Creates only synthetic fixtures and removes them, including sessions and audit records, on completion.
- Browser checks passed: all five presets plus same-day custom; approved pipeline row to detail; all communication statuses and reopening persisted through reload; Requests header/filter; user suspend/reactivate; creation of a restricted reviewer from the UI, table refresh and normal login; reviewer denied admin API (403) and admin navigation; Arabic RTL pages; no browser page exceptions.
- Screenshots and machine-readable results: `docs/artifacts/batch2/verification.json` and adjacent PNGs. Analytics and Requests screenshots were also visually inspected.

## Remaining verification limitations

The backend's repository-wide `npm run typecheck` currently uses NodeNext resolution even though its source/build configuration uses CommonJS extensionless imports. It fails broadly in existing source, seed scripts and tests. Full backend lint inherits that resolution problem (15,218 reported issues). These broad configuration failures were not repaired as part of this product batch; the backend build configuration and focused runtime tests verify the changed implementation independently. Missing original screenshots prevent an exact before/after comparison with the user's referenced images.
