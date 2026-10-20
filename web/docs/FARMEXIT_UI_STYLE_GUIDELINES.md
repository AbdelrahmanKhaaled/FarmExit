# FarmExit — Public Website UI/UX Style Guidelines

**Version:** 1.0 · **Updated:** 18 October 2026  
**Applies to:** `web/` — public website, three marketplaces, authentication and **My FarmExit** user portal.  
**Does not apply to:** `dashboard/` — its separate visual redesign is postponed.  
**Purpose:** Preserve the original Claude + Figma design language when continuing implementation in Cursor, Codex or another coding agent.

> **Source and verification note:** The measurements below are drawn from the earlier Claude-produced **FarmExit Frontend Implementation Plan**, which recorded an inspection of Figma variables, styles and frames. They have **not been re-extracted from the live Figma file or verified against the current `web/` source in this document-creation session**. Before editing, inspect the actual shared components, CSS/Tailwind tokens and the relevant Figma frame. Never replace an existing approved implementation just because a token is expressed differently here.

## 1. Source-of-truth order

For visual decisions, use this precedence:

1. **Latest explicit operator decisions**, including subsequent changes to what may appear publicly.
2. **Approved, currently implemented `web/` components and design tokens**, where intentionally updated from the original designs.
3. **Approved Figma frame/component/variable** corresponding to the exact page and viewport.
4. These guidelines and the historical Claude audit.

For content, permissions and data exposure, `docs/BACKEND_RULES.md`, applicable product approvals and safe public API contracts take priority over decorative Figma examples. Report genuine conflicts rather than silently guessing.

**Original Figma file:** https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7  
**Repo reference points to inspect:** `web/src/`, any token/global CSS files, existing reusable components and localization files. Do **not** create a parallel design system.

## 2. Brand and visual character

**Design direction:** *Premium Modern Agritech Marketplace* — professional, agricultural, sophisticated, spacious, trustworthy, photograph-led and predominantly light-themed.

- Clean ivory/off-white surfaces, deep agricultural greens, small controlled gold highlights.
- Generous negative space; strong hierarchy; balanced premium editorial composition.
- Rounded cards, precise borders, subtle multi-layer shadows and restrained glass effects.
- Authentic, relevant Egyptian farmland imagery; never unrelated generic photos for a real farm record.
- No cheap gradients, heavy neon, cartoon dashboards, excessive shadows, bounce animations or card-scale effects.
- Keep the **actual FarmExit logo and its existing light/dark, horizontal and icon variants**. Do not redraw the brandmark or change its proportions.
- The Dashboard's ORE CARE-inspired redesign is **not** the source for the public website.

### Core brand colors — Figma primitives

| Role | Token / original Figma alias | Value | Usage |
|---|---|---|---|
| Primary green | `brand/primary` | `#166534` | Main CTAs, primary actions, active navigation, branded features |
| Primary hover | `brand/primary-hover` | `#0F4A26` | Primary button and link hover |
| Deep green | `brand/deep` | `#0F2A1A` | Dark brand surfaces / high-contrast dark areas |
| Accent lime | `brand/accent` | `#65A30D` | Select accents, highlights, search CTAs where the existing design uses them |
| FarmExit gold | `brand/gold` | `#D4A72C` | Restrained premium emphasis, decorative details |
| Page background | `bg/page` | `#F7FAF5` | Overall light background |
| Ivory background | `bg/ivory` | `#F6F4EE` | Alternate editorial sections |
| White | primitive white | `#FFFFFF` | Cards, overlays, controls |
| Favorite / error | `status/favorite` | `#D4483B` | Heart/error state only where semantically appropriate |

**Do not invent specific hexadecimal values** for semantic aliases that have not been verified: `text/primary`, `text/subtle`, `border/default`, `border/subtle`, `border/strong`, `border/focus`, `border/selected`, overlays, glass and status tones. Take their real values from the project/Figma. The earlier Figma audit found **37 color primitives, approximately 70 semantic aliases and 15 overlay/glass colors**.

**Implementation rule:** Components use existing *semantic* CSS variables / Tailwind tokens; avoid scattering raw hex colors across JSX. Do not globally overwrite existing tokens to accommodate a single new page. Check contrast: accent lime is unsuitable for small body copy on white without sufficient contrast.

## 3. Typography

| Locale / special use | Font |
|---|---|
| English (`/en`) | **Manrope** |
| Arabic (`/ar`) | **IBM Plex Sans Arabic** |
| Special ornamental quotation mark only | **Playfair Display** |

The original Figma language collection changes `font/family`, maps English ExtraBold to Arabic Bold, and **zeros tracking for Arabic**. Use the actual font configuration already present in `web/`; do not introduce Cairo or another substitute unless the implemented approved design explicitly uses it.

### Recorded Figma type scale

| Style | Desktop reference | Notes |
|---|---|---|
| Hero display | **84 px** | Semibold, approximately **−4% tracking** in English |
| Statement display | **56 px** | Medium |
| Section H1 | **52 px** | Responsive below |
| H3 | **26 px** | Responsive below |
| H4 | **24 px** | Original style |
| Card title | **22 px** | Original style |
| Row title | **18 px**, bold | Original style |
| Price | **26 px** | Give price strong visual priority |
| Lead body | **19 px / 160% line-height** | Spacious introduction |
| Standard body | **16 px / 165% line-height** | Readability-first |
| Small / caption | **15 px / 14 px** | Contextual details |
| Button label | **14 px**, bold | Consistent across variants |
| Nav label | **15 px**, semibold | Desktop navigation |
| Chip / badge | **13 px / 12 px** | Short labels |
| Overline | **11–13 px** | Tracked uppercase in English; Arabic tracking remains 0 |

There were **56 Figma text styles**. Use their existing utilities when available; the table is a reference, **not** permission to create 56 duplicate classes.

### Responsive headline sizes

| Design token | Desktop 1440 | Tablet 1024 | Mobile 390 |
|---|---:|---:|---:|
| Hero display | 84 | 64 | 42 |
| Statement display | 56 | 44 | 30 |
| Section H1 | 52 | 40 | 30 |
| H3 | 26 | 24 | 22 |
| Lead body | 19 | 18 | 17 |

Use consistent line heights and text wrapping from the relevant Figma frame. Avoid forcing the exact English line breaks onto Arabic.

## 4. Grid, widths and responsive layout

The original Figma audit recorded these **validation viewport widths**: Desktop **1440 px**, Tablet **1024 px**, Mobile **390 px**. The implementation proposal recommended breakpoint transitions at **768 px** and **1280 px**; these transition thresholds are **recommendations, not independently confirmed Figma variables**. Reuse existing project breakpoints where already implemented.

| Layout value | Desktop 1440 | Tablet 1024 | Mobile 390 |
|---|---:|---:|---:|
| Marketing page margin | 120 px | 40 px | 16 px |
| App/marketplace margin | 64 px | 40 px | 16 px |
| Marketing content width | 1200 px | 944 px | 358 px |
| App content width | 1312 px | 944 px | 358 px |
| Grid columns | 12 | 8 | 4 |
| Standard card columns | 3 | 2 | 1 |
| Nav height | 78 px | 72 px | 64 px |
| Section gap | 144 px | 112 px | 80 px |
| Band padding | 128 px | 96 px | 72 px |
| Workspace/sidebar width | 310 px | 0 | 0 |

Original layout primitives also included `layout/content-max: 1280`, `layout/nav-height: 78` and `layout/section-gap: 144`. Marketing desktop grid: **12 columns, 120 px margin, 24 px gutter**. Marketplace/application desktop grid: **12 columns, 64 px margin**, with a **310 px sidebar** where used.

**Responsive intent:** Content expands and reorganizes; do not simply scale desktop UI down. No horizontal overflow, clipped CTAs, unreadable controls or desktop-only fixed widths on mobile.

## 5. Spacing, corners, borders and elevation

The original Figma spacing collection covers **`space/2` through `space/144`**. Read the exact increments from existing tokens; do not assume arbitrary spacing values map to those names.

### Radius tokens from the Figma audit

| Token | px | Token | px |
|---|---:|---|---:|
| `xs` | 3 | `sm` | 8 |
| `md` | 10 | `lg` | 12 |
| `xl` | 14 | `2xl` | 16 |
| `image` | 18 | `3xl` | 20 |
| `card` | 24 | `feature` | 28 |
| `full` | pill | | |

Use **24 px card corners** and **18 px image corners** where the corresponding Figma variants specify them. Match inputs, sheets, buttons and search panels to their respective existing tokens; do not impose one giant radius on everything.

Original effects to preserve by name/intent:

- `Elevation/Premium Rest` — calm multi-layer resting shadow.
- `Elevation/Premium Lift` — controlled, richer hover elevation.
- `Elevation/Card Hover` — card hover treatment.
- `Elevation/Floating Glass` — floating panel with ~24 px blur.
- `Glass/Hero Panel` — hero floating panel with ~28 px blur.
- `Blur/Nav Glass` — ~12 px backdrop blur.
- `Blur/Hero Glass` — ~8 px backdrop blur.
- `Elevation/Search Panel`, `Elevation/Floating Report`.

Use actual existing shadows and glass overlay colors. **Card hover changes border/elevation, never the card scale.** Do not use ungrounded drop shadows or glass everywhere.

## 6. Component design rules

**Reuse the existing approved components first.** The historical Figma library had approximately **140 components with variants** and covered these groups:

| Family | Required consistency |
|---|---|
| Brand/Nav | Real logo, Navbar (guest/signed-in), Footer, locale toggle, navigation states |
| Buttons | Primary / Accent / Outline / Ghost; heights **42 / 46 / 52 px**; hover, pressed, disabled, focus |
| Search | Search Bar (Buy / Rent / Management; row/grid/stacked), search tabs and filters |
| Fields | Search, text input, select, textarea, mobile, OTP, unit (EGP/feddan), range slider |
| Chips/Badges | Filter chips, listing type, request/status, service, audience, notices; state by semantics |
| Cards | Farm Card (Grid/Marketplace, default/hover/selected/saved), management, partnership, journey, request and feature cards |
| Marketplace | Desktop filter panel, tablet/mobile filter drawer, applied filters, sort, results toolbar, empty state, pagination |
| Farm Details | Gallery, spec items, request panel, sticky action bar, map preview, document rows |
| Portal | Workspace navigation, attention/activity rows, request timelines, verification and messages UI |
| Forms/Flows | Stepper, draft indicator, validation alert, photo/document uploader, review summary, sticky mobile actions |
| Overlays | Dialogs, right/left sheets as direction-appropriate, mobile full-screen sheets and confirmation states |

**Original Button sizes:** Small **42 px**, Medium **46 px**, Large **52 px**. 

**Component-state checklist:** `default`, `hover`, `focus-visible`, `pressed`, `disabled`, `loading`, `error`, `empty`, `success` as relevant. Do not add nonfunctional buttons for unsupported product features.

### Public Farm Cards — current product decision overrides old Figma variants

- Preserve the approved card layout, image proportions, hierarchy, listing type, price, save action and hover treatment.
- **FarmExit Score MUST remain visible** on cards, per the operator's later explicit decision (even if an older Figma branch hid it).
- Display only a **real public-release-approved score** returned by the backend, or **“Pending assessment”** when unavailable. Do not manufacture a score or star rating.
- Do not expose internal evaluation notes or private files.
- Sale uses **EGP**; rent uses **EGP per feddan per year**.

## 7. Page-specific layout patterns

### Homepage

Preserve the established composition and its approved imagery. Historical Figma sequence: **Navbar → Hero → About → Journeys → Featured Farms → Management Marketplace → How It Works → Market Insights → Testimonials → CTA → Footer**. Some historic trust/evaluation copy and sample data were later changed; do not restore unsupported claims or fake records simply to replicate a screenshot.

- Hero: high-quality landscape image, readable headline with deliberate composition, integrated/overlaid farm search, restrained glass treatment.
- Featured farms: reuse real public Farm Cards and actual published API data.
- Section transitions: generous vertical rhythm, alternating light page and ivory/white surfaces.
- Do not invent verified statistics, reviews, partnership logos or inspection claims.

### Farm Marketplace

- Desktop: **310 px sticky filter sidebar**; results use approved marketplace card variants.
- Tablet: replace sidebar with **Filters** control + removable chips + drawer; two-column cards.
- Mobile: compact **Filter + Sort** row, bottom-sheet filter panel with **Clear all / Show N**, one-column cards and *Load more* when that matches the existing implementation.
- Backend search, counts, pagination and sorting are authoritative. Keep query state in URL.
- Preserve the three distinct top-level market concepts: **Farm, Management, Partnership**.

### Farm Details

- Desktop Figma: **792 px mosaic gallery** + thumbnails and approximately **384 px sticky request panel**.
- Tablet: full-width image / thumbnail strip and sticky action bar.
- Mobile: swipe gallery, one-column specifications, sticky bottom action bar.
- Public content only. Missing API attributes should produce honest empty/omitted sections, not made-up specifications.

### Management Marketplace and Partnership Marketplace

- Match the existing category-specific card, filter and opportunity/detail visual language.
- Management desktop: filter/sidebar and 3-up opportunity cards; tablet 2-up; mobile 1-up; preview sheet on larger screens and full-screen mobile preview.
- Partnership follows the same design family, with its own opportunity/application language.
- **At the latest implementation status, public discovery APIs for these two marketplaces were not approved**: keep informational states honest; no sample opportunities masquerading as live backend listings.

### Authentication and My FarmExit

- Auth: **~480 px desktop dialog**, tablet dialog, mobile full-screen sheet.
- My FarmExit: desktop **310 px workspace sidebar**, mobile bottom tab bar for **Overview / Activity / Saved / Messages / Account** where the established implementation uses it.
- Multi-step flows: desktop vertical stepper and form with contextual aside; mobile compact stepper, **56 px fields**, sticky **Back / Continue** actions.
- The customer portal belongs to the public FarmExit visual system; it must **not** look like an admin dashboard template.

## 8. RTL and English/Arabic localization

**Required locales:** `/en` (LTR) and `/ar` (RTL), through the existing `next-intl` setup.

- Set the correct document `lang` and `dir` from locale.
- Use one component tree for both languages; avoid duplicated “Arabic page” components.
- Prefer CSS logical directions (`start/end`, `ms/me`, `ps/pe`, `text-start`) over `left/right` assumptions.
- Mirror **directional navigation** icons and arrows; do **not** mirror photos, logo, brandmark, numbers or non-directional icons.
- Arabic uses **IBM Plex Sans Arabic** and zero letter spacing/tracking where language tokens specify it.
- Keep numbers readable with **Western digits** in Arabic (e.g. `Intl.NumberFormat('ar-EG-u-nu-latn')`), following the historical guide.
- English price example: `EGP 42,800,000`; Arabic: `42,800,000 ج.م`; area: `95 feddans` / `95 فدان`.
- Isolate LTR tokens such as the brand name and phone numbers using `<bdi>` where appropriate.
- Translate interaction labels, validation, empty/error states, statuses and breadcrumbs. Use the established Arabic glossary; historical My FarmExit term was **حسابي**.
- Audit RTL on **desktop, tablet and mobile**, even though the original Figma Arabic boards were primarily at 1440 px.

## 9. Motion and interaction

Historical Figma interaction conventions:

| Interaction | Duration / behavior |
|---|---|
| Buttons / cards hover | **150–250 ms** ease-out, color/border/elevation change |
| Overlays / dialogs | **200–300 ms** fade/dissolve/slide |
| Screen / flow step | **300 ms** ease-out (Client Demo sometimes 350 ms) |
| Card transform | **No scale, bounce or distracting movement** |
| Focus | Visible semantic lime focus outline/ring |

Use accessible reduced-motion behavior; avoid animated counters, floating icons or parallax unless an approved screen specifically includes them. Interactions should feel intentional, premium and calm.

## 10. Images and asset rules

- Prefer the images, focal crops and aspect ratios present in the approved Figma **Image Library** and existing `web/` assets.
- Use `next/image` and responsive `sizes` where appropriate; preserve subject framing and focal point.
- Public listing media must be licensed and explicitly approved. Private uploads stay private.
- If a listing has no permitted public photo, use a neutral, brand-consistent placeholder **without pretending it is that specific farm**.
- Avoid watermarks, stretched images, screenshot-quality assets and unrelated agriculture stock photography.
- Preserve image overlay contrast without flattening the hero into a dark unreadable panel.

## 11. Accessibility and quality

Target **WCAG 2.2 AA** where feasible.

- Semantic page structure, heading hierarchy, clear accessible names.
- Touch targets **at least 44 px**, especially on mobile.
- Forms with labels, real validation feedback and associated errors.
- Dialog/sheet: focus management, Escape close, scroll lock and trigger focus return.
- Status always communicates meaning in **text**, not by color only.
- Proper keyboard navigation in RTL/LTR; respect `prefers-reduced-motion`.
- Validate visual contrast on photos, glass panels and small lime labels.
- Maintain the existing responsive design and run existing typecheck, lint, build and Playwright tests after changes.

## 12. Historical Figma screen pointers

These node IDs were reported in the earlier Claude audit. Check their current availability and version before relying on them.

| Screen | Reported Figma node IDs / page |
|---|---|
| Homepage | `24:2`, `77:1427`, `81:1922` — 1440 / 1024 / 390 |
| Farm Marketplace | `31:7`, `96:1093`, `96:12274`; drawer `96:13001`, empty `96:13502` |
| Farm Details | `31:1393`, `107:6917`, `107:15222` |
| Management Marketplace | `116:16067`, `116:16099`, `116:16131`; preview `118:1593` |
| Authentication | `02 · Authentication` |
| My FarmExit | `03 · My FarmExit` |
| Add Farm | `04 · Add Farm` |
| Management Request | `05 · Management Request` (older v1 review state) |
| Professional Experience | `06 · Professional Experience` |
| Partnership | `07 · Partnership` |
| Arabic website | `08 · Arabic Web + Client Demo` |
| Supporting | Design System, Icon Library, Image Library, Components, Source of Truth |

For any component redesign or new page: identify its closest existing component and target Figma frame, compare at **1440 / 1024 / 390**, confirm text metrics, layout widths, card sizes, image crops, border/shadow, and RTL behavior. Do not claim pixel-perfect parity without actual screenshot comparison.

## 13. Implementation rules for Codex / Cursor / Claude

1. **Read this file and inspect the existing `web/` code before editing.**
2. **Preserve approved UI by default.** Change only the affected component/feature.
3. **Reuse the current design system** rather than adding new independent Tailwind utility patterns.
4. **Do not hardcode new visual constants** when semantic tokens already exist.
5. **Use the approved Figma frame** as the visual comparison baseline when accessible.
6. **Do not confuse design examples with live data.** The production website renders real public API data only.
7. **Do not change product permissions to match an old mockup.** FarmExit privacy and mediation rules win.
8. **Preserve FarmExit Score on public farm cards** under the current approved public projection rule.
9. **Maintain full EN/AR and mobile/tablet/desktop quality.**
10. **Never alter `dashboard/` styling** during public website design work.
11. **Run relevant quality checks** and identify any visual changes with before/after screenshots where possible.
12. **When a current component and old Figma differ**, determine whether the difference was an approved subsequent change; do not roll it back without asking.

### One-line agent instruction

> Follow `web/docs/FARMEXIT_UI_STYLE_GUIDELINES.md` as the visual continuity reference for `web/`. Inspect existing design tokens/components and corresponding Figma frames before changes. Extend the current system; do not redesign it or introduce a new visual language.

---

**Document provenance:** Earlier Claude Figma audit (reported variables, text styles, layouts, frames and components) + later FarmExit implementation decisions through Frontend Phase 9. This document is a continuity guide, **not** a verified export of the current Figma JSON or a substitute for checking the latest repository.
