# Frontend Phase 10 — integration and QA

Date: 2026-10-18. API: `http://127.0.0.1:4001/api/v1`.

This report distinguishes live browser verification from the backend's isolated HTTP tests. Authenticated website writes and Dashboard review/publication have **not** been verified against the development database. No reset, seed, migration, commit or push was performed. Pre-existing working-tree changes were preserved; the backend implementation was not edited in this phase.

## Completion matrix

| Feature | Implementation | Real API integration | Browser E2E verification | Remaining issues |
| --- | --- | --- | --- | --- |
| Phase 0.1–1 foundation and components | Existing, preserved | Not applicable | Locale routing, layout, focus/dialogs, navigation | No comprehensive accessibility certification |
| Homepage farms | Replaced sample farm adapter with published API listings; approved cards retained | Live list, totals, sale/rent, sort, score | Cards compared against actual API | Other homepage examples remain explicitly labeled; no statistics/testimonials API |
| Farm marketplace | Existing filters, sorting and pagination; mobile load-more corrected | Public supported filters only | List, rental URL, server sort, privacy checks, details, pagination contracts | Farm type, crop, water, irrigation and energy filters lack public API fields; current-page area options are incomplete |
| Listing details and FarmExit Score | Existing public DTO adapter; removed fabricated missing publication date | Live slug lookup, approved public score or null | Published details and unknown slug checks | API exposes no public rich media, facilities or documents; placeholders remain illustrative; similar listings absent |
| Save farm | Card buttons now use existing authenticated saved-listing API | Existing user-scoped save/delete | Anonymous card action checked | Authenticated save/delete blocked by development OTP setup |
| OTP, sessions, profile | Existing OTP flow; malformed input handling, locale redirects, refresh propagation and BFF refresh fixed | Existing auth APIs, HttpOnly cookies | Sign-in EN/AR, guest redirects, malformed OTP payloads | Real login, profile completion, rotation and logout not executed without a configured test account |
| My Farms, facilities, media, listing requests | Existing forms preserved; async reset crash and edit-role UI fixed | Existing farm, facility, upload and listing APIs | Guest protection; backend isolated HTTP suite | Authenticated create/edit/upload/submit not live-tested; listing draft recovery/changes-requested editing is incomplete |
| Management and professional verification | Existing owner request and professional workflows | Existing private request/profile/capability/verification APIs | Guest protection; backend isolated HTTP suite | No public management discovery/application API; capability expertise/service-area editing not exposed by current UI |
| Partnerships and applications | Existing private owner/applicant flows | Existing request/application/document APIs | Guest protection; backend isolated HTTP suite | Public discovery absent; application needs a known eligible parent request; extra detail fields are not returned for reliable form rehydration |
| Purchase proposals | Corrected create payloads; co-purchase edit supported; fail closed when sale terms unavailable | Cash, installment, exchange, mixed, co-purchase contracts | Guest protection; all proposal rules covered by backend HTTP suite | Authenticated website submissions/edits not live-tested; grouped edit restriction remains backend-enforced |
| Mediated messaging and farm details inquiries | Existing user-scoped endpoints preserved | Existing case/message and inquiry APIs | Guest protection; backend isolated HTTP suite | Live conversation needs an eligible request and assigned case agent; message history currently limited to first 100 |
| Documents | Existing private request upload/download BFF; upload reset fixed | Per-request only | Anonymous download denied; backend permission tests | No user-wide catalog API; website request document listing/download UI incomplete |
| Notifications | Existing informational page | No website API | Private route protected | Notification list, unread state, read actions and delivery unsupported |
| Website ↔ Backend ↔ Dashboard | Dashboard default API corrected to 4001 | Same backend; staff endpoints remain separate | Backend staff/user HTTP tests only | No configured staff browser account; real staff assignment, decisions and publication not exercised |
| EN/AR, RTL, responsiveness, SEO | Existing layout preserved; Arabic farm type labels and portal noindex fixed | Public data remains in its supplied language | EN/AR desktop/tablet/mobile, metadata and width checks | No canonical/hreflang/sitemap implementation; public account navbar does not receive the current session; broader portal copy still contains raw enum/date text |

## Confirmed fixes

- Correct API assertion-script and Dashboard defaults to port 4001.
- Render real published homepage farms and database totals without fallback sample farms.
- Build valid cash, installment, exchange, mixed and co-purchase proposal payloads; respect fetched terms and handle unavailable terms.
- Support editing nonbinding co-purchase share/cash components through the existing PATCH contract.
- Use authenticated saved-listing actions on real homepage/marketplace cards.
- Refresh expired website sessions in BFF handlers; forward rotated cookies into the current server-component request.
- Avoid duplicate locale prefixes after OTP verification/profile completion by using the native router for already-localized return paths.
- Return 400 for malformed OTP JSON/types; show translated authentication network errors.
- Keep form elements before awaits so successful facility/media/document uploads can reset safely.
- Disable farm edits for contextual roles other than owner/manager; backend remains authoritative.
- Load subsequent API pages on mobile while retaining previously shown farms.
- Use live drawer terminology and avoid reporting an old count for unapplied filter drafts.
- Route existing list-farm/management CTAs to implemented portal pages; sample management cards lead to the informational marketplace.
- Label homepage management/statistics/testimonial examples clearly, preserve unknown publication dates, and mark private portal pages noindex.

## Verification

- `node web/scripts/assert-farmexit-api.mjs`: passed against port 4001.
- Backend `npm run test:e2e -- --runInBand`: **23 suites, 252 tests passed**. These use the existing in-memory Prisma fixture, not the development database. Deliberate storage/database failure logs are expected test cases.
- Backend focused score/query/offer-values/OTP unit checks: **5 suites, 21 tests passed**.
- Website `npm run typecheck` and `npm run lint`: passed. Dashboard `npm run typecheck` and `npm run lint`: passed. `git diff --check`: passed.
- Website production build: passed inside the expanded Playwright run (its configured web server builds before starting). The existing multiple-lockfile workspace-root warning remains.
- First complete website Playwright run: **147 passed, 5 skipped**. Skips: authenticated test across four projects (only desktop EN eligible; no fixed OTP account), and the mobile-hidden homepage filter toolbar.
- Expanded website Playwright run: **167 passed, 6 failed, 9 skipped**. The six failures were a test locator assuming unique farm names; existing rental listings have duplicate names. The locator now verifies ordered names and unique listing slugs. Both EN/AR mobile cross-page load-more tests passed. Skips: four authenticated copies, four non-mobile copies of the mobile-only test, and one mobile-hidden toolbar test.
- Corrected rental tests (`npm run test:e2e -- --last-failed --workers=2`): **6 passed, 0 failed**, across EN/AR desktop/tablet/mobile, against another successful production build. Combined verification covers **173 passing tests and 9 explicit skips**; no unresolved test failures remain. This is a full run plus a focused rerun, not a claim of a single all-green full run.

Initial compiler-cache access, proposal parsing, test-discovery, lint and test-type errors were corrected before the passing checks above. No failed check is being treated as a pass.

## Safe authenticated browser testing

`tests/e2e/phase10-authenticated.spec.ts` only runs once, for desktop EN, with an explicitly selected test mobile and the existing backend development-only fixed OTP configuration. It reads the allowlist/code privately from `api/.env`, requires `NODE_ENV=development` and `DEV_FIXED_OTP_ENABLED=true`, uses real OTP endpoints and saves no storage-state file. Trace, screenshot and video capture are disabled. It never enables OTP configuration or bypasses authentication. This environment has no configured fixed OTP allowlist/code and no selected test mobile, so the test is skipped.

The test checks cookies, private portal reads, refresh and logout. New-user profile completion is deliberately skipped to preserve the account; business writes and staff changes need dedicated fixtures/accounts. Existing backend HTTP tests cover those business/authorization rules in isolation. This is not equivalent to live authenticated browser verification.

## Phase 10 modified files

Pre-existing changes outside this list are not attributed to Phase 10.

- `dashboard/.env.example`, `dashboard/src/lib/api/config.ts`
- `web/scripts/assert-farmexit-api.mjs`, `web/docs/PHASE8_API_MAPPING.md`, this report
- `web/playwright.config.ts`, `web/tests/e2e/home.spec.ts`, `web/tests/e2e/phase10-integration.spec.ts`, `web/tests/e2e/phase10-authenticated.spec.ts`
- `web/messages/{en,ar}/home.json`, `web/messages/{en,ar}/marketplace.json`
- `web/src/components/layout/site-links.ts`, `web/src/app/[locale]/my/layout.tsx`
- `web/src/features/home/{FeaturedFarms,ManagementSection,MarketInsights,Testimonials}.tsx`, `web/src/features/home/data.ts`
- `web/src/features/farms/{FarmCard,MarketplaceFarmCard}.tsx`, `web/src/features/farm-details/saved-farm.tsx`
- `web/src/features/marketplace/{MarketplaceResults.tsx,use-marketplace-listings.ts}`
- `web/src/features/auth/{SignInForm,ProfileForm}.tsx`
- `web/src/features/my-farms/{AddFarmForm,FarmWorkspace,FarmFacilitiesPanel,FarmMediaPanel}.tsx`
- `web/src/features/my-professional/VerificationRequestDetail.tsx`, `web/src/features/my-applications/PartnershipApplicationDetail.tsx`
- `web/src/features/my-proposals/{NewPurchaseProposalForm,ProposalDetail}.tsx`
- `web/src/lib/api/bff-auth.ts`, `web/src/lib/auth/{session-middleware,session.server,refresh-tokens}.ts`, `web/src/lib/data/public-farm-details.ts`
- `web/src/app/api/auth/{me,logout,otp/request,otp/verify,profile/complete}/route.ts`
- `web/next-env.d.ts`: regenerated by Next.js to point to production route types.

## Critical blockers

1. A dedicated configured development OTP account is unavailable; authenticated website write workflows cannot honestly be signed off.
2. No staff browser session/fixtures are available for real Dashboard review, assignments, document approval/relay or publication.
3. Public management/partnership discovery, a user-wide document catalog and website notifications have no approved APIs. They remain gaps rather than invented workflows.

The audit and safe fixes are delivered with these explicit verification limits. Full authenticated Phase 10 sign-off remains blocked.
