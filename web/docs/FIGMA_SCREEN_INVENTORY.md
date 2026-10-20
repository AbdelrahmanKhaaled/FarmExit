# FarmExit Figma screen inventory

Inspected: **18 October 2026 (Africa/Cairo)**. File: [FarmExit](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7).

**Status: incomplete inventory; further frontend implementation is blocked pending the remaining design inspection.** Figma MCP reached its seat/plan tool-call limit during enumeration. This document records verified discoveries, historical pointers, the complete existing locale route list, and unresolved references. It does **not** claim that all screens, states, variants, or flows were inspected.

Only this inventory document was created. No UI, configuration, backend, database, Admin Dashboard, API integration, or Figma content was changed. The workspace already contained modified and untracked files; those were left untouched.

## Evidence and counting rules

- **Verified**: directly returned by Figma MCP in this conversation. Farm Details screenshots/context and Design System metadata/context were retrieved in the immediately preceding read-only inspections.
- **Page verified, contents blocked**: page ID/name returned by direct document enumeration; its screen children are unknown.
- **Historical pointer**: recorded in `FARMEXIT_UI_STYLE_GUIDELINES.md`, explicitly described there as an earlier Claude audit. It is not a live confirmation.
- **Code observed**: read from current `web/` source; it does not establish what exists in Figma.
- A screen count counts distinct screen frames, not route files, child sections, viewport modes, component variants, or screenshots. Unknown counts are **unknown**, never zero.
- A known page or an Arabic variable mode does not prove that each route has an Arabic frame.
- Source precedence for this task: Figma is the visual source of truth. The local style guide contains a different historical precedence order; it does not authorize visual substitutions for this inventory or future implementation. Preserve existing business logic and API contracts; report conflicts for clarification.

## 1. Complete discovered page index

Direct read-only `use_figma` enumeration of `figma.root.children` returned **23 pages**. This resolves the earlier misleading metadata listing, which exposed only Design System. Direct lookup also confirmed that all three known Farm Details frames have parent page `1:7`.

| Page | Exact page ID / reference | Inspection result |
|---|---|---|
| Design System | [`1:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=1-2) | Root nodes enumerated; see below |
| Icon Library | [`67:1878`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=67-1878) | Root nodes enumerated; see below |
| Image Library | [`69:10243`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=69-10243) | Root nodes enumerated; see below |
| Cover | [`0:1`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=0-1) | Root nodes enumerated; see below |
| Brand Presentation | [`136:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=136-2) | Root nodes enumerated; see below |
| Client Demo | [`124:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=124-2) | Read attempted; response exceeded 20,480-byte output limit |
| 00 · Source of Truth | [`82:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=82-2) | Root nodes enumerated; see below |
| 01 · Product Architecture | [`232:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=232-2) | Page verified; child inventory blocked by MCP quota |
| 02 · Authentication | [`251:4319`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=251-4319) | Page verified; child inventory blocked by MCP quota |
| 03 · My FarmExit | [`264:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=264-2) | Page verified; child inventory blocked by MCP quota |
| 04 · Add Farm | [`296:2640`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=296-2640) | Page verified; child inventory blocked by MCP quota |
| 05 · Management Request | [`320:70841`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=320-70841) | Page verified; child inventory blocked by MCP quota |
| 06 · Professional Experience | [`337:82791`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=337-82791) | Page verified; child inventory blocked by MCP quota |
| 07 · Partnership | [`360:98844`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=360-98844) | Page verified; child inventory blocked by MCP quota |
| 08 · Arabic Web + Client Demo | [`388:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=388-2) | Page verified; child inventory blocked by MCP quota |
| Farm Management Marketplace | [`1:10`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=1-10) | Page verified; child inventory blocked by MCP quota |
| Components | [`1:3`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=1-3) | Page verified; child inventory blocked by MCP quota |
| Website Screens | [`1:4`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=1-4) | Page verified; child inventory blocked by MCP quota |
| ——— NEXT: SAME SYSTEM ——— | [`1:5`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=1-5) | Page verified; child inventory blocked by MCP quota |
| Farm Details | [`1:7`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=1-7) | Three direct screen lookups/context/screenshots verified earlier; full page enumeration quota-blocked |
| Marketplace | [`1:6`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=1-6) | Page verified; child inventory blocked by MCP quota |
| Owner Dashboard | [`1:8`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=1-8) | Page verified; child inventory blocked by MCP quota |
| Add Farm Flow | [`1:9`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=1-9) | Page verified; child inventory blocked by MCP quota |

### Enumerated roots on supporting pages

| Page | Root frame | ID | Size |
|---|---|---|---|
| Design System | 01 · Foundations | [`2:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=2-2) | 1680 × 10306 |
| Design System | 02 · Responsive | [`62:5`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=62-5) | 3100 × 2932 |
| Icon Library | Frame 1 | [`67:51338`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=67-51338) | 5601 × 3812 |
| Image Library | Image Library | [`70:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=70-2) | 1720 × 10259 |
| Cover | Cover | [`30:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=30-2) | 1920 × 1080 |
| Brand Presentation | Slide 01 · FarmExit Logo Concept | [`136:3`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=136-3) | 1920 × 1080 |
| 00 · Source of Truth | Source of Truth | [`82:3`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=82-3) | 1440 × 20258 |

The six successful supporting-page enumerations returned no on-canvas COMPONENT/COMPONENT_SET nodes, prototype reactions, or flow starting points **on those six pages**. This says nothing about the uninspected Components, Client Demo, product, or screen pages. The complete file-wide component, variant, section, and prototype-flow counts remain unknown.

## 2. Flow inventory and responsive coverage

D/T/M = Desktop 1440 / Tablet 1024 / Mobile 390. Each historical ID below is a pointer to inspect, not an approved replacement for a verified frame.

| Flow | Verified screen-frame count | Exact frames or verified page | D / T / M | Arabic | Readiness |
|---|---:|---|---|---|---|
| Homepage | Unknown; 3 historical pointers | Website Screens page `1:4`; historical `24:2`, `77:1427`, `81:1922` | Historically reported all three | Page `388:2` exists; exact screen unknown | Remaining context/screenshots blocked |
| Farm Marketplace | Unknown; 5 historical pointers including states | Marketplace page `1:6`; historical `31:7`, `96:1093`, `96:12274`, drawer `96:13001`, empty `96:13502` | Historically reported all three | Exact screen unknown | Remaining context/screenshots blocked |
| Farm Details | **3 verified minimum**; complete page count unknown | D `31:1393`; T `107:6917`; M `107:15222`; parent `1:7` | **All three verified** | Exact screen unknown | Visual references available; child context and other states unresolved |
| Management Marketplace | Unknown; 4 historical pointers including preview | Page `1:10`; historical `116:16067`, `116:16099`, `116:16131`, preview `118:1593` | Historically reported all three | Exact screen unknown | Blocked; current public route is informational |
| Authentication | Unknown | Page `251:4319` | Unknown / unknown / unknown | Exact frames unknown | Blocked |
| My FarmExit | Unknown | Page `264:2`; legacy Owner Dashboard page `1:8` also exists | Unknown / unknown / unknown | Exact frames unknown | Blocked; canonical versus legacy mapping unresolved |
| Add Farm | Unknown | Page `296:2640`; legacy Add Farm Flow page `1:9` also exists | Unknown / unknown / unknown | Exact frames unknown | Blocked; canonical steps and legacy relationship unresolved |
| Management Requests | Unknown | Page `320:70841` | Unknown / unknown / unknown | Exact frames unknown | Blocked |
| Professional Experience | Unknown | Page `337:82791` | Unknown / unknown / unknown | Exact frames unknown | Blocked |
| Partnerships: marketplace, owner requests, applications | Unknown | Page `360:98844`; do not assume all three subflows are present | Unknown / unknown / unknown | Exact frames unknown | Blocked; current public route is informational |
| Purchase proposals / co-purchase interest | Unknown | No exact design node verified; architecture `232:2` and product pages require inspection | Unknown / unknown / unknown | Unknown | Design location unresolved |
| Messages / mediated conversation | Unknown | Candidate My FarmExit page `264:2`; exact frame unknown | Unknown / unknown / unknown | Unknown | Design location unresolved |
| Documents / Notifications / Account | Unknown | Candidate My FarmExit page `264:2`; exact frames unknown | Unknown / unknown / unknown | Unknown | Design location unresolved |
| Arabic website and demo | Unknown | Page `388:2` | Unknown / unknown / unknown | Page existence verified only | Blocked |
| Client Demo / prototype flows | Unknown | Page `124:2` | Unknown / unknown / unknown | Separate Arabic/demo page exists | Response-size error; prototype links not recovered |
| Other designed flows | Unknown | Product Architecture `232:2`, Source of Truth `82:3`, all legacy pages require content inspection | Unknown | Unknown | Cannot assert an exhaustive flow list |

Historical references: [Home D `24:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=24-2); [Home T `77:1427`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=77-1427); [Home M `81:1922`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=81-1922); [Farm marketplace D `31:7`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=31-7); [Farm marketplace T `96:1093`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=96-1093); [Farm marketplace M `96:12274`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=96-12274); [Filters drawer `96:13001`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=96-13001); [Marketplace empty `96:13502`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=96-13502); [Management D `116:16067`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=116-16067); [Management T `116:16099`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=116-16099); [Management M `116:16131`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=116-16131); [Management preview `118:1593`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=118-1593);

## 3. Verified Farm Details references

All three belong to **Wadi El Natrun Vegetable Estate**.

| Viewport | Exact node / permanent reference | Original size | Context result | Screenshot |
|---|---|---|---|---|
| Desktop | [`31:1393`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=31-1393) | 1440 × 5983 | Successful sparse metadata; full-frame context too large | Successfully retrieved |
| Tablet | [`107:6917`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6917) | 1024 × approximately 6367.46 | Successful sparse metadata; full-frame context too large | Successfully retrieved |
| Mobile | [`107:15222`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-15222) | 390 × 6400 | Full design context and screenshot returned | Successfully retrieved |

Screenshots were rendered inline in the preceding conversation, at maximum dimension 1600. They were not saved as repository assets. Temporary Figma screenshot URLs are intentionally not used as durable inventory references; the node links above allow re-rendering when access is restored.

### Child sections requiring full context

These IDs came from actual Desktop/Tablet sparse context, not inferred IDs. They remain valid inspection targets; individual child context/screenshots have **not** been retrieved because subsequent inspection exhausted the quota.

| Section | Desktop child | Tablet child | Observed structure |
|---|---|---|---|
| Navbar | `31:1394` | `107:6918` | 78px / 72px high |
| Breadcrumb | `105:123` | `107:6919` | Back link and hierarchy |
| Gallery | `105:131` | `107:6925` | Desktop mosaic; tablet main image plus thumbnail strip |
| Details body | `105:13384` | `107:6945` | Desktop main column + sidebar; tablet full-width column |
| Overview | `105:13437` | `107:6947` | Listing type, name, location, facts, description, highlights |
| Evaluation | `105:13500` | `107:6983` | **Hidden** in returned current node metadata |
| Specifications | `105:13738` | `107:7020` | Two-column specification rows |
| Facilities | `105:13860` | `107:7037` | Two-column facilities/image cards |
| Location | `105:13886` | `107:7047` | Map plus nearby/access details |
| Documents | `105:14068` | `107:7065` | Two visible rows; extra row hidden |
| Request panel / inline actions | `105:13386` sidebar; `105:13387` panel | `107:15193` price/actions | Desktop 384px sidebar; tablet inline CTA block |
| Request band | `106:1670` | `107:7079` | Request CTA, next-step explanation, privacy note |
| Related opportunities | `106:1702` | `107:7101` | Three / two farm cards |
| Footer | `31:1436` | `107:7107` | Responsive footer |
| Fixed action bar | Not returned as a separate Desktop node | `107:15212` | Tablet fixed bar; mobile fixed bar visible in screenshot |

Each child ID is linkable using the file URL with `?node-id=<ID with colon replaced by hyphen>`. The appendix below includes exact child links recovered from saved context.

Observed visual affordances: Back to results, gallery navigation/photo count, more photos, Save, Request farm details, Contact through FarmExit, document rows, related-farm links, and fixed actions on smaller screens. The screenshot demonstrates their presence, **not** prototype destinations, API behavior, animation, or the existence of every overlay state.

No gallery modal, request modal, contact drawer, save success, request success, error, loading, empty, or Arabic **separate design frame** was independently confirmed. Existing code interactions must not be relabeled as verified Figma interactions.

## 4. Design System inspection

Verified Design System page `1:2` contains Foundations `2:2` and Responsive `62:5`. Foundations metadata and the Responsive design context/screenshot were successfully inspected in this conversation. The live variables API, full component definitions/variants, and all component screenshots could not be inspected before quota exhaustion.

| Foundation section | Exact reference |
|---|---|
| Color | [`2:7`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=2-7) |
| Typography | [`3:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=3-2) |
| Spacing | [`4:4`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=4-4) |
| Border radius | [`4:126`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=4-126) |
| Elevation and blur | [`4:165`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=4-165) |
| Imagery | [`4:180`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=4-180) |
| Breakpoint specs | [`62:10`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=62-10) |
| Component behavior | [`63:2`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=63-2) |
| Grid previews | [`63:131`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=63-131) |

Live metadata confirms brand primary #166534, hover #0F4A26, deep #0F2A1A, accent #65A30D, soft accent #A3D65C, gold #D4A72C, page #F7FAF5, surface #FFFFFF, text primary #17211B, secondary #2F3D33, body #4A574E, muted #5B6A60, subtle #7A877E. These are evidence, not instructions to introduce hardcoded values.

The existing token snapshot `web/tokens/figma-variables.json` identifies itself as a **2026-10-11** Figma Plugin API export. Code inspection found **37 primitives, 65 Color variables, 31 Spacing/layout variables, 11 Radius variables, 21 Responsive variables, 12 Language variables, 55 text styles, and 9 effect styles**. These are exact **local snapshot counts**, not confirmed current live-library totals. The historical guide's approximate 70 colors / 56 text styles / 140 components must not be treated as fresh live counts.

### Responsive rules

Responsive context/screenshot confirms a three-breakpoint system, matching grid styles and variable modes, 3/2/1 card layouts, scrolling controls and stacked mobile content. The local snapshot specifies:

| Value | Desktop 1440 | Tablet 1024 | Mobile 390 |
|---|---:|---:|---:|
| Marketing margin | 120 | 40 | 16 |
| Marketing content width | 1200 | 944 | 358 |
| App margin | 64 | 40 | 16 |
| App content width | 1312 | 944 | 358 |
| Columns | 12 | 8 | 4 |
| Gutter | 24 | 24 | 16 |
| Card columns | 3 | 2 | 1 |
| Navbar height | 78 | 72 | 64 |
| Section gap | 144 | 112 | 80 |
| Band padding | 128 | 96 | 72 |
| Sidebar width | 310 | 0 | 0 |
| Hero type | 84 | 64 | 42 |
| Section heading | 52 | 40 | 30 |
| H3 | 26 | 24 | 22 |
| Lead type | 19 | 18 | 17 |

The code transitions at 768 and 1280px. Those are observed implementation thresholds; the design viewport widths alone do not establish transition thresholds.

Responsive screenshot/context also documents: tablet 2×2 search fields and full-width Search below; mobile stacked fields and horizontally scrolling tabs; mobile 2×2 hero stats; tablet two-column farm grids and mobile single column; evaluation content moves below imagery at smaller widths; footer stacks at mobile; minimum mobile touch target 44px; hover disabled on tablet in favor of press states. Some legacy evaluation content exists in documentation while Farm Details evaluation sections are currently hidden. Do not make hidden content public from this documentation alone.

### Typography, spacing and effects

The local snapshot uses Manrope for English and IBM Plex Sans Arabic for Arabic, with English tracking values resolving to zero in Arabic and ExtraBold mapped to Bold. Live Responsive context confirms Manrope and responsive font-size bindings, but the full live language/style library is not reverified.

Local spacing increments: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 120, 144px. Radius snapshot: xs 3, sm 8, md 10, lg 12, xl 14, 2xl 16, image 18, 3xl 20, card 24, feature 28, full 999px. Effects include Premium Rest/Lift, Card Hover, Search Panel, Floating Report, Floating Glass, Hero Panel, Nav Glass and Hero Glass. Use semantic tokens already generated in `web/src/styles/tokens.css`; do not regenerate or edit them as part of this audit.

### Components, variants, icons and approved assets

| Family | Existing frontend implementation | Live Figma inspection status |
|---|---|---|
| Buttons | `components/ui/Button.tsx`: Primary/Accent/Outline/Ghost, sm/md/lg heights 42/46/52, disabled/pressed/hover; Block buttons | Components page `1:3` verified; exact component and variant IDs blocked |
| Cards | `Surface.tsx`, FarmCard, MarketplaceFarmCard, RequestCard, OpportunityCard | Exact current variant sets blocked |
| Inputs | `Field.tsx`, RangeSlider, ChoiceOption, MobileInput, OtpInput | Focus/error/loading variants not individually verified |
| Navigation | Navbar, MobileMenu, Footer, PortalNavigation, portal-nav | Guest/signed-in, workspace and RTL variants not individually verified |
| Overlays | Dialog, Sheet, OverlayHeader, shared focus/scroll hooks | Exact modal/drawer frames and transitions unknown |
| Icons | `components/icons/Icon.tsx`, `icon-paths.ts`; Icon Library `67:51338` | Root existence confirmed; individual icon/component IDs unknown |
| Images | `public/images/`, imagery CSS; Image Library `70:2` | Root existence confirmed; full approved asset/crop mapping unknown |
| Brand | `components/brand/Logo.tsx` | Foundations logo swatches present; individual logo component IDs not recovered |
| Tokens/type | JSON snapshot, generated CSS and manifest, Text | Partial live foundation verification; no complete live token/style diff |

Do not synthesize replacement icons, photos, layouts, animations or variants from this incomplete table. Code comments claiming a Figma origin are useful pointers, not independent proof of live parity.

## 5. Existing frontend routes and design mapping

The complete locale page-file scan found **38 routes: 36 product routes and 2 development previews**. `[locale]` is the existing EN/AR locale segment; route presence does not establish a corresponding Arabic design. Shared layouts, API BFF handlers, and inline states are not counted as routes.

The following table is generated from the actual current `web/src/app/[locale]/**/page.tsx` files. “Candidate page” means a mapping to verify, not an asserted exact screen match.

| Existing route | Code reference | Flow / candidate page ID | Exact screen mapping |
|---|---|---|---|
| `/[locale]/` | [page.tsx](../../web/src/app/[locale]/page.tsx); `features/home/AboutSection`, `features/home/CtaSection`, `features/home/FeaturedFarms`, `features/home/HomeHero`, `features/home/HowItWorks`, `features/home/JourneysSection`, `features/home/ManagementSection`, `features/home/MarketInsights`, `features/home/Testimonials` | Homepage: `1:4` | Historical frames 24:2 / 77:1427 / 81:1922; not reverified |
| `/[locale]/auth/complete-profile` | [page.tsx](../../web/src/app/[locale]/auth/complete-profile/page.tsx); `features/auth/ProfileForm` | Authentication: `251:4319` | Exact screen/step frame unknown |
| `/[locale]/dev/components` | [page.tsx](../../web/src/app/[locale]/dev/components/page.tsx) | Supporting preview: `1:2 / 1:3` | Development only; no product-screen equivalence |
| `/[locale]/dev/tokens` | [page.tsx](../../web/src/app/[locale]/dev/tokens/page.tsx) | Supporting preview: `1:2 / 1:3` | Development only; no product-screen equivalence |
| `/[locale]/farms` | [page.tsx](../../web/src/app/[locale]/farms/page.tsx); `features/marketplace/MarketplaceResults`, `features/marketplace/MarketplaceSearch` | Farm Marketplace: `1:6` | Historical frames 31:7 / 96:1093 / 96:12274; not reverified |
| `/[locale]/farms/[slug]` | [page.tsx](../../web/src/app/[locale]/farms/[slug]/page.tsx); `features/farm-details/FarmDetailsView` | Farm Details: `1:7` | Verified 31:1393 / 107:6917 / 107:15222 |
| `/[locale]/management` | [page.tsx](../../web/src/app/[locale]/management/page.tsx) | Management Marketplace: `1:10` | Informational implementation; historical design frames unverified |
| `/[locale]/my` | [page.tsx](../../web/src/app/[locale]/my/page.tsx) | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/applications` | [page.tsx](../../web/src/app/[locale]/my/applications/page.tsx) | Partnership request/application: `360:98844` | Exact owner/applicant frames unknown |
| `/[locale]/my/applications/[id]` | [page.tsx](../../web/src/app/[locale]/my/applications/[id]/page.tsx); `features/my-applications/PartnershipApplicationDetail` | Partnership request/application: `360:98844` | Exact owner/applicant frames unknown |
| `/[locale]/my/applications/new` | [page.tsx](../../web/src/app/[locale]/my/applications/new/page.tsx); `features/my-applications/NewPartnershipApplicationForm` | Partnership request/application: `360:98844` | Exact owner/applicant frames unknown |
| `/[locale]/my/documents` | [page.tsx](../../web/src/app/[locale]/my/documents/page.tsx) | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/farm-details-requests/[id]` | [page.tsx](../../web/src/app/[locale]/my/farm-details-requests/[id]/page.tsx); `features/my-farm-details/FarmDetailsRequestDetail` | Farm details inquiry: `1:7 / 264:2 (candidate)` | Request form/status/modal mapping unverified |
| `/[locale]/my/farm-details-requests/new` | [page.tsx](../../web/src/app/[locale]/my/farm-details-requests/new/page.tsx); `features/my-farm-details/FarmDetailsRequestForm` | Farm details inquiry: `1:7 / 264:2 (candidate)` | Request form/status/modal mapping unverified |
| `/[locale]/my/farms` | [page.tsx](../../web/src/app/[locale]/my/farms/page.tsx) | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/farms/[id]` | [page.tsx](../../web/src/app/[locale]/my/farms/[id]/page.tsx); `features/my-farms/FarmWorkspace` | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/farms/new` | [page.tsx](../../web/src/app/[locale]/my/farms/new/page.tsx); `features/my-farms/AddFarmForm` | Add Farm: `296:2640 / 1:9` | Exact step frames and canonical version unknown |
| `/[locale]/my/management` | [page.tsx](../../web/src/app/[locale]/my/management/page.tsx) | Management Request: `320:70841` | Exact create/list/detail/status frame unknown |
| `/[locale]/my/management/[id]` | [page.tsx](../../web/src/app/[locale]/my/management/[id]/page.tsx); `features/my-management/ManagementRequestDetail` | Management Request: `320:70841` | Exact create/list/detail/status frame unknown |
| `/[locale]/my/management/new` | [page.tsx](../../web/src/app/[locale]/my/management/new/page.tsx); `features/my-management/NewManagementRequestForm` | Management Request: `320:70841` | Exact create/list/detail/status frame unknown |
| `/[locale]/my/messages` | [page.tsx](../../web/src/app/[locale]/my/messages/page.tsx); `features/my-messages/MessagesInbox` | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/messages/[caseId]` | [page.tsx](../../web/src/app/[locale]/my/messages/[caseId]/page.tsx); `features/my-messages/ConversationView` | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/notifications` | [page.tsx](../../web/src/app/[locale]/my/notifications/page.tsx) | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/partnerships` | [page.tsx](../../web/src/app/[locale]/my/partnerships/page.tsx) | Partnership request/application: `360:98844` | Exact owner/applicant frames unknown |
| `/[locale]/my/partnerships/[id]` | [page.tsx](../../web/src/app/[locale]/my/partnerships/[id]/page.tsx); `features/my-partnerships/PartnershipRequestDetail` | Partnership request/application: `360:98844` | Exact owner/applicant frames unknown |
| `/[locale]/my/partnerships/new` | [page.tsx](../../web/src/app/[locale]/my/partnerships/new/page.tsx); `features/my-partnerships/NewPartnershipRequestForm` | Partnership request/application: `360:98844` | Exact owner/applicant frames unknown |
| `/[locale]/my/professional` | [page.tsx](../../web/src/app/[locale]/my/professional/page.tsx); `features/my-professional/ProfessionalHub` | Professional Experience: `337:82791` | Exact capability/verification frame unknown |
| `/[locale]/my/professional/verification` | [page.tsx](../../web/src/app/[locale]/my/professional/verification/page.tsx) | Professional Experience: `337:82791` | Exact capability/verification frame unknown |
| `/[locale]/my/professional/verification/[id]` | [page.tsx](../../web/src/app/[locale]/my/professional/verification/[id]/page.tsx); `features/my-professional/VerificationRequestDetail` | Professional Experience: `337:82791` | Exact capability/verification frame unknown |
| `/[locale]/my/profile` | [page.tsx](../../web/src/app/[locale]/my/profile/page.tsx) | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/proposals` | [page.tsx](../../web/src/app/[locale]/my/proposals/page.tsx) | Purchase proposal: `Unresolved` | No exact design node verified |
| `/[locale]/my/proposals/[id]` | [page.tsx](../../web/src/app/[locale]/my/proposals/[id]/page.tsx); `features/my-proposals/ProposalDetail` | Purchase proposal: `Unresolved` | No exact design node verified |
| `/[locale]/my/proposals/new` | [page.tsx](../../web/src/app/[locale]/my/proposals/new/page.tsx); `features/my-proposals/NewPurchaseProposalForm` | Purchase proposal: `Unresolved` | No exact design node verified |
| `/[locale]/my/requests` | [page.tsx](../../web/src/app/[locale]/my/requests/page.tsx) | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/requests/[id]` | [page.tsx](../../web/src/app/[locale]/my/requests/[id]/page.tsx) | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/my/saved` | [page.tsx](../../web/src/app/[locale]/my/saved/page.tsx) | My FarmExit: `264:2 / 1:8` | Exact screen and legacy/canonical relationship unknown |
| `/[locale]/partnerships` | [page.tsx](../../web/src/app/[locale]/partnerships/page.tsx) | Partnership Marketplace: `360:98844` | Informational implementation; exact discovery frame unknown |
| `/[locale]/sign-in` | [page.tsx](../../web/src/app/[locale]/sign-in/page.tsx); `features/auth/SignInForm` | Authentication: `251:4319` | Exact screen/step frame unknown |

### Existing behavior and comparison limits

| Flow / source | Code-observed behavior | Design comparison / unresolved issue |
|---|---|---|
| Authentication: `features/auth/SignInForm.tsx`, sign-in/profile pages | Mobile number → 6-digit OTP; resend countdown/change number; pending and errors; incomplete profile redirect; returnTo and deferred save intent | Dedicated pages with Navbar/Footer and approximately 480px surface. Historical guide describes dialog/full-screen sheet; inspect exact auth frames before deciding whether this differs from current Figma |
| My FarmExit: `features/my-farmexit/` | Overview, farms, management, professional, partnerships, proposals, requests, applications, saved, messages, documents, notifications, profile links | Broad route coverage exists. Cannot confirm visual match, responsive navigation or every empty/status frame |
| Add Farm: `features/my-farms/AddFarmForm.tsx` | Single create form: name/type/area/governorate/area name/description, pending/error, then farm workspace; media/facilities handled separately | No multi-step wizard in this form. Historical multi-step design remains unverified; do not invent missing steps or move persistence logic |
| Farm Details: `FarmDetailsView.tsx`, `FarmGallery.tsx`, `FarmActions.tsx` | Breadcrumb, gallery/swipe/lightbox Dialog, saved action, responsive sticky panel/bar, facts/specs/facilities/map/documents/related farms | Structure broadly corresponds to the three inspected Figma frames. No browser rendering or pixel comparison was performed. Exact child design context remains incomplete |
| Farm Marketplace: `features/marketplace/` | Search/filter/query state, results, sorting, pagination, API unavailable/empty handling | Historical drawer/empty references exist; exact current loading/error/filter/sort states unverified |
| Management Marketplace route | Public informational “not live” state and sign-in/request-tracking CTAs; no live opportunity discovery call in this page | Do not substitute historical opportunity mockups or assume preview sheet data/API is available |
| Management Requests: `features/my-management/` | Create from owned farm, editable draft/detail, submit, status/error handling | Canonical step count, form layout, review/success/status designs unknown |
| Professional Experience: `features/my-professional/` | Profile/capabilities, create verification request, update/upload documents/submit while editable, status/error handling | Exact capability selection, verification steps, loading/error/success frames unknown |
| Partnership Marketplace route | Informational public state with owner CTA | Exact current public design and intended API-backed discovery unresolved |
| Owner partnerships: `features/my-partnerships/` | Create on farm, update draft/detail, submit/status/error | Exact multi-step and status designs unknown |
| Applicant partnerships: `features/my-applications/` | Create with known parent request ID and applicant kind; edit/upload/submit/status | Discovery → invitation/application relationship and exact frames unknown |
| Purchase proposals: `features/my-proposals/` | Sale terms load, cash/installment/exchange/co-purchase data, create/edit, pending/error; route requires a sale listing | Exact offer/co-purchase design references unknown; no new co-purchase group UI authorized |
| Inquiry: `features/my-farm-details/` | Create and submit with listingSlug; duplicate conflict handling; detail status | Figma CTA is visible; exact inquiry modal/full-page/success/error mapping unknown |
| Messages: `features/my-messages/` | Case inbox, mediated conversation, open case and send messages | Exact unread/loading/empty/error/sent/status and responsive conversation frames unknown |
| Saved / lists / details | Current route files contain empty surfaces; details commonly return notFound for unavailable records | Existing code states do not establish Figma-designed equivalents |
| Documents / notifications | Existing routes and informational behavior; Phase 9 notes no user-wide document catalog or notifications API | Design and functional availability require reconciliation; do not introduce fake data |
| Localization | Locale-aware routes, translations, RTL helpers and existing font/token modes | Arabic page exists; dedicated Arabic frame IDs and viewport coverage remain unknown |

### API/business logic boundaries to preserve

Observed BFF families under `web/src/app/api/`: auth OTP/profile/session, farms/media/facilities/listing requests, marketplace farms/saved/sale terms, farm details requests, management requests, professional profile/capabilities/verification, partnership requests/applications, purchase proposals, request documents, and communication cases/messages.

Existing auth uses session helpers/cookies, profile completion and return-to checks. Existing forms call those BFF routes and gate draft edits/submission by status. The Phase 8/9 API mapping documents state that public Management and Partnership discovery, user-wide documents and notifications have gaps; this audit did not independently audit the backend or authorize changing these contracts. Preserve integrations and report any design/product conflict.

## 6. Form steps, overlays and state coverage

**No flow below has a complete state inventory.** “Unknown” means inspection blocked; it does not mean the design is absent. The broad state checklist is a verification requirement, not a list of invented screens.

| Flow | Base/responsive references | Form steps | Modal / drawer | Loading / empty / error / success | Status states | Arabic |
|---|---|---|---|---|---|---|
| Homepage | Historical D/T/M | N/A unless shown | Unknown | Unknown | Unknown | Unknown |
| Farm Marketplace | Historical D/T/M | Filter fields unknown | Drawer 96:13001 historical | Empty 96:13502 historical; others unknown | Unknown | Unknown |
| Farm Details | D/T/M verified | Inquiry flow unknown | Gallery/request/contact overlays unknown | All separate state frames unknown | Listing badge present; exact variant set unknown | Unknown |
| Management Marketplace | Historical D/T/M | Application entry unknown | Preview 118:1593 historical | All unknown | Unknown | Unknown |
| Authentication | Page verified | Mobile/OTP/profile in code; exact design steps unknown | All unknown | All exact state frames unknown | Verification/session states unknown | Unknown |
| My FarmExit | Page verified | Exact profile/account steps unknown | All unknown | All exact state frames unknown | All request/activity variants unknown | Unknown |
| Add Farm | New and legacy pages verified | Every exact step/review/resume frame unknown | Upload/leave/draft overlays unknown | All unknown | Draft/submitted variants unknown | Unknown |
| Management Requests | Page verified | All exact steps/review unknown | All unknown | All unknown | Draft/review/changes/status designs unknown | Unknown |
| Professional Experience | Page verified | All profile/capability/verification steps unknown | All unknown | All unknown | All verification/status designs unknown | Unknown |
| Partnerships | Page verified | Owner request/applicant/review steps unknown | All unknown | All unknown | All request/application statuses unknown | Unknown |
| Proposals/co-purchase | Exact design location unknown | All unknown | All unknown | All unknown | All unknown | Unknown |
| Messages / documents / notifications | Candidate page only | All unknown | All unknown | All unknown | All unknown | Unknown |

## 7. Access failures and evidence gaps

### Exact Figma quota error

Starting with Product Architecture page `232:2`, all remaining already-issued page-inventory calls returned:

> You've reached the Figma MCP tool call limit for your View seat on the Professional plan. Upgrade your seat or plan for more tool calls: https://www.figma.com/files/1562758522731352598/recents-and-sharing?upgrade_request_type=expert&entry_point=mcp_rate_limit_deeplink

Affected page subtrees: `232:2`, `251:4319`, `264:2`, `296:2640`, `320:70841`, `337:82791`, `360:98844`, `388:2`, `1:10`, `1:3`, `1:4`, `1:5`, `1:7`, `1:6`, `1:8`, `1:9`.

This is a quota failure, not evidence that nodes are deleted, missing, or permission-denied. No additional design-context/screenshot calls were issued after the quota failure; existing Farm Details and Responsive evidence is retained from earlier calls in this conversation.

### Exact Client Demo response-size error

Page `124:2` returned:

> Return value exceeds the 20480-byte limit (35616 bytes). Canvas edits from this run were not committed.

Debug UUID: `d4770ed1-5cef-4f49-a930-d455382423cf`.

The submitted script was read-only. The service's generic mention of canvas edits does not indicate this audit attempted edits. Page enumeration itself proved the page exists; its detailed roots/reactions were not returned. Retry later with separate root/component/reaction queries, bounded output or per-section pagination.

### Design context truncation

Desktop `31:1393` and Tablet `107:6917` returned successful sparse metadata and:

> IMPORTANT: The design was too large to fit into context with get_design_context. Instead you have received a sparse metadata response, you MUST call get_design_context on the IDs of the sublayers to get the full code. Split up the calls to ensure the sublayers do not also exceed the context limit.

Those responses establish structure and existence; they are insufficient for implementation. Query the child sections listed above after access is restored.

An earlier attempt to request design context on page `1:2` returned “You currently have nothing selected. You need to select a layer first before using this tool.” A subsequent exact frame lookup `62:5` successfully returned design context and a screenshot; this page-level error was resolved.

### Missing versus inaccessible

- **Verified missing/deleted nodes: none.**
- **Unknown or inaccessible design references: many**, because enumeration was interrupted.
- Exact component IDs, variant properties, all complete user-flow/prototype connections, Arabic screen IDs, and most form/state screen IDs have not been recovered.
- No complete screenshot set, complete design-context set, approved-asset manifest, or live token diff was produced.
- No frontend runtime/visual tests were run: this task only created documentation and did not change executable code. Source inspection is not pixel-parity verification.

## 8. Readiness and required clarification

**No additional UI implementation should start from this inventory.** Farm Details has three confirmed visual references, but the requested audit as a whole is incomplete.

To finish the inventory, Figma MCP access must first be restored. Then:

1. Query each known page directly, retaining the 23-page index rather than trusting the initial metadata page list.
2. Enumerate sections and screen roots with bounded responses; enumerate component sets/variants and prototype reactions separately. Resolve destinations and flow starting points.
3. Retrieve metadata, screenshot and design context for every relevant screen/state/viewport/locale. If sparse, inspect child sections; do not implement from sparse metadata alone.
4. Reconcile canonical versus legacy My FarmExit/Owner Dashboard and Add Farm pages; establish which Client Demo copies are presentation-only.
5. Match every exact screen to the existing route table; mark true missing designs only after complete traversal.
6. Resolve documented product/API conflicts without changing authentication, permissions, data visibility, or business logic.

Clarification required **before implementation**: restore sufficient Figma MCP access so remaining designs can be inspected; after that inspection, confirm canonical versions wherever new/legacy/demo boards conflict. For any screen or interaction still absent or ambiguous, request its approved reference instead of inventing a substitute. This inventory does not infer user decisions from missing evidence.

## Appendix: exact Farm Details child references


### Desktop

| Node | Exact ID / reference | Visibility |
|---|---|---|
| Navbar | [`31:1394`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=31-1394) | Visible |
| Breadcrumb Row | [`105:123`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-123) | Visible |
| Hero Gallery | [`105:131`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-131) | Visible |
| Row 1 | [`105:13374`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-13374) | Visible |
| Row 2 | [`105:13375`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-13375) | Visible |
| Details Body | [`105:13384`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-13384) | Visible |
| 01 · Farm Overview | [`105:13437`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-13437) | Visible |
| 02 · FarmExit Evaluation | [`105:13500`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-13500) | Hidden |
| 03 · Farm Specifications | [`105:13738`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-13738) | Visible |
| 04 · Facilities & Equipment | [`105:13860`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-13860) | Visible |
| 05 · Location & Access | [`105:13886`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-13886) | Visible |
| 06 · Documents & Verification | [`105:14068`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=105-14068) | Visible |
| 07 · Request Band | [`106:1670`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=106-1670) | Visible |
| Copy | [`106:1672`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=106-1672) | Visible |
| Actions | [`106:1686`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=106-1686) | Visible |
| 08 · Related Opportunities | [`106:1702`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=106-1702) | Visible |
| Footer | [`31:1436`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=31-1436) | Visible |

### Tablet

| Node | Exact ID / reference | Visibility |
|---|---|---|
| Navbar | [`107:6918`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6918) | Visible |
| Breadcrumb Row | [`107:6919`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6919) | Visible |
| Hero Gallery | [`107:6925`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6925) | Visible |
| Thumbnail 2 · Drip irrigation | [`107:6936`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6936) | Visible |
| Thumbnail 3 · Fields | [`107:6937`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6937) | Visible |
| Thumbnail 4 · Machinery | [`107:6939`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6939) | Visible |
| Thumbnail 5 · Nursery | [`107:6940`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6940) | Visible |
| Details Body | [`107:6945`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6945) | Visible |
| 01 · Farm Overview | [`107:6947`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6947) | Visible |
| 02 · FarmExit Evaluation | [`107:6983`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-6983) | Hidden |
| 03 · Farm Specifications | [`107:7020`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-7020) | Visible |
| 04 · Facilities & Equipment | [`107:7037`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-7037) | Visible |
| 05 · Location & Access | [`107:7047`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-7047) | Visible |
| 06 · Documents & Verification | [`107:7065`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-7065) | Visible |
| 07 · Request Band | [`107:7079`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-7079) | Visible |
| Copy | [`107:7081`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-7081) | Visible |
| Actions | [`107:7095`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-7095) | Visible |
| 08 · Related Opportunities | [`107:7101`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-7101) | Visible |
| Footer | [`107:7107`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-7107) | Visible |
| Sticky Action Bar (fixed) | [`107:15212`](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=107-15212) | Visible |

