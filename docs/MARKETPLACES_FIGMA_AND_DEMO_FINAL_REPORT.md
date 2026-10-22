# Marketplaces Figma & demo final report

**Date:** 2026-10-22  
**Ports:** Website 3000, Dashboard 3002, API 4001 (4000 untouched)

---

## 1. Design reference inspection

| Expected path | Status |
|---------------|--------|
| `docs/design/management/page-01.png` … `page-06.png` | **Not present** in workspace at implementation time (`docs/design` missing) |
| `docs/design/partnership/page-01.png` … `page-06.png` | **Not present** |

Implementation follows the written Figma brief from the task (sidebar filters, 3-column cards, mediation banner, owner CTA, partnership hero search, detail drawer/page, auth/apply patterns) and existing FarmExit tokens. **Re-sync PNGs into `docs/design/` for a pixel-diff pass.**

---

## 2. Page-by-page comparison (spec vs prior UI)

| Design area | Before | After |
|-------------|--------|-------|
| Management listing | Plain `Surface` text cards, 2-col grid, no filters | Sidebar filters, toolbar + sort, 3-col photo cards, mediation banner, drawer, owner gradient CTA |
| Partnership listing | Plain cards + white owner box | Green hero search row, sidebar filters, gold objective box cards, detail route, owner CTA |
| Management apply (PDF p3–5) | N/A | **Not implemented** — drawer explains gap; no fake Apply |
| Partnership detail (PDF p2/6) | None | `/partnerships/opportunities/[id]` with safe fields + apply/sign-in CTA |
| Auth modals (PDF) | Existing sign-in route | Unchanged logic; partnership apply uses `returnTo` |

---

## 3–4. Management & partnership UI changes

- **Management:** `ManagementMarketplace`, `FilterSidebar`, `ManagementDetailDrawer`, `opportunity-marketplace.css`
- **Partnership:** `PartnershipHeroSearch`, `PartnershipMarketplace`, `PartnershipOpportunityPage`
- **Shared:** illustrative image label, verified badge, pagination, mediation + owner CTAs
- **Pages:** `management/page.tsx`, `partnerships/page.tsx` wired to server fetch + client URL filters

---

## 5. Card design

- 16:10 media area, placeholder SVG, “Illustrative image” label
- Badge overlay (management / partnership)
- Highlight box for management type or partnership objective
- Verified/published line
- Primary “View” action (drawer or detail link)

---

## 6. Filter sidebar & API mapping

**DTO:** `PublicOpportunityQueryDto`  
**Builder:** `buildPublicOpportunityWhere` + `publicOpportunityOrderBy`

| Query param | Server filter |
|-------------|----------------|
| `governorate`, `area` | `farm.governorate`, `farm.areaName` |
| `farmType` | `farm.farmType` (vegetable/fruit/livestock/mixed) |
| `minArea`, `maxArea` | `farm.areaFeddan` range |
| `professionalNeed` | `managementDetail.professionalNeed` |
| `managementType` | JSON `managementTypes` string_contains |
| `experienceLevel` | `managementDetail.experienceLevel` |
| `objective`, `partnerType` | partnership JSON string_contains |
| `q` | farm name / governorate / area contains |
| `sort` | newest (publishedAt), areaAsc, areaDesc |
| `page`, `pageSize` | server pagination |

Publication predicates unchanged: `approved` + `public` + `publishedAt` + approved review + live farm.

**Public detail:** `GET /public/management/:id`, `GET /public/partnerships/:id`

---

## 7–8. Sorting & pagination

- **LIVE API VERIFIED:** `GET /api/v1/public/management?page=1&pageSize=3&sort=newest` returns filtered DTO with `farmType`, `experienceLevel`, etc.
- URL query persistence via `parseOpportunityFilters` / `filtersToSearchParams`

---

## 9. Management drawer

- Accessible: backdrop, Escape, focus on close, scrollable panel, RTL via `inset-inline-end`
- Shows only API fields; **management apply gap** message in drawer
- **BLOCKED:** No backend Management Application API

---

## 10. Partnership detail & application flow

- Route: `/[locale]/partnerships/opportunities/[id]`
- Guest → `sign-in?returnTo=...`; signed-in → `/my/applications/new?parentId={id}` (existing API)
- **CODE VERIFIED ONLY** for full apply E2E in browser this pass

---

## 11. Management Apply

Not exposed as a working CTA. Documented in drawer copy (`managementApply.gap`).

---

## 12. Demo OTP diagnosis

| Check | Result |
|-------|--------|
| `NODE_ENV` | `development` (**LIVE**) |
| `DATABASE_URL` | loopback `/farmexit` (**LIVE**) |
| `CLIENT_DEMO_OTP_*` in `api/.env` | **Absent** — demo code `123456` will **not** activate |

**Fix (safe):** Add to `api/.env`, restart `npm run dev:api`:

```env
CLIENT_DEMO_OTP_ENABLED=true
CLIENT_DEMO_OTP_CODE=123456
CLIENT_DEMO_OTP_ALLOWED_MOBILES=+201099887701,+201099887702,+201099887703,+201099887704,+201099887705
```

Web hint (optional):

```env
NEXT_PUBLIC_CLIENT_DEMO_OTP_HINT_MOBILES=+201099887701,+201099887702,+201099887703,+201099887704,+201099887705
```

**Disable after demo:** `CLIENT_DEMO_OTP_ENABLED=false` + API restart.

If `NODE_ENV=production`, demo OTP correctly **refused** — use isolated non-production API for demos.

---

## 13. WhatsApp

- Mounted via `SiteChrome` in `[locale]/layout.tsx`
- **Change:** When no `NEXT_PUBLIC_FARMEXIT_WHATSAPP_NUMBER`, show **non-sending placeholder** FAB unless `NEXT_PUBLIC_FARMEXIT_WHATSAPP_PLACEHOLDER=false`
- Real link: set `NEXT_PUBLIC_FARMEXIT_WHATSAPP_NUMBER` (digits only) and rebuild website
- **CODE VERIFIED ONLY** on port 3000 until rebuild

---

## 14. Demo content quality

**LIVE API** shows titles unsuitable for unqualified client demos, e.g.:

- `Stage 1D dedicated draft` (id **715**)
- Development-style goals/text on published rows

**Do not auto-unpublish or edit** without staff authorization. For demos: publish only curated synthetic opportunities or filter demo walkthrough to known-good IDs.

---

## 15. EN/AR & responsive

- New namespace `opportunityMarketplace` (en/ar)
- Layout: 1 / 2 / 3 columns; mobile filter drawer toggle
- **LIVE BROWSER VERIFIED:** not run (workspace rule: no browser automation)

---

## 16. Screenshots

None captured this pass.

---

## 17. Files changed (main)

**API:** `public-opportunity-query.dto.ts`, `public-opportunity-query.ts`, `public-opportunity-map.ts`, `public-opportunity.dto.ts`, both `*requests.service.ts`, both public controllers, `public-opportunity-query.spec.ts`, `public-marketplaces.spec.ts`

**Web:** `lib/opportunities/public-opportunity.ts`, `features/opportunity-marketplace/*`, `management/page.tsx`, `partnerships/page.tsx`, `partnerships/opportunities/[id]/page.tsx`, `FloatingWhatsApp.tsx`, `i18n/messages.ts`, `messages/*/opportunityMarketplace.json`

---

## 18. Tests & builds

| Check | Result |
|-------|--------|
| API jest `public-opportunity\|public-marketplaces` | **16 passed** |
| Web `npm run typecheck` | **OK** |

---

## 19. Remaining blockers

1. Add design PNGs under `docs/design/` for visual QA vs Figma  
2. Enable `CLIENT_DEMO_OTP_*` in `api/.env` + restart API  
3. Rebuild/restart website on 3000 for marketplace + WhatsApp UI  
4. Curate demo publication content (avoid ids like **715** in client walkthrough)  
5. Management professional apply workflow still **BLOCKED** (backend)  
6. Partnership apply E2E **needs LIVE BROWSER VERIFIED**  
7. Public farm photos not in API — illustrative placeholder only  

---

## 20. Client-demo readiness verdict

**Conditionally ready** after: (1) OTP env + API restart, (2) website rebuild on 3000, (3) demo content curation, (4) optional PNG pixel review once assets are in repo.

Functional marketplace filtering and UI structure are **LIVE API VERIFIED**; visual parity with PDFs is **CODE VERIFIED ONLY** until PNGs are available and browser-checked.
