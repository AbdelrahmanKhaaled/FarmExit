# Website — Existing API Integration Completion (WEB-005 / WEB-006)

**Date:** 2026-10-22  
**Scope:** `web/` only. No backend, dashboard, or schema changes. No commits.

---

## 1. Supported marketplace filters (public API)

Backed by `GET /marketplace/farms` (`MarketplaceQueryDto`) and forwarded unchanged by `web/src/app/api/marketplace/farms/route.ts`:

| UI / URL | API param | Notes |
|----------|-----------|--------|
| Buy / Rent (`listing=rent`) | `listingType` | Default sale when omitted |
| Governorate (`gov`) | `governorate` | Exact API label via `GOVERNORATE_API_LABEL` |
| Area (`area`) | `area` | Exact `farm.areaName`; requires governorate in UI |
| Farm size slider | `minArea`, `maxArea` | Feddan, two decimals |
| Price slider | `minPrice`, `maxPrice` | Whole EGP; sale vs rent field per API |
| Quick Sale: installments / exchange | `saleMethods` | Comma-separated `installment`, `exchange` |
| Exchange asset checkboxes | `exchangeAssetTypes` | `factory`, `villa`, `apartment`, `car` |
| Sort | `sort` | UI: `newest`, `priceAsc`, `priceDesc` (API also supports `oldest`, `areaAsc`, `areaDesc` — invalid URL values ignored) |
| Pagination | `page`, `pageSize` | Client uses page size 9 |

**Not wired in UI (API exists):** free-text `q` search (farm name, governorate, area, description). No new UI added in this pass.

---

## 2. Unsupported filters — presentation

**Not in public API:** farm type, crop type, water source, irrigation method, energy source.

**WEB-005 changes:**

- `FilterPanel`: those sections are **visually disabled** with `filters.unavailableSection` (EN/AR).
- Header search no longer sets `farmTypes`; farm-type quick filter replaced with unavailable notice.
- `toSearchParams` **no longer writes** unsupported keys (`type`, `water`, `irrigation`, `energy`, `crop`) so shareable URLs drop them on the next navigation.
- Legacy URLs may still **parse** unsupported values → banner `filters.unsupportedPublic` + **Remove unsupported filters** button.
- `supportedAppliedCount` / filter badge excludes unsupported facets.
- Results always from **server** via `marketplaceStateToApiQuery` (no client-side-only filtering).

---

## 3. Quick Sale filter compatibility

Unchanged Stage 1E behavior preserved:

- `saleMethods` and `exchangeAssetTypes` map 1:1 to API.
- OR within group, AND between groups, AND with location/price/area/listing type.
- Cash / mixed proposal semantics unchanged (no new filter checkboxes).

---

## 4. Public navbar session (WEB-006)

**Gap:** Public pages used client-only `Navbar` / `PublicNavbar`, causing a **guest loading flash** and relying on client `/api/auth/me` on first paint.

**Fix:**

- `PublicNavbar` is a **server component** calling `getWebsiteSession()` and passing `user` or `sessionResolved` to `Navbar`.
- `useNavbarSession` respects `sessionResolved` (no pending spinner for known guests); still refreshes on focus/visibility for login/logout in another tab.
- Applied on: home, partnerships, management, farms listing (already `instant = false`), farm detail (reuses existing session fetch).
- HttpOnly cookies only; no tokens in client JS; website OTP session separate from dashboard JWT.

---

## 5. Files changed

| Area | Files |
|------|--------|
| Marketplace filters | `FilterPanel.tsx`, `MarketplaceResults.tsx`, `MarketplaceSearch.tsx`, `url-state.ts`, `messages/en|ar/marketplace.json` |
| Navbar | `PublicNavbar.tsx`, `use-navbar-session.ts`, `Navbar.tsx`, `page.tsx`, `partnerships/page.tsx`, `management/page.tsx`, `farms/[slug]/page.tsx` |
| Prerender | `instant = false` on home, partnerships, management |

---

## 6. EN/AR

New/updated keys: `filters.unsupportedPublic`, `filters.unavailableSection`, `filters.clearUnsupported`. `check-messages` passes.

---

## 7. Tests and results

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | 4/4 pass (`message-merge` only) |
| `npm run build` | Pass (after `instant = false` on cookie-backed public routes) |
| Live browser / Playwright | **Not run** in agent session |
| Marketplace mapping unit tests | **BLOCKED** — Node unit runner cannot resolve `@/` imports without extra harness; mapping verified via **STATIC** typecheck + existing Stage 1E API tests on backend |

---

## 8. Remaining website integration issues

- Text search `q` not exposed in marketplace UI.
- Area filter depends on exact backend `areaName` strings (curated governorate area lists in UI).
- Sort options `oldest` / area sorts not exposed in UI (optional).
- Legacy bookmark URLs with unsupported params until user clears or navigates.
- Public management discovery page still informational only (blocked API).

---

## 9. Features still BLOCKED by missing backend APIs

Per `CROSS_APP_INTEGRATION_GAP_MAP.md` (unchanged): user notifications, global documents catalog, public professional/management discovery, etc.

---

## 10. Readiness verdict

**COMPLETE — CODE VERIFIED** for WEB-005 and WEB-006 within existing API contracts.

Recommend manual UAT on `:3000`: marketplace filters (EN/AR), Quick Sale filters, pagination with filters, signed-in navbar on `/`, `/farms`, logout → guest state, and farm detail CTAs.
