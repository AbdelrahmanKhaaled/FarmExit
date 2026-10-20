# Phase 5–6 UI fixes

Local Phase 5/6 PDFs and the existing style guidelines were used. No Figma MCP calls, backend changes, seeds, commits or pushes. No DOCX references were found in the repository.

## Visual corrections

- Wizard: explicit row/column placement protects the desktop sidebar / form / information-card arrangement. Desktop measurements are **296 / 656 / 264px**, with 48px gaps and 64px outer margins at 1440px. Tablet uses form + information cards; mobile uses the form and compact step navigation.
- Back/Continue now follows the form in normal document flow at every width. Removed the fixed mobile bar, its reserved bottom padding, and sticky wizard header/sidebar positioning.
- Location: restored the map-sized location area, separate Access card, nearest-road and distance controls, and collapsed optional Land Details. Governorate, area, soil and description retain existing save behavior.
- Agriculture: removed Energy Source from the step without clearing stored energy data. Order is Water Resources → supported facility cards → collapsed Production & Crops → collapsed Farm Highlights. Native disclosures keep fields mounted and preserve entered values.
- Facilities: four selectable type cards reveal the existing create form. Actual facility creation/editing, pending-entry protection, validation and failed-save retention remain. No decorative checkbox is treated as a saved facility.
- Portal: compact tablet account row and white horizontal navigation strip, desktop sidebar, mobile access to all account actions. Removed duplicate RTL rotations in overview, saved-item and request-row arrows; the shared icon already mirrors these arrows.

The reported desktop stacking was **not reproduced in the initial captures**: both wizard and portal already had their desktop columns. Explicit placement and browser geometry assertions now protect this behavior. A separate check removes all fixture styles and loads only production build CSS, confirming the columns also exist outside the fixture stylesheet.

## Before / after

[Comparison viewer](../artifacts/phase5-6-fixes/comparison.html): **36 before + 36 after** screenshots, covering basics, location, agriculture, listing details, My Farms and portal overview in EN/AR at **1440, 1024 and 390px**. An additional **12 captures** verify real production CSS on shared test components.

The broader [Phase 5 matrix](../artifacts/phase5-6-fixes/phase5-after/) adds **102 current captures** of login, OTP/error, modal, profile completion, overview, request/empty states, messages/conversation, verification, confirmation/success, saved listings, account profile, documents and notifications. Earlier Phase 5 captures remain intact.

- [Desktop agriculture, before](../artifacts/phase5-6-fixes/before/en-1440-wizard-3.png) / [after](../artifacts/phase5-6-fixes/after/en-1440-wizard-3.png)
- [Tablet portal, before](../artifacts/phase5-6-fixes/before/en-1024-portal.png) / [after](../artifacts/phase5-6-fixes/after/en-1024-portal.png)
- [Arabic mobile agriculture, before](../artifacts/phase5-6-fixes/before/ar-390-wizard-3.png) / [after](../artifacts/phase5-6-fixes/after/ar-390-wizard-3.png)
- [Location after](../artifacts/phase5-6-fixes/after/en-1440-wizard-2.png), [production CSS captures](../artifacts/phase5-6-fixes/production-css/)

Captures use isolated fixtures and intercepted API responses, never MySQL or production records. No real authenticated mutation was performed. Exact pixel parity is not claimed: content differs, PDF pages include print margins, and the unsupported controls below cannot truthfully match the populated reference.

## Missing contracts / remaining differences

| Reference behavior                 | Exact limitation                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Place / adjust / restore a map pin | `POST /api/v1/farms`, `PATCH /api/v1/farms/:id` and specification writes accept no coordinate fields. The owner farm response exposes no supported pin coordinates. There is no authorized pin read/write endpoint. Unknown DTO fields are rejected. An approved coordinate shape, validation and private/public access rules are required before enabling this control. The UI shows an unavailable location area, never a fake map or “pin placed” status. |
| Nearest main road / distance       | No accepted road-name or road-distance field in the farm or specification DTOs, no corresponding response fields, and no access-information endpoint. A road-name contract plus distance value/unit/validation/readback contract is required. The labeled inputs are disabled and never included in saves.                                                                                                                                                   |
| Six Figma facility checkboxes      | Existing facilities accept only `cold_storage_freezing`, `produce_storage`, `agricultural_processing_packing`, `agricultural_service_facility` with name/description/governorate/area. There is no supported generic irrigation-network, machinery, nursery, power-connection or housing selection contract. Existing supported records use type cards plus the required detail form.                                                                        |

Supported location and agriculture fields are saved using existing APIs. Existing energy values remain intact, while Energy Source is absent from the Agriculture form. The portal retains extra working navigation/actions from later functional phases; no roles, counts, farms, notifications or other private records were fabricated. Arabic portal exports are unavailable, so RTL follows existing language tokens and the English responsive references. Approved standalone map artwork was not present locally; no map image was invented or extracted into the product.

## Validation

| Check                                         | Result                 |
| --------------------------------------------- | ---------------------- |
| `npm run typecheck`                           | Passed                 |
| `npm run lint`                                | Passed                 |
| `npm run build`                               | Passed                 |
| Isolated layout and workflow checks           | 15 passed              |
| Production CSS EN/AR matrix                   | 6 passed               |
| Full Phase 5 visual matrix                    | 6 passed; 102 captures |
| Existing production auth / portal regressions | 49 passed, 9 skipped   |

Workflow assertions cover retained values across disclosures/navigation, soil/crop/highlight/facility save payloads, preserved energy values, unavailable fields omitted from payloads, normal-flow actions, one farm/listing creation, rent units, failed saves/uploads, document versioning, pending entries and confirmed submission. Production tests preserve OTP/session/returnTo checks and guest authorization guards. Skips are existing project exclusions and the dedicated live authenticated test without an `FX_E2E_MOBILE` account; no OTP SMS or database writes were triggered.

Logs: [typecheck](../artifacts/phase5-6-fixes/typecheck.log), [lint](../artifacts/phase5-6-fixes/lint.log), [build](../artifacts/phase5-6-fixes/build.log), [isolated checks](../artifacts/phase5-6-fixes/visual-test.log), [production CSS](../artifacts/phase5-6-fixes/production-css-test.log), [production regressions](../artifacts/phase5-6-fixes/regression-test.log).

[Full Phase 5 visual test log](../artifacts/phase5-6-fixes/phase5-visual-test.log). The build retains the existing multiple-lockfile warning; fixture browsers retain shared logo sizing recommendations.

[Final comparison refresh](../artifacts/phase5-6-fixes/final-matrix.log): 7 passed after clarifying that Continue saves location fields; these repeat the six layout cases and supported-field persistence check above.

Source changes: `AddFarmWizard.tsx`, `FarmFacilitiesPanel.tsx`, new `WizardDisclosure.tsx`, `MyFarmExitLayout.tsx`, `OverviewContent.tsx`, `PortalUI.tsx`, `SavedListings.tsx`, and EN/AR `workspace.json`. Test changes are confined to isolated visual fixtures/specs/configuration. Existing tokens, authentication, adapters, backend API contracts and FarmExit Score remain unchanged. Public Farm Details, unrelated pages, `api/`, `dashboard/`, database and seeds were not edited by this task.

Stopped after these fixes. No Phase 7 implementation.
