# FarmExit Web

The FarmExit website: Next.js App Router, TypeScript (strict), Tailwind CSS v4 and next-intl.
Phase 0.1 is the foundation; Phase 1 adds the shared design-system components; Phase 2 builds the Homepage
(`/en`, `/ar`); Phase 3 the Farm Marketplace (`/[locale]/farms`); Phase 4 Farm Details (`/[locale]/farms/[slug]`)
with the FarmExit Score. The other feature pages come later.

The legacy HTML prototype at the repository root (`../index.html`, `../app.js`, …) is kept untouched as a
reference. The product Source of Truth is `../FARMEXIT_SOURCE_OF_TRUTH.md`.

## Commands

| Command             | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `npm run dev`       | Development server on http://localhost:3000                            |
| `npm run build`     | Production build                                                       |
| `npm run typecheck` | Generates route types, then `tsc --noEmit`                             |
| `npm run lint`      | ESLint + physical-direction CSS check + message-key parity check       |
| `npm run test:e2e`  | Playwright smoke tests (builds and starts the app on port 3100)        |
| `npm run tokens`    | Regenerates `src/styles/tokens.css` from `tokens/figma-variables.json` |
| `npm run format`    | Prettier                                                               |

First Playwright run on a new machine: `npx playwright install chromium`.

## Locales

- `/en`: English, `dir="ltr"`, Manrope
- `/ar`: Arabic, `dir="rtl"`, IBM Plex Sans Arabic. Marketplace and Farm Details are tested in Arabic at all three
  breakpoints; Homepage and shared components are tested in Arabic at desktop 1440 only
- `/` redirects by cookie, then `Accept-Language`, then `en` (technical default; the product default is a pending decision)

Copy lives in `messages/<locale>/<namespace>.json`. English is the reference shape; `npm run lint` fails if
Arabic is missing a namespace or key. Never hardcode user-facing copy in components.

## Design tokens

`tokens/figma-variables.json` is a verbatim extract of the Figma variables, text styles and effect styles
(file `5orM3z9jyhuJdc0XW63Vs7`). `scripts/build-tokens.mjs` turns it into:

- `src/styles/tokens.css`: CSS custom properties, the Tailwind `@theme`, `type-*` text-style utilities and
  `effect-*` effect utilities
- `src/styles/token-manifest.generated.ts`: used only by the dev Token Preview

Rules:

- Only Figma tokens exist in the theme (default Tailwind colors, radii, shadows and font sizes are removed).
- One spacing unit is 1px, so `p-24` equals Figma `space/24`.
- Breakpoints: base = mobile (390 design), `tablet:` ≥ 768px (1024 design), `desktop:` ≥ 1280px (1440 design).
- Arabic follows the Figma `Language` collection: font family switches, ExtraBold maps to Bold, bound tracking becomes 0.

Token Preview (development only, 404 in production): http://localhost:3000/en/dev/tokens and
http://localhost:3000/ar/dev/tokens

## Components (Phase 1)

Shared primitives built from the Figma Components page. Each file names its Figma source component.

| Folder               | Contents                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `components/brand`   | `Logo`: Horizontal / Full / Icon only × Light / Dark (Figma exports in `public/brand`)             |
| `components/icons`   | `Icon` and the 49 approved Figma icons (`currentColor`; arrows mirror in RTL)                      |
| `components/ui`      | `Text`, `Button`, `ButtonLink`, `BlockButton`, `IconButton`, `LanguageToggle`, `Avatar`,           |
|                      | badges (`StatusBadge`, `ListingTypeBadge`, …), chips, form fields, `Card`, `Surface`, `GlassPanel` |
| `components/overlay` | `Dialog` and `Sheet` (bottom / end) on the native `<dialog>`; motion in `styles/overlays.css`      |
| `components/layout`  | `Container`, `Section`, `SectionHeader`, `Navbar` (+ `MobileMenu`), `Footer`, `site-links`         |

Rules:

- `cn()` joins classes without merging, so never pass a `className` that fights a component's own utility (for
  example `hidden` on a `Button`). Put responsive visibility on a wrapper element.
- Navbar and Footer destinations live in `components/layout/site-links.ts`; update a path there when its page lands.

Component Preview (development only): http://localhost:3000/en/dev/components and
http://localhost:3000/ar/dev/components. `FX_DEV_PREVIEW=1` at build time keeps the dev pages in a production
build; `npm run test:e2e` sets it so the components are tested on `next build`. Never set it for a deployed build.

## Homepage (Phase 2)

- Sections live in `src/features/home/` (one file per Figma section); shared cards in `src/features/farms/FarmCard.tsx`
  and `src/features/management/RequestCard.tsx`. Copy is in `messages/<locale>/home.json` (card labels in `farm.json`
  and `management.json`); `src/features/home/data.ts` holds only structure, image files and crop positions.
- Images are the approved Figma image fills, unchanged, in `public/images/home/`. Photo shades and the How it works
  band gradient are Figma fills exposed as `fx-*` utilities in `src/styles/imagery.css`.
- All figures (proof stats, prices, insights, applicants) are sample content from the design and must come from the
  CMS in production. Links to pages that are not built yet (`/management`, `/partnerships`, `/sign-in`,
  `/list-your-farm`, …) return 404 for now.

## Marketplace (Phase 3)

- `/[locale]/farms`: search, filters (desktop sidebar; drawer on tablet and mobile), sort, pagination on desktop and
  tablet, "Load more" on mobile. Code in `src/features/marketplace/`; card in `src/features/farms/MarketplaceFarmCard.tsx`.
- The URL is the source of truth (`url-state.ts`): filtered views are shareable and survive back/forward. The latest
  query is also kept in `sessionStorage` so Farm Details "Back to results" returns to it.
- Listings come from `FarmMarketplaceSource` (`src/lib/data/marketplace.ts`); `src/lib/data/sample/farm-listings.ts`
  is the sample adapter (9 sale + 3 rent listings) until the API exists.

## Farm Details (Phase 4)

- `/[locale]/farms/[slug]`: every sample listing is prerendered; an unknown slug is a 404 (`ensureStatic =
'navigation'` makes the first request wait for `notFound()` instead of serving the App Shell).
- Sections live in `src/features/farm-details/`: gallery with "View all photos" dialog, overview and key facts,
  specifications, facilities, location preview (approximate area only, never the exact pin), documents, request band
  and similar farms. Desktop has a sticky Request Panel; tablet and mobile have an inline Price & Actions card and a
  fixed Sticky Action Bar (mobile always, tablet once the card scrolls away). The hearts share one Save state.
- Owner contact always goes through FarmExit: requests start at `/sign-in?next=…`; no phone, email or WhatsApp links.
- Read model: `FarmDetailsSource` (`src/lib/data/farm-details.ts`); sample adapter in
  `src/lib/data/sample/farm-details.ts`. Wadi El Natrun is the designed farm with full content; the other listings
  have marketplace data only, and any section without data is hidden.

## FarmExit Score

FarmExit's own evaluation of a farm, never a customer rating: every placement says so ("FarmExit's own evaluation —
not a customer rating"). Components in `src/features/farms/FarmExitScore.tsx`: the score card (Homepage and
Marketplace cards, Farm Details Request Panel and Price & Actions card), the glass chip on the gallery and the Sticky
Action Bar line. Only listings with an approved sample value show a score (`score: null` hides it). There is no
methodology, factor breakdown or verification claim: the scoring method is pending business validation.

## RTL rules

- Direction comes from `<html dir>`. There are no Arabic-specific components.
- Use logical utilities only: `ms/me`, `ps/pe`, `start/end`, `text-start/end`, `rounded-s/e`, `border-s/e`.
  ESLint rejects physical utilities (`ml-`, `pl-`, `left-`, `text-left`, …) in `className`, `cn()`, `clsx()` and
  `cva()`, and `scripts/check-direction.mjs` rejects physical properties in hand-written CSS.

## Structure

```
src/
  app/[locale]/          locale root layout (lang, dir, fonts, intl provider), Homepage, farms, farms/[slug], dev pages
  components/            design-system primitives and layout (Phase 1)
  features/              domain features: home, marketplace, farms (cards, score), farm-details, …
  i18n/                  routing, request config, navigation, message loader
  lib/domain/            domain types, enums, statuses (contracts only)
  lib/data/              repository interfaces and read models; sample/ holds the sample adapters
  lib/auth/              authentication contracts (no provider chosen)
  lib/intent/            protected-action intent contracts
  styles/                generated tokens
  proxy.ts               next-intl locale routing (Next.js 16 "proxy", formerly middleware)
messages/{en,ar}/        14 namespaces (English is the reference shape)
tokens/                  Figma token extract
scripts/                 token generator and lint checks
tests/e2e/               Playwright: smoke, components, home, marketplace, farm-details
```
