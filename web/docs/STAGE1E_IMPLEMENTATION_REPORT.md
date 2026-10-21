# Stage 1E — Quick Sale, exchange assets and Marketplace filtering

Base: `main`, `6e37293` (Phase 8 checkpoint). Implemented the approved contract without changing database fields, running migrations, resets or seeds, publishing listings, or changing existing customer/demo records. No commit or push. Phase 9 was not started.

## Existing versus required contracts

| Input                            | Existing persistence                                                            | Implemented projection / filtering                                                                | Buyer validation                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Normal / Quick Sale              | `FarmSaleTerms.saleMode` → `farm_sale_terms.sale_mode`                          | Optional public `saleEligibility`, sourced only from stored terms of published public listings    | Existing proposal kinds retained; no new combined-installment/exchange kind                                |
| Cash eligibility                 | `acceptsCashProposals`                                                          | Public eligibility flag; not a new search checkbox                                                | Cash, Mixed and Co-purchase require cash eligibility                                                       |
| Installment eligibility          | `acceptsInstallmentProposals`                                                   | `saleMethods=installment`                                                                         | Installment proposals require this flag; existing count/interval contract retained                         |
| Exchange eligibility             | `acceptsExchangeProposals`                                                      | `saleMethods=exchange`; also required by every asset filter                                       | Exchange and Mixed require this flag                                                                       |
| Owner-accepted asset categories  | `FarmExchangePreference.assetType`, keyed by listing; `exchangePreferenceScope` | `exchangeAssetTypes=factory,villa,apartment,car`; public eligibility contains category names only | Offered asset must be owner-accepted; legacy explicit `any` retains its prior meaning                      |
| Buyer's offered asset / estimate | `FarmPurchaseProposalComponent.assetType`, `proposedValue`, currency `EGP`      | Remains private; not used as owner preferences or Marketplace filter data                         | Existing enum and positive whole-EGP validation; original submitted values remain in private detail/edit   |
| Co-purchase interest             | Existing proposal kind and `requestedSharePercent`                              | No new filter, publication or ownership model                                                     | Cash eligibility required even without an optional cash component; existing percentage validation retained |

The existing schema was sufficient. `schema.prisma` has a **comment-only** correction describing the new write rules; no field, enum, index or relation changed.

The owner backend GET/PUT endpoints already existed. Added their authenticated BFF integration at `/api/listing-requests/[id]/sale-terms`. Existing Marketplace BFF forwarding carries the approved query parameters unchanged.

## New owner write rules

| Configuration                  | Cash | Installments | Exchange | Active exchange assets         |
| ------------------------------ | ---- | ------------ | -------- | ------------------------------ |
| Normal Sale                    | Yes  | No           | No       | None                           |
| Quick: Installments Only       | No   | Yes          | No       | None                           |
| Quick: Exchange Only           | No   | No           | Yes      | At least one selected category |
| Quick: Installments + Exchange | No   | Yes          | Yes      | At least one selected category |

- The three Quick Sale configurations are radio choices. Factory, Villa, Apartment and Car are actual checkboxes supporting multiple selections.
- New Quick Sale writes reject cash, an unspecified mechanism, empty exchange selections, duplicate/unsupported categories and active exchange assets on installments-only terms.
- Save/Continue/Save & exit use the real listing ID and sale-terms API. The wizard confirms the returned values before reporting success. Invalid sale terms return the user to the sale step with localized feedback. Network failures retain entered values.
- Owner resume loads stored terms. Unconfigured existing listings show an unknown/unselected state; untouched terms are not written. Owner tracking displays the stored flags/categories read-only.
- Existing Quick Sale cash flags and `any` scope are read as stored, without invoking the new-write resolver. An explicit legacy-edit action lets the owner adopt the new rules. Editing unrelated farm/listing fields does not rewrite terms.
- Switching to installments-only sends no active exchange assets; the existing transactional preference replacement removes them. Within the open editor, prior choices can be remembered for an explicit re-enable. After reload, only saved active values are restored.
- Owner permissions and moderation states are unchanged. A transaction now acquires the listing write lock and rechecks editable status before replacing terms, preventing a concurrent submission/publication from bypassing the draft restriction.

## Public filtering and privacy

Approved parameters:

```text
saleMethods=installment,exchange
exchangeAssetTypes=factory,villa,apartment,car
```

**OR within each group; AND between groups**, then AND with the existing search, listing type, location, area and price constraints. Existing pagination and sorting use the same filtered database predicate.

- An asset-only query works without `saleMethods` and always requires exchange eligibility.
- Selecting Installments plus Car matches listings accepting both installments and an eligible car exchange. Selecting Installments and Exchange together matches either method, subject to any additional asset group.
- Multiple assets match any selected accepted category, not all categories simultaneously.
- Explicit legacy `exchangePreferenceScope=any` continues to mean any supported category; no specific preference rows are invented. Missing terms do not match method/asset filters and project `saleEligibility: null`.
- Rent, private, unpublished and deleted-farm listings cannot match these sale-eligibility predicates.
- URL state, API serialization and filter controls use the approved parameters; the actual Prisma query filters public rows. No mock frontend array is used for production filtering.
- Public output adds only sale mode, eligibility booleans, scope and accepted asset categories. Exact pins, owner contacts, documents, access details and private notes remain excluded. FarmExit Score behavior is unchanged.

The pre-existing authenticated sale-terms endpoint's missing-row cash fallback remains unchanged (`configured: false`); the new anonymous projection does not convert that fallback into a stored or owner-confirmed preference.

## Buyer proposals and Farm Details

- Installments and exchange remain independent choices when both are accepted.
- Mixed still means **cash plus exchange** and requires both eligibility flags. Non-cash Quick Sale does not enable Mixed or Co-purchase.
- Server-side validation enforces these restrictions, including forged requests. Existing positive whole-EGP monetary limits and installment validations remain intact.
- Creation offers only accepted categories. Private proposal GET optionally includes current eligibility only when its parent is still a public published sale listing. Editing restricts categories accordingly and preserves the buyer's submitted type/value. If current eligibility is unavailable or no longer permits that proposal kind, the proposal remains readable with an explanation and editing is unavailable.
- A publication-state race cannot make the buyer's existing private proposal disappear: unavailable parent eligibility becomes `null`, rather than discarding the proposal read.
- Farm Details keeps its existing layout and CTA design; eligibility gates the existing proposal entry. Missing legacy projections continue through the existing authenticated terms check.
- Removed verified duplicate borders on shared proposal selects. No global CSS or shared tokens changed.
- Offers remain nonbinding and FarmExit-mediated. No payment, direct contact, ownership transfer, automatic acceptance or deal closure was added.

## Verification

| Check                                                                  | Result                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend typecheck, lint/direction/message checks and production build | Passed                                                                                                                                                                                                                                                         |
| API production build; lint of changed API files                        | Passed                                                                                                                                                                                                                                                         |
| Targeted API regressions                                               | 20 suites, 144 tests passed                                                                                                                                                                                                                                    |
| Stage 1E browser tests                                                 | 9 passed: choices, persistence/reload, legacy behavior, buyer categories/value/edit, query serialization, EN/AR at 1440/1024/390                                                                                                                               |
| Add Farm/map/uploads/layout regressions                                | 31 passed, 1 skipped: dedicated live geolocation case requires its separate `GEO_OWNER_TOKEN` / `GEO_FARM_ID`                                                                                                                                                  |
| Stage 1D management/professional/session/navbar regressions            | 14 passed                                                                                                                                                                                                                                                      |
| Phase 8 partnership/application/proposal regressions                   | 10 passed                                                                                                                                                                                                                                                      |
| Production authentication regressions                                  | 25 passed, 5 intentional duplicate modal-navigation skips                                                                                                                                                                                                      |
| Real MySQL owner workflow                                              | Four dedicated cases: Normal Sale and all three Quick configurations saved and reloaded; all four assets/multiple selections, switching/cleanup, invalid payloads and wrong-user denial checked; three Quick cases submitted and remained private under review |
| Real browser → BFF → API 4001 → MySQL                                  | Owner selected both mechanisms and Factory/Car, saved, reloaded and restored identical values. Six production owner screenshots captured. Test sessions revoked afterward                                                                                      |
| Anonymous BFF GET and PUT                                              | Both returned 401 before API/database access                                                                                                                                                                                                                   |
| Read-only public API queries                                           | Installment query returned 11 real public matches, checked against projected eligibility. Exchange/asset/combined queries returned 200 with zero matching public rows in the current data                                                                      |
| Full API typecheck                                                     | 27 existing diagnostics in untouched admin/bootstrap/credential/fake-Prisma test files; no Stage 1E diagnostic                                                                                                                                                 |
| Full API lint                                                          | 17 existing errors in untouched seed/admin/auth test/fake-Prisma files; changed API files lint clean                                                                                                                                                           |

**Live positive exchange/purchase proposal verification is skipped:** no approved published test listing was supplied. No synthetic listing was published, and no proposal was submitted against existing customer/demo listings. Buyer value/reload/edit and eligibility paths are covered by isolated browser/service tests; live MySQL purchase-component persistence and the complete approved-publication-to-purchase sequence remain unverified for Stage 1E.

Evidence:

- [Private MySQL owner checks](../artifacts/stage1e/mysql-results.json)
- [Real BFF checks](../artifacts/stage1e/bff-results.json) and [persisted browser-edited terms](../artifacts/stage1e/browser-mysql.json)
- [Anonymous access checks](../artifacts/stage1e/bff-anonymous.json)
- [Read-only public query results](../artifacts/stage1e/public-query-results.json)
- [Browser tests](../artifacts/stage1e/browser-tests.log), [API regressions](../artifacts/stage1e/api-regression.log), [API typecheck](../artifacts/stage1e/api-typecheck.log), [full API lint](../artifacts/stage1e/api-full-lint.log)

## Visual comparisons

[Open the comparison viewer](../artifacts/stage1e/comparison.html): local Add Farm EN/AR reference, production owner wizard, isolated filter controls and buyer form at each viewport.

- [Six production owner captures](../artifacts/stage1e/live-screenshots/)
- [Twelve owner/filter and buyer captures](../artifacts/stage1e/screenshots/)
- Existing Phase 6 Add Farm sale-step and Arabic references plus Phase 8 Farm Details CTA references were used locally. No Figma MCP calls.

Desktop retained the wizard's three columns; tablet/mobile and RTL use the existing layout. No horizontal overflow was observed in the checks. The new approved controls add height to the sale step. Detailed new Marketplace-filter and purchase-form exports are absent, so those controls reuse existing components; pixel-exact parity is not claimed. Fixture-only helper buttons/output are not production UI.

## Exact affected files

- `api/prisma/schema.prisma` — comment only
- `api/src/modules/offers/{offer-values.ts,offer-values.spec.ts,stage1e.spec.ts,sale-terms.service.ts,offers.controller.ts,purchase-proposals.service.ts,dto/offers.dto.ts}`
- `api/src/modules/marketplace/{marketplace-query.ts,dto/marketplace-query.dto.ts,dto/public-listing.dto.ts}`
- `api/src/modules/listing-requests/public-listing-contract.ts`
- `web/src/app/api/listing-requests/[id]/sale-terms/route.ts`
- `web/src/features/my-farms/{SaleTermsEditor.tsx,AddFarmWizard.tsx,ListingTracking.tsx}`
- `web/src/features/marketplace/{FilterPanel.tsx,url-state.ts}`
- `web/src/lib/{api/public-listing.ts,data/marketplace.ts,data/marketplace-api.ts}`
- `web/src/features/farm-details/FarmDetailsView.tsx` — eligibility gate only
- `web/src/features/my-proposals/{NewPurchaseProposalForm.tsx,ProposalDetail.tsx}`
- `web/tests/visual/{phase6-fixtures.ts,stage1e.config.ts,stage1e.spec.ts,app/[locale]/stage1e/page.tsx,app/[locale]/stage1e/fixture.tsx}`
- `web/docs/PHASE8_API_MAPPING.md` — records the approved Stage 1E contract update while retaining legacy behavior
- This report; ignored verification tools/screenshots under `web/artifacts/stage1e/`.

No Dashboard, authentication/session implementation, navigation, Leaflet implementation, upload implementation, global CSS or design tokens changed. API port 4001 was used; port 4000 was not touched. No further business approval or database migration is needed for the implementation. A permitted published test listing is needed only for the outstanding live positive purchase verification.
