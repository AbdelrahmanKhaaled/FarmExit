# Farm status and listing publication filters

Date: 2026-10-27. Target: the Dashboard V2 serving port 3003, in `FarmExit_dashboard-v2_redesigned/dashboard-v2`. Page: `/en/admin/farms` and its Arabic equivalent.

## Implemented behavior

- Added Listing Publication beside Farm Status: All Farms, Published for Sale, Published for Rent, No Published Listing, Published for Sale & Rent.
- `listingPublication=sale|rent|none|saleAndRent` is validated in the existing Farms API. Omitting it returns all unarchived farms.
- The filter is a Prisma relation predicate applied to the full database query before both `count` and `findMany` pagination. It combines with the existing search, governorate and farm status predicates.
- A published listing requires a `farmListing` request with `status=published`, `visibility=public`, non-null `publishedAt`, and a sale/rent listing-detail record. The same predicate now supplies the existing listing links in farm list/detail responses. Draft, approved-but-unpublished, private and incomplete publication records do not qualify. No publishing rules or authorization were modified.
- Sale and Rent are inclusive: a farm with both qualifies for either. The combined option requires two matching listing types, rather than an impossible single request with both types. The existing publication workflow allows one published listing of each type per farm, so both is a supported state.
- Pagination preserves every filter and uses an ID tie-breaker when creation times match. Applying filters starts at page 1. Clear Filters removes every query parameter and remounts the uncontrolled filter inputs so displayed selections reset too.
- Added English/Arabic labels and keyboard-focusable/hover tooltips. The table now explicitly labels Farm Status. Active is never presented as proof of publication. Existing CRUD controls, routes, permissions and visual design remain in place.

## Farm Status audit

| Question | Finding |
| --- | --- |
| Prisma field / database column | `Farm.farmStatus` / `farms.farm_status` |
| Type / enum | `String @default("active") @db.VarChar(30)`, indexed; **not an enum** |
| Supported workflow values | `active` is the only value defined by the default and current authorized workflows. The string column technically permits arbitrary database values, but these are not new supported domain statuses. |
| Existing data | All **256** farm records are `active`; **255** are unarchived and visible in this directory. The archived record also remains `active`. |
| Can authorized CRUD change it? | No. Create defaults to active; owner/manager and super-admin update DTOs plus `editableFields` omit `farmStatus`. No status-change endpoint exists. |
| What does Archive change? | The existing super-admin archive workflow changes `deletedAt`, not `farmStatus`, and conservatively blocks farms with linked workflows. |
| Does Active determine public eligibility? | No. Publication requires an approved request, valid sale/rent pricing, a current active owner, an available/non-deleted farm, authorized admin publication, and no published listing of the same type. `farmStatus` is not a publication gate. |
| Is it distinct from publication? | Yes. It is the internal administrative record-state field, independent of the request-based listing lifecycle. An active farm can have no publication, sale only, rent only or both. |

**Recommendation:** with only Active supported and present, Farm Status currently adds no filtering distinction. It can be hidden when only one supported value exists and restored if a defined administrative status workflow is added. It has deliberately been kept visible in this implementation; no statuses or status-editing capability were invented. The dropdown still obtains actual values from the existing server-side filter-options endpoint.

## Verification results

All business-record verification was read-only. No farms, requests, publication state, accounts, credentials or sessions were created or updated. The browser reused an existing authorized local dashboard session; no login/refresh flow was invoked. Non-GET/HEAD browser requests were blocked, including a Next.js development stack-frame request. No database reset, commit or push was performed.

Independent SQL over all unarchived farms was compared with every page of the authenticated API, including IDs, totals and displayed publication links:

| Filter | Farms | Result |
| --- | ---: | --- |
| All Farms | 255 | Passed across all 26 pages |
| Published for Sale | 50 | Passed across all 5 pages |
| Published for Rent | 30 | Passed across all 3 pages |
| No Published Listing | 176 | Passed across all 18 pages |
| Published for Sale & Rent | 1 | Passed |

Sale/Rent overlap by one farm: `50 + 30 - 1 + 176 = 255`.

- Combined existing farm name + governorate + active status + publication: passed, one matching existing farm.
- Invalid publication value: HTTP 400; unauthenticated request: HTTP 401.
- English and Arabic browser flows: every dropdown value, combined controls, tooltip keyboard focus, Clear Filters, and page-2 navigation retaining publication/status all passed. RTL/LTR direction was checked. Screenshots were saved; the Arabic layout was visually inspected.
- No browser page exceptions. Separate console inspection of both locale Farms pages produced no warnings/errors.
- Active dashboard `npm run typecheck`: passed.
- Active dashboard `npm run lint`: passed, including translation parity and direction checks.
- Backend `npx tsc --noEmit -p tsconfig.build.json`: passed.
- Scoped backend ESLint for the changed service/helper/DTO using the build tsconfig: passed. Verification-script ESLint: passed. The known repository-wide backend NodeNext configuration mismatch from the previous batch was not changed.
- Six focused regression tests: passed via `node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest-dashboard-v2.json --runInBand --runTestsByPath src/modules/admin-operations/admin-farms-publication.spec.ts` from `api`.
- `git diff --check`: passed for tracked changes.

Reproduce the read-only browser/API/database check with `node scripts/verify-farm-publication-filters.cjs` from `api`, with the local API/dashboard running and an existing active local admin dashboard session. The script refuses non-local/non-development database targets and never creates fixtures.

## Exact files changed in this task

Backend (paths relative to repository root):

1. `api/src/modules/admin-operations/dto/admin-farms.dto.ts` — validated query parameter/type.
2. `api/src/modules/admin-operations/farm-publication-filter.ts` — new shared relation/publication predicates.
3. `api/src/modules/admin-operations/admin-farms.service.ts` — filter before count/page; shared link predicate; stable ordering.
4. `api/src/modules/admin-operations/admin-farms-publication.spec.ts` — six regression tests.
5. `api/jest-dashboard-v2.json` — includes the new test suite.
6. `api/scripts/verify-farm-publication-filters.cjs` — new read-only live verification/audit script.
7. `api/eslint.config.mjs` — lint configuration for that CommonJS verification script.

Frontend (relative to `FarmExit_dashboard-v2_redesigned/dashboard-v2/`):

8. `src/app/[locale]/admin/(console)/farms/page.tsx` — query wiring/pagination, reset key and explicit status column label.
9. `src/features/admin/farms/FarmFilters.tsx` — dropdown, labels and accessible tooltips.
10. `src/styles/batch-one.css` — filter-caption alignment within the existing responsive filter layout.
11. `messages/en/batch.json` — English labels/help.
12. `messages/ar/batch.json` — Arabic labels/help.
13. `docs/FARM_STATUS_LISTING_PUBLICATION_FILTERS_REPORT.md` — this report.

Generated evidence under the same frontend root:

- `docs/artifacts/farm-publication-filters/verification.json`
- `docs/artifacts/farm-publication-filters/status-audit.json`
- `docs/artifacts/farm-publication-filters/farms-sale-en.png`
- `docs/artifacts/farm-publication-filters/farms-sale-ar.png`
