# Website marketplaces and bilingual content — Batch 3

Date: 2026-10-28. Scope: Website, canonical root dashboard farm editor, supporting API contracts and an unapplied migration proposal. No commit, push, deployment, production write, seed, service restart or port 4000 operation was performed.

Evidence labels: **LIVE BROWSER VERIFIED** means the local application in a real browser; **LIVE API VERIFIED** means read-only HTTP requests to the currently deployed public API; **TESTED** means automated tests with explicit scope; **CODE VERIFIED** means source inspection; **BLOCKED** and **NOT TESTED** identify remaining gaps. Local browser evidence is not proof that these changes are deployed.

## 1. Homepage data source audit

| Section | Previous issue / resulting source |
| --- | --- |
| Hero | Marketing copy remains localized brand copy; optional published editorial overrides. Proof figures now use API aggregates, with unavailable state instead of invented numbers. |
| About | Brand narrative/images remain static; published editorial overrides title/lead. Real aggregate farms/governorates; removed fabricated review turnaround. |
| Marketplace journeys | Static navigation and explanatory brand content, not business records. |
| Featured farms | Existing approved/public listing API and FarmCard, six sale/rent listings per view. Aggregate supplies initial data; additional selections use real API requests. |
| Management | Static role explanation plus actual eligible published management requests; no fabricated applicant counts. |
| How it works | Static localized process explanation. |
| Price insights | Governorate averages from eligible published asking prices; sale price per feddan and annual rent per feddan explicitly described as asking prices, not completed transactions or valuations. |
| Testimonials | Only published CMS entries with explicit authorization flag; absent content hides this section. No invented customer endorsements. |
| CTA/footer | Static localized navigation/brand content. |

**CODE VERIFIED.** Composition and existing section order retained. Partnership records are included in the aggregate; no extra homepage section was invented.

## 2. Dynamic homepage changes

New public GET /marketplace/home/:locale aggregates real listings, opportunities, metrics and published editorial. New Super Admin dashboard-audience endpoints GET /staff/admin/homepage/:locale, PUT /:locale/draft and POST /:locale/publish keep editorial drafts separate from publication. This is a minimal API content-management capability; a dedicated editorial dashboard screen is not included.

Website server fetches use no-store, a ten-second timeout and React request deduplication. There is no cross-request homepage cache to invalidate: the next request after eligible publication reads the current database. Database errors propagate to an explicit unavailable presentation; they are not converted into a successful zero-record response.

## 3. Metrics and actual data verification

**TESTED:** aggregation tests verify unique farm/feddan counting across sale and rent, listing totals, opportunity totals and arithmetic asking-price averages. Aggregates use existing publication eligibility predicates. No private owner contact, applications, documents or unpublished farms are returned.

**LIVE API VERIFIED:** current deployed /marketplace/farms?pageSize=1 returns HTTP 200 and total 60; management returns HTTP 200 and 25 opportunities. Existing production records include visibly marked [DEMO] names. Those records were already present; this work created no production demo data.

**BLOCKED:** the deployed /marketplace/home/en returns 404. Therefore the new aggregate cannot be compared against a live database through this endpoint yet. No claim is made that a newly published record refreshed the homepage in an authenticated end-to-end test.

## 4. Quick Sale implementation and semantics

Fourth hero tab, English/Arabic labels and real activity/location controls. URL state carries quickSale=true alongside other criteria. API applies saleTerms.saleMode=quickSale independently from installment/exchange criteria: Quick Sale AND (selected allowed payment alternatives). It does not infer quick sale from payment flags. Rent rejects incompatible sale conditions. Search and pagination preserve filters; changing filters resets page one.

**TESTED:** query predicates and frontend URL/API mapping. **LIVE BROWSER VERIFIED:** selected tab and submitted URL retain quickSale, activity and governorate at desktop/mobile. **BLOCKED:** deployed API returns HTTP 400 for quickSale=true; result-set verification requires the compatible backend deployment.

## 5. Bilingual data architecture

Optional localizedContent JSON contains en/ar objects of authored fields. Farm, listing details, management details and partnership details each own their translations. Shared IDs, enums, measurements, money, status and ownership remain single-source values. Nested DTO validation restricts fields and lengths; updates merge language objects to preserve the other language. Public mappers explicitly whitelist translated public fields, preventing localized private text from bypassing public DTO privacy.

Migration proposal: api/prisma/migrations/20261028140000_bilingual_public_content/migration.sql. Adds four nullable JSON columns and homepage_content. **NOT APPLIED** to any existing database. Prisma client was regenerated locally from the proposed schema. Schema/client/application must be released together following separate migration approval.

## 6. Website farm wizard

Existing seven-step workflow retained. English/Arabic authored fields have language controls, direction, completion counts and legacy hints. Farm name/activity/description and additional free text are preserved in draft payloads; listing description has independent bilingual content. Shared factual inputs and existing draft/publication/ownership checks remain in place. Owner farm editing, management request text and partnership owner text carry the optional translation payload too.

**LIVE BROWSER VERIFIED:** existing environment-guarded visual fixture shows EN/AR wizard layouts and retains both unsaved language values when switching. The fixture intercepts requests and never saves. **NOT TESTED:** authenticated database persistence and reload, submission, or publication. These require an isolated writable database.

## 7. Dashboard V2 farm editor

Only canonical dashboard/src/features/admin/farms/FarmWizard.tsx and its localized type were changed. Farm editor toggles EN/AR, keeps both language states, sends localizedContent through existing save actions and maintains compatible legacy fields. Existing role gates, confirmation and farm ownership behavior are preserved. No unrelated dashboard module changed.

**TESTED:** Dashboard typecheck, lint, existing guard checks and 31 unit tests. **NOT TESTED:** authenticated editor save/reload against the new schema.

## 8. Legacy bilingual handling

Read priority: requested authored language, existing legacy field, opposite authored language, then empty. No translation service or guessed translations. Existing single-language records continue to render. Controlled enum labels use maintained EN/AR dictionaries; unknown authored strings retain their original text. Partial PATCH merges preserve untouched languages.

**TESTED:** fallback, language merging, nested mass-assignment rejection and public translation privacy whitelist.

## 9. Restored farms filters

Farm type/activity, water source, irrigation method, energy source and crop types use existing schema fields/relations. They are validated and included in the database WHERE before count, sort and pagination. Existing location, area, price and payment filters remain composable. Removed disabled unsupported-filter presentations for newly supported fields. Search ranges allow valid low prices/small areas rather than silently imposing the former five-million/ten-feddan minimums.

**TESTED:** SQL predicate construction and URL round-trip. **BLOCKED:** deployed API rejects new agricultural parameters with HTTP 400. No live cross-page result-set claim for the new fields.

## 10. Shared marketplace filter system

Management and partnership share OpportunityMarketplace, FilterSidebar, farm-filter section controls, range slider, sorting/pagination behavior and mobile dialog. Full-dataset published facets are computed server-side, never from the visible page alone. JSON multi-value matching uses exact array membership, not substring matching.

For the older deployed public opportunity response without filterOptions, a read-only compatibility loader reads all public pages at the confirmed maximum pageSize=50 and derives facets from actual records. This fallback is potentially expensive; compatible backend facets remove that extra work. Authentication is not bypassed.

## 11. Management redesign

Reference 06-management-reference.png is authoritative; 05 is a rejected current-state screenshot. New image-led cards, dark request badge, gold management-needed panel, real area/activity/experience, reviewed badge and strong green CTA. Shared sidebar, clean spacing, mediation banner and responsive columns follow the approved hierarchy. View opportunity opens the existing detail drawer; no fake application-sent state or direct owner contact was added.

## 12. Partnership redesign

Reference 08-partnership-reference.png is authoritative; 07 is rejected current state. Hero uses readable white labeled controls. Cards prioritize the partnership objective and partner type in a gold panel, followed by actual farm details and the existing detail/application route. Owner CTA and three-step review explanation retain mediated contact and review-before-publication semantics.

Both markets reuse existing local approved imagery as **illustrative**. Images are not represented as photographs of the particular farm. No paid image or AI service used. Existing live [DEMO] farm names remain visible as actual source data.

## 13. API / DTO / schema changes and privacy

New aggregate/editorial controllers and services; optional nested localized DTOs; owner/staff persistence with language merge; public whitelisted translation mapping; agricultural query fields; complete public facets; finite numeric range validation; exact JSON membership. Existing approved/reviewed/published predicates remain the authority. Approval does not automatically publish. Owner contact, precise location, documents, applications and private text remain excluded. Super Admin editorial endpoints require dashboard audience and staff role.

**TESTED:** focused publication/privacy/query suites. **NOT TESTED:** controller startup and authenticated integration against the proposed database, since isolated database initialization was denied.

## 14. Screenshots and visual comparison

Evidence directory: web/artifacts/website-batch3/ (local ignored artifacts). Script: web/scripts/verify-website-batch3.mjs. Matrix: EN/AR at 1440, 1024, 768 and 390 for homepage, farms, management and partnerships. Additional files capture Quick Sale, mobile filters, card viewports and EN/AR visual-fixture wizard.

References: docs/design-references/website-batch-3/. These user-provided assets were inspected, not modified. Visual comparison confirms the intended image/header/panel/button hierarchy and responsive sidebar-to-drawer behavior; live record lengths and missing authored translations naturally differ from the sample reference. Homepage captures show explicit aggregate-unavailable state with the current older API, so they are not proof of the completed dynamic-data presentation. No pixel-perfect equivalence or authenticated wizard completion claim.

## 15. Tests and builds

- API: production-config typecheck (tsconfig.build.json), Nest production build and local Prisma generation passed.
- API: six focused suites / 27 tests passed (batch-three, homepage.service, marketplace-query, public-opportunity-query, public-farm-score, listing-publication-authorization).
- Dashboard: typecheck/lint/guards and 31 tests passed.
- Website: typecheck passed; final lint passed without warnings; ten existing unit tests and three new marketplace/localization tests passed.
- Final browser/build results are recorded in the verification addendum below. Broad backend typecheck/lint retain the separately documented pre-existing module/toolchain issues; this report does not claim those broad gates are clean.

Commands run from each package: npm run typecheck; npm run lint; npm run build. API production check: npm exec -- tsc --noEmit --incremental false -p tsconfig.build.json. API focused tests: npm run test -- --config jest-publication.json --runInBand --testPathPatterns='batch-three|homepage.service|marketplace-query|public-opportunity-query|public-farm-score|listing-publication-authorization'. New frontend tests use the installed dashboard tsx loader without installing dependencies. Browser capture: node scripts/verify-website-batch3.mjs in web.

## 16. Production / Vercel implications

**NO-GO for production rollout in this task.** Review/approve the additive migration and backup/rollback strategy, test on an isolated database, deploy the compatible API/schema/client first, then Website/dashboard. Do not deploy only the frontend against the current API: homepage aggregate and new filters are incompatible. Existing production adapter readiness blockers in FARMEXIT_PRODUCTION_BACKEND_DEPLOYMENT_PLAN.md still apply.

Next.js 16.4.0 build emits a security advisory/checkpoint in this environment; assess the recommended patched release separately before production. No dependency versions or lockfiles were upgraded here. Application environment files, production uploads and existing database contents were not overwritten. Editorial content requires real authorized input; its presence is not a release prerequisite for hiding unavailable testimonials.

## 17. Remaining blockers / acceptance work

**BLOCKED:** local MySQL account cannot CREATE DATABASE (ER_DBACCESS_DENIED_ERROR). The isolated harness stops before any test tables/records are created; it never migrates or seeds the existing database. User was asked to provide an empty isolated local test schema with suitable privileges, without sending credentials.

**NOT TESTED:** farm create/save/reload in both languages; Dashboard save/reload; listing publish then homepage refresh; database aggregate reconciliation; true Quick Sale/payment combinations and agricultural cross-pagination results; authenticated application submission; CMS draft/publish authorization integration. All require the approved schema in a safe isolated environment. Source/unit/browser evidence does not substitute for those checks.

**LIVE API VERIFIED:** current backend lacks aggregate/new filter support (404/400). This is observed contract drift, not an authorization failure or evidence that every existing API route is absent. Do not alter production to clear this blocker during this task.

## 18. Files changed

The exact source inventory is appended below from git diff plus untracked implementation files. User reference images are excluded from that generated inventory; existing unrelated work is not committed or pushed. Proposed SQL and test harness are reviewable source artifacts, not executed production deployment steps.
- `api/prisma/migrations/20261028140000_bilingual_public_content/migration.sql`
- `api/prisma/schema.prisma`
- `api/scripts/website-batch3-isolated.cjs`
- `api/src/common/dto/localized-content.dto.ts`
- `api/src/common/localized-content.ts`
- `api/src/modules/farm-management-requests/dto/farm-management-request.dto.ts`
- `api/src/modules/farm-management-requests/farm-management-requests.service.ts`
- `api/src/modules/farms/dto/create-farm.dto.ts`
- `api/src/modules/farms/dto/farm-response.dto.ts`
- `api/src/modules/farms/dto/update-farm.dto.ts`
- `api/src/modules/farms/farms.service.ts`
- `api/src/modules/listing-requests/dto/listing-request.dto.ts`
- `api/src/modules/listing-requests/listing-requests.service.ts`
- `api/src/modules/listing-requests/public-listing-contract.ts`
- `api/src/modules/marketplace/batch-three.spec.ts`
- `api/src/modules/marketplace/dto/marketplace-query.dto.ts`
- `api/src/modules/marketplace/dto/public-listing.dto.ts`
- `api/src/modules/marketplace/dto/public-opportunity.dto.ts`
- `api/src/modules/marketplace/dto/public-opportunity-query.dto.ts`
- `api/src/modules/marketplace/homepage.controller.ts`
- `api/src/modules/marketplace/homepage.service.spec.ts`
- `api/src/modules/marketplace/homepage.service.ts`
- `api/src/modules/marketplace/marketplace.module.ts`
- `api/src/modules/marketplace/marketplace-query.ts`
- `api/src/modules/marketplace/public-localized-content.ts`
- `api/src/modules/marketplace/public-opportunity-map.ts`
- `api/src/modules/marketplace/public-opportunity-query.ts`
- `api/src/modules/partnership-requests/dto/partnership-request.dto.ts`
- `api/src/modules/partnership-requests/partnership-requests.service.ts`
- `dashboard/src/features/admin/farms/FarmWizard.tsx`
- `dashboard/src/lib/content/localized.ts`
- `web/messages/ar/home.json`
- `web/messages/en/home.json`
- `web/scripts/verify-website-batch3.mjs`
- `web/src/app/[locale]/management/page.tsx`
- `web/src/app/[locale]/page.tsx`
- `web/src/app/[locale]/partnerships/opportunities/[id]/page.tsx`
- `web/src/app/[locale]/partnerships/page.tsx`
- `web/src/components/content/BilingualFields.tsx`
- `web/src/features/home/AboutSection.tsx`
- `web/src/features/home/FeaturedFarms.tsx`
- `web/src/features/home/HeroSearch.tsx`
- `web/src/features/home/home-data.ts`
- `web/src/features/home/HomeHero.tsx`
- `web/src/features/home/ManagementSection.tsx`
- `web/src/features/home/MarketInsights.tsx`
- `web/src/features/home/Testimonials.tsx`
- `web/src/features/management/RequestCard.tsx`
- `web/src/features/marketplace/batch-three.test.ts`
- `web/src/features/marketplace/FilterPanel.tsx`
- `web/src/features/marketplace/MarketplaceSearch.tsx`
- `web/src/features/marketplace/url-state.ts`
- `web/src/features/my-farms/AddFarmWizard.tsx`
- `web/src/features/my-farms/FarmWorkspace.tsx`
- `web/src/features/my-farms/types.ts`
- `web/src/features/my-management/ManagementRequestDetail.tsx`
- `web/src/features/my-management/ManagementWizard.tsx`
- `web/src/features/opportunity-marketplace/FilterSidebar.tsx`
- `web/src/features/opportunity-marketplace/ManagementDetailDrawer.tsx`
- `web/src/features/opportunity-marketplace/ManagementMarketplace.tsx`
- `web/src/features/opportunity-marketplace/opportunity-marketplace.css`
- `web/src/features/opportunity-marketplace/OpportunityMarketplace.tsx`
- `web/src/features/opportunity-marketplace/option-labels.ts`
- `web/src/features/opportunity-marketplace/PartnershipHeroSearch.tsx`
- `web/src/features/opportunity-marketplace/PartnershipMarketplace.tsx`
- `web/src/features/opportunity-marketplace/shared.tsx`
- `web/src/features/phase8/PartnershipWizard.tsx`
- `web/src/features/search/SearchBar.tsx`
- `web/src/features/search/SearchRange.tsx`
- `web/src/lib/api/public-listing.ts`
- `web/src/lib/content/localized.ts`
- `web/src/lib/data/load-farm-marketplace.ts`
- `web/src/lib/data/marketplace.ts`
- `web/src/lib/data/marketplace-api.ts`
- `web/src/lib/data/public-farm-details.ts`
- `web/src/lib/opportunities/public-opportunity.ts`


## Final verification addendum

**TESTED:** Website production build exited 0: compilation, TypeScript and all 144 generated pages completed. The earlier security checkpoint no longer blocked this final build; the dependency security assessment remains a separate production prerequisite.

**LIVE BROWSER VERIFIED:** final capture exited 0 with 32 screens, 12 interactions, zero reported failures, zero horizontal-overflow detections and no captured page errors. Both languages and four widths were checked. Quick Sale URL submission, native mobile filter open/Escape-close and unsaved wizard language retention passed. These are local browser checks with actual public API reads, except the clearly labeled wizard visual fixture. The script blocks business write requests.

Raw results: [results.json](../web/artifacts/website-batch3/results.json). Representative screenshots: [management desktop cards](../web/artifacts/website-batch3/en-1440-management-cards.png), [partnership desktop cards](../web/artifacts/website-batch3/en-1440-partnerships-cards.png), [Arabic mobile partnership](../web/artifacts/website-batch3/ar-390-partnerships.png), [mobile filter drawer](../web/artifacts/website-batch3/ar-390-management-filter-drawer.png), [Quick Sale](../web/artifacts/website-batch3/en-1440-quick-sale.png), [English wizard](../web/artifacts/website-batch3/en-1440-wizard-ar-content.png), [Arabic wizard](../web/artifacts/website-batch3/ar-390-wizard-ar-content.png). Artifacts remain local and ignored by Git.

Verdict: independently implementable source work and read-only verification completed; production deployment and authenticated database acceptance are **NO-GO / BLOCKED** pending the specific prerequisites above. No commit or push was made.
