FarmExit hero tabs implementation — review notes

All implementation changes are inside `web/`. Existing local `.worktrees/` content was left alone. Nothing was pushed, merged or deployed.

| Tab | Behavior |
| --- | --- |
| Quick Buy | Opens `/[locale]/farms`. Captures available cash, installment amount, six exchange asset choices, individual approximate values, and an Other description. Applies existing installment/exchange method filters and the four supported exchange asset filters. Displays unsupported criteria separately on the destination. |
| Standard Buy | Keeps the existing location, activity, area and budget search into `/[locale]/farms`. |
| Quick Sale | Opens the existing farm selection/creation wizard with Sale and Cash only visible and locked. Uses the API's existing `standardCash` sale mode. |
| Standard Sale | Opens the same wizard with Sale locked. Offers installment, exchange and both. Uses the API's existing `quickSale` enum for flexible terms; that legacy API name is not presented as the hero tab's meaning. |
| Rent | Opens the same wizard with Rent visible and locked. Existing rental pricing remains available. |
| Partnership | Reuses `PartnershipHeroSearch`, the public API facets, serializer and destination filter parser. Selected filters appear immediately in `/[locale]/partnerships` and survive sorting, refresh, back and language switching. |
| Management | Keeps the existing management search and parameter mapping into `/[locale]/management`. |

New URL parameters:

- Homepage: `heroTab=quickBuy|buy|quickSale|standardSale|rent|partnership|management`.
- Listing entry: `entryMode=quickSale|standardSale|rent`; `createFarm=1` selects creation after choosing between existing/new farms. Existing `listingId` and `step` remain in use.
- Quick Buy: `buyIntent=quickBuy`, `availableCash`, `installmentAmount`, `exchangeItems`, `assetValue_factory`, `assetValue_villa`, `assetValue_car`, `assetValue_apartment`, `assetValue_farm`, `assetValue_other`, `otherDescription`.
- Existing supported marketplace parameters reused: `saleMethods` and `exchangeAssetTypes`. Existing Standard Buy parameters remain unchanged.
- Partnership reuses `governorate`, `farmType`, `minArea`, `objective`, and existing pagination/sort parameters. Encoding is through `URLSearchParams`; no parallel Partnership query format was introduced.

Listing modes are carried through authentication/profile `returnTo`, farm choice, wizard URLs and language links. Browser metadata is scoped by authenticated user and listing ID (`fx:listing-entry:v1:<user>:<listing>`), with a farm key before a listing exists. Successful saves associate that metadata with the saved draft. Opening a draft without an entry query restores its saved mode before enabling editable controls. Transaction controls stay selected and disabled; Quick Sale payment controls are also disabled. Save-time checks enforce these presets.

Existing drafts with incompatible transaction types, saved entry modes or configured sale terms are blocked explicitly. They can be resumed in their original mode or the user can start a new listing. Conflicting sale terms are checked before farm/listing mutations or entry metadata writes. The existing wizard uses explicit Save/Continue rather than automatic field autosaving; its save behavior is preserved.

Supported backend fields: listing `sale`/`rent`; `standardCash`/`quickSale` sale modes; cash/installment/exchange acceptance booleans; exchange scope; factory, villa, apartment and car asset identifiers; existing marketplace method/asset filters; existing Partnership filters.

Unsupported backend fields: Quick Buy cash/installment amounts, approximate asset values, Other description, and Farm/Other asset targets. Quick Buy keeps these in the URL and a visibly labeled preference summary; they do not affect server filtering. Standard Sale keeps Farm/Other targets as browser-only draft data. Exchange terms require at least one of the four API-supported assets, so the UI never submits unsupported values or silently substitutes “any asset.”

Limitations: the entry mode and unsupported listing asset targets are browser-local. Cross-device restoration, restoration after clearing browser storage, and server enforcement of entry locks require backend metadata support. API-supported listing terms themselves are saved through the existing API. No full offline wizard or new autosave mechanism was added. Partnership facets depend on the existing API being available. Tests use an isolated contract fixture rather than a real authenticated production account; no production data was written.

Validation: `npm run typecheck`, `npm run lint`, and `npm run build` all passed. The complete browser matrix passed **18 tests in 3.8 minutes**: three test stories for each Arabic/English × 1440/1024/390 combination. Each navigation story tests all seven tabs individually. Listing stories cover all three modes, existing/new farms, every wizard step, save payloads, refresh, language switching, reopening drafts without entry query parameters, and explicit conflict protection. No uncaught browser exceptions, new console errors, or horizontal page overflow were observed in these flows.

Existing unrelated footer prefetches for `/about`, `/careers`, `/contact` and `/terms` return 404 because those pages are absent. Browser tests exclude those known footer errors and expected missing-sale-terms 404s, while checking all other console errors and uncaught exceptions. Map tiles are stubbed during testing. The build also reports the existing multiple-lockfile workspace-root warning. The fixture suite lives outside `tests/e2e/` so the normal E2E configuration does not attempt to run it without its isolated servers.

Screenshots are generated under `web/artifacts/hero-tabs/` (already ignored by the repository). Each `en|ar` × `1440|1024|390` combination has `-quick-buy.png`, `-partnership.png` and `-hero.png` images. The fixture returns empty marketplace results deliberately; screenshots are for layout and locale verification.

Exact changed source, test and review files (repository-relative):

```text
web/messages/ar/home.json
web/messages/en/home.json
web/src/app/[locale]/page.tsx
web/src/app/[locale]/farms/page.tsx
web/src/app/[locale]/my/farms/new/page.tsx
web/src/app/[locale]/my/farms/[id]/list/page.tsx
web/src/components/ui/LanguageToggle.tsx
web/src/features/home/HeroSearch.tsx
web/src/features/home/HomeHero.tsx
web/src/features/home/QuickBuyFields.tsx
web/src/features/marketplace/QuickBuySummary.tsx
web/src/features/marketplace/use-marketplace-state.ts
web/src/features/my-farms/AddFarmForm.tsx
web/src/features/my-farms/AddFarmWizard.tsx
web/src/features/my-farms/EntryModeWizard.tsx
web/src/features/my-farms/entry-mode.ts
web/src/features/my-farms/SaleTermsEditor.tsx
web/src/features/opportunity-marketplace/FilterSidebar.tsx
web/src/features/opportunity-marketplace/PartnershipHeroSearch.tsx
web/src/features/search/SearchBar.tsx
web/src/lib/opportunities/public-opportunity.ts
web/playwright.hero.config.ts
web/tests/hero-tabs/hero-tabs.spec.ts
web/tests/hero-api-fixture.mjs
web/HERO_TABS_REVIEW.md
```

To reproduce: run `npm run typecheck`, `npm run lint`, `npm run build`, then `node node_modules/@playwright/test/cli.js test --config playwright.hero.config.ts` from `web/`. The browser configuration starts only the local fixture and website servers (ports 4107/3107); it does not change environment files or production configuration.
