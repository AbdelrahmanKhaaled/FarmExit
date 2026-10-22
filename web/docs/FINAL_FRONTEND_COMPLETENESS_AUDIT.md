# FarmExit — Final Frontend Completeness Audit (Phase 10A)

**Date:** 2026-10-21  
**Mode:** Read-only — no source changes, migrations, seeds, test records, commits, or full rebuild.  
**Scope:** Website frontend (`web/`) through Phase 9E-C, against approved requirements, `docs/BACKEND_RULES.md`, Figma references, and implemented BFF/API contracts.  
**API baseline:** `http://127.0.0.1:4001/api/v1` (port 4001 per project rules).

---

## Executive answer

**Is any required frontend functionality still missing, disconnected, mocked, or blocked by backend limitations?**

**Yes — but mostly in known, bounded areas.** Core authenticated and public flows are **implemented and wired to real BFF routes** (not fake success for primary writes). Gaps fall into: (1) **no approved backend** for notifications and user-wide documents hub; (2) **informational** public Management/Partnership “marketplaces” (by design); (3) **messaging inbox richness** and **live three-party realtime** pending API/product test fixtures; (4) **marketplace filter** fields without public API support; (5) **labeled sample/illustrative** homepage and hero content; (6) **manual UAT** not yet executed with a configured OTP account.

**Final recommendation:** **READY FOR MANUAL UAT** — proceed with structured UAT using the checklist below, while tracking P0/P1 items. This is **not** a claim of 100% functional or visual completion. Separate track: **BLOCKED BY BACKEND DECISIONS** for notifications API, user document catalog, and public opportunity discovery. **FRONTEND FIXES REQUIRED** only for **P1** polish/enrichment once contracts exist (not for blocking core portal navigation).

---

## 1. Documentation consulted

| Document | Use in this audit |
|----------|-------------------|
| `docs/BACKEND_RULES.md` | Mediation, location privacy, no invented trust, documents private, sample data rules |
| `web/docs/FIGMA_SCREEN_INVENTORY.md` | Route inventory, informational management/partnership pages, API boundary notes |
| `web/docs/PHASE10_QA_REPORT.md` | Integration matrix, Playwright evidence, authenticated-test blockers |
| `web/docs/STAGE1E_IMPLEMENTATION_REPORT.md` | Quick Sale / exchange / marketplace filter contracts |
| `web/docs/PHASE8_VISUAL_REPORT.md` | Partnership/proposals scope, blocked owner decisions, honest public pages |
| `web/docs/PHASE9E_B_FINAL_MESSAGING_REPORT.md` | Messaging QA verdict, live E2E blocked, inbox visual gaps |
| `web/docs/PHASE9E_C_FIGMA_VISUAL_VERIFICATION.md` | Figma pack on disk (`web/figma-baselines/phase9/`, gitignored) |

Earlier phase reports were used only where cited above.

---

## 2. Route and module inventory

**Filesystem:** `web/src/app/**/page.tsx` — **83 files** (includes duplicate path casing on Windows and parallel `@auth` intercept routes). **~40 distinct product locale routes** plus `dev/*` and auth intercepts.

**BFF:** `web/src/app/api/**` — auth, farms, media, facilities, listing requests, sale terms, marketplace, saved, farm-details requests, management, professional profile/capabilities/verification, partnership requests/applications, purchase proposals, request documents, communication cases/messages/realtime-ticket.

### Completion matrix (A–E)

| Module | Primary routes | Status | Class | Evidence |
|--------|----------------|--------|-------|----------|
| Homepage | `/[locale]/` | **E** with labeled samples | **D** / **C** | `FeaturedFarms` from published API; `ManagementSection`, `MarketInsights`, `Testimonials`, hero proof figures use **sample content notes** (`sampleContentNote`) |
| Farm marketplace | `/[locale]/farms` | **E** | **D** | URL-driven filters, API list, mobile load-more; filters without public API fields cannot apply server-side (Phase 10) |
| Farm details | `/[locale]/farms/[slug]` | **E** | **D** | Live slug lookup; `MapPreview` stylized (not live map); sections collapse when no data; illustrative photos flagged |
| Farm inquiry (details request) | `/my/farm-details-requests/new`, `/[id]` | **E** | **D** | BFF `farm-details-requests`; guest/sign-in gates |
| Authentication & profile | `/sign-in`, `/auth/complete-profile`, `@auth` intercept | **E** | **D** | OTP BFF, session refresh, profile completion; no live OTP account in env (Phase 10) |
| My FarmExit dashboard | `/my` | **E** | **D** | Overview links; `requireCompletedProfile` on portal |
| My farms | `/my/farms`, `/my/farms/new`, `/my/farms/[id]` | **E** | **D** | CRUD BFF; role-gated edit |
| List farm (Quick Sale, installments, exchange) | `/my/farms/[id]/list` | **E** | **D** | `AddFarmWizard` + `sale-terms` BFF (Stage 1E); `changesRequested` resubmit path in wizard |
| Listing tracking | `/my/requests`, `/my/requests/[id]` | **E** | **D** | Listing request statuses; resume/changes links to wizard |
| Purchase proposals | `/my/proposals`, `/new`, `/[id]` | **E** | **D** | Cash/installment/exchange/mixed/co-purchase; fail-closed without sale terms |
| Saved farms | `/my/saved` | **E** | **D** | `GET /marketplace/saved` via `apiFetchWebsite` |
| Management (owner) | `/my/management`, `/new`, `/[id]` | **E** | **D** | Private request APIs |
| Public management “marketplace” | `/management` | **C** | **B** | Informational + CTAs; **no live opportunity API** |
| Professional profile & verification | `/my/professional`, `/verification`, `/[id]` | **E** | **D** | Profile, capabilities, verification requests + documents |
| Partnership (owner) | `/my/partnerships`, `/new`, `/[id]` | **E** | **D** | Phase 8 wizard; owner application decisions **not** invented |
| Partnership (applicant) | `/my/applications`, `/new`, `/[id]` | **E** | **D** | Requires known `parentPartnershipRequestId`; no public discovery |
| Public partnership “marketplace” | `/partnerships` | **C** | **B** | Informational + owner CTA |
| Messaging (inbox + thread) | `/my/messages`, `/my/messages/[caseId]` | **E** | **D** / **B** | Live `GET/POST` cases/messages; Socket ticket + `ConversationView`; inbox shows case/request refs only |
| Request-scoped messaging entry | Tracking/detail surfaces + `OpenCommunicationCaseButton` | **E** | **D** | Opens case when staff has created one |
| User documents hub | `/my/documents` | **B** | **B** | `PortalEmpty` + `documents.gapNote` — no user-wide catalog API |
| Per-request documents | Embedded in farm/listing/partnership/professional flows | **E** | **D** | `RequestDocumentsPanel` + `/api/requests/[id]/documents` |
| Notifications | `/my/notifications` | **B** | **B** | `PortalEmpty` “coming soon”; no website notifications API |
| Account / profile | `/my/profile` | **E** | **D** | Profile read/update via auth BFF |
| EN/AR + RTL | All `[locale]` routes | **E** | **D** | `next-intl`, RTL layout; messaging visual AR in stage9b artifacts |
| Dev / visual only | `/dev/components`, `/dev/tokens`, `web/tests/visual/app/.../phase5`, `phase9b` | N/A | **C** | Not product UAT scope |

---

## 3. Missing frontend requirements (category A — implementable with existing APIs)

| ID | Gap | Notes |
|----|-----|-------|
| A1 | **Public navbar session** | Phase 10: public account navbar may not reflect current session on all public pages — verify in UAT; fix is frontend/BFF session read if confirmed broken |
| A2 | **Messaging inbox UX vs Figma** | Functional list works; **previews, unread, thumbnails, attachments** need API fields — partial UI can be built only when contract exposes them (see B2) |
| A3 | **Marketplace filters (farm type, crop, water, irrigation, energy, area)** | UI may expose or imply filters; **public listing API does not support all fields** — hide, disable, or document as unsupported (product choice) |
| A4 | **Portal copy polish** | Raw enum/date strings in some portal areas (Phase 10) — formatting/i18n only |
| A5 | **Listing `changesRequested` deep recovery** | Wizard supports resubmit and `ListingTracking` links with `step=6`; **full draft rehydration across all steps** not live-verified — UAT may surface edge gaps |

No evidence was found of **primary action buttons with `href="#"`** or widespread dead controls in feature code (read-only grep). `BackToResults` uses a React `noop` for `useSyncExternalStore` only.

---

## 4. Broken or disconnected controls

| Finding | Severity | Status |
|---------|----------|--------|
| Saved farms / marketplace save on cards | — | Connected to `/api/marketplace/saved` (anonymous prompts sign-in) |
| Proposal create without sale terms | — | Fail-closed (Phase 10 fix) |
| Communication send | — | `POST` messages + optional realtime merge after REST commit |
| `/phase9b` visual fixture | Low | Lives under `web/tests/visual/app/` for Playwright — **not** a production `src/app` route; use `/my/messages` for UAT |
| Authenticated flows | **UAT** | Blocked without `DEV_FIXED_OTP_ENABLED` + allowlist (Phase 10) |

---

## 5. Mock / placeholder inventory

| Surface | Behavior | Misleading? |
|---------|----------|-------------|
| Homepage management cards | Sample + `sampleContentNote` | **No** — labeled |
| Homepage market insights / testimonials / hero proof | Sample or static | **No** — labeled or non-API |
| Marketplace listing image | `LISTING_PLACEHOLDER_SRC` when no image | **No** — placeholder asset |
| Farm details map | `MapPreview` (governorate/area, not exact pin) | **No** — aligns with backend privacy |
| Farm details documents/facilities/related | Empty/hidden or illustrative when API omits public fields | **No** — not fabricated live data |
| `/management`, `/partnerships` | Marketing/informational | **No** — honest CTAs to private flows |
| `/my/documents`, `/my/notifications` | Explicit empty / coming soon | **No** |
| Messaging `previewCases` / `MessagesPreviewData` | Test/visual fixture only | **No** on live `/my/messages` |
| `web/src/lib/domain/enums.ts` | Some option lists marked placeholder pending business validation | **N/A** — documented in code |

---

## 6. Backend-dependent blockers (category B)

| ID | Capability | Blocker |
|----|------------|---------|
| B1 | **Website notifications** (list, unread, read) | No approved website notifications API |
| B2 | **User-wide documents hub** | Documents are per-request only; no catalog API |
| B3 | **Public Management Marketplace** (browse/apply to live opportunities) | No public discovery/application API |
| B4 | **Public Partnership Marketplace** (opportunity detail, drawer, apply without known parent ID) | No public publication/discovery API |
| B5 | **Messaging inbox enrichment** (last message preview, unread counts, farm title in list) | Case list DTO limited to ids/status/timestamps |
| B6 | **Rich public farm media/documents on details** | Public DTO does not expose full media/document sets |
| B7 | **Partnership owner: accept/decline applications** | No supported owner decision contract (Phase 8) |
| B8 | **Live three-party messaging E2E** | Requires staff-assigned case + isolated test identities |
| B9 | **Similar listings on farm details** | No approved public “similar farms” endpoint observed |

---

## 7. Intentionally deferred (category C)

| Item | Rationale |
|------|-----------|
| Direct buyer–owner contact | `BACKEND_RULES` — FarmExit mediates all communication |
| Automatic deal closure / payments / commission UI | Out of approved phases |
| Public partnership/management opportunity grids with fake rows | Replaced by informational pages |
| Messaging attachments UI | No API |
| Pixel-perfect Figma parity (all flows) | Phase 9E-C: layout acceptable; inbox richness deferred |
| Co-purchase **group** marketplace UI | Phase 8 — no new group UI authorized |
| SEO hreflang / sitemap / canonical | Phase 10 noted as not implemented |
| Full accessibility certification | Out of scope for this audit |

---

## 8. Manual test required (category D)

All **write** paths and **staff-mediated** flows need authenticated UAT:

- OTP sign-in, refresh, logout, profile completion (EN + AR)
- Create/edit farm, media, facilities, submit listing (normal + Quick Sale configurations)
- Listing review states: draft → submit → `changesRequested` → resubmit
- Save/unsave farm (authenticated)
- Farm details inquiry create + status
- Purchase proposals (each kind) create/edit
- Management request create/submit
- Professional verification with documents
- Partnership owner wizard + applicant wizard (with known parent request ID)
- Open message case from request tracking; send message; verify REST persistence; optional Socket receive (two browsers)
- Request document upload/download on a real request
- RTL navigation across above
- Public marketplace filters vs API-supported query params

**Blocked sub-flow:** live buyer ↔ staff ↔ owner realtime thread without approved fixtures (9E-B).

---

## 9. Automated test evidence (existing — not re-run in 10A)

| Suite | Result | Notes |
|-------|--------|-------|
| Website Playwright (Phase 10) | **173 passed**, 9 skipped | Skips: authenticated OTP (no env), mobile-only toolbar |
| Website `typecheck` / `lint` | Pass (Phase 10) | |
| `web` unit tests | 4 pass (`message-merge`, etc.) | |
| Visual stage9b | 12/12 (9E-B) | Fixture route under `tests/visual` |
| Visual stage9c | 4/4 | Request context messaging |
| API e2e (Phase 10) | 252 tests in-memory fixture | Not dev DB |
| API `communication-realtime` | 15 tests (9E-A) | Gateway revalidation |
| Dashboard unit (9D-B3) | 10 pass | Staff socket client |

No full Playwright or production build was executed during this 10A audit.

---

## 10. Manual UAT checklist (exact routes)

Use **EN** and **AR** (`/en/...`, `/ar/...`) for a representative subset.

### Public

| # | Route | Actions |
|---|-------|---------|
| 1 | `/` | Scroll sections; confirm featured farms load; sample labels visible on non-API blocks |
| 2 | `/farms` | Search, sort, pagination, mobile load-more, open listing |
| 3 | `/farms/[slug]` | Gallery, save (guest → sign-in), inquiry CTA, proposal CTA (sale listing) |
| 4 | `/management`, `/partnerships` | Read informational copy; follow CTA to sign-in or `/my/*` |
| 5 | `/sign-in` | Request OTP (if dev fixed OTP configured), verify, complete profile if prompted |

### Portal (authenticated, profile complete)

| # | Route | Actions |
|---|-------|---------|
| 6 | `/my` | Open each hub link |
| 7 | `/my/farms`, `/my/farms/new`, `/my/farms/[id]` | Create/edit farm, media, facilities |
| 8 | `/my/farms/[id]/list` | Configure sale/rent, Quick Sale modes, exchange assets, submit |
| 9 | `/my/requests`, `/my/requests/[id]` | Track listing; resume wizard if changes requested |
| 10 | `/my/saved` | List saved; remove save |
| 11 | `/my/proposals/new?slug=…` | Create proposal types allowed by listing terms |
| 12 | `/my/proposals/[id]` | View/edit per status rules |
| 13 | `/my/management/new` | Create from owned farm, submit |
| 14 | `/my/partnerships/new`, `/my/partnerships/[id]` | Owner wizard |
| 15 | `/my/applications/new?parentPartnershipRequestId=…` | Applicant wizard |
| 16 | `/my/professional`, `/my/professional/verification` | Profile, capability, verification + docs |
| 17 | `/my/farm-details-requests/new?listingSlug=…` | Submit inquiry |
| 18 | `/my/messages`, `/my/messages/[caseId]` | List cases, send message, confirm thread updates |
| 19 | `/my/profile` | Update profile fields |
| 20 | `/my/documents`, `/my/notifications` | Confirm intentional empty states |

### Negative / security (spot check)

| # | Check |
|---|--------|
| 21 | Guest cannot open `/my/*` (redirect sign-in) |
| 22 | No exact farm coordinates on public listing |
| 23 | Download document URL without auth → denied |

---

## 11. Prioritized remaining work

| Priority | Item | Category |
|----------|------|----------|
| **P0** | Configure dev fixed OTP + run Phase 10 authenticated spec + manual write UAT | D |
| **P0** | Staff dashboard session + assign case → verify website messaging E2E | D / B8 |
| **P1** | Product decision: hide vs disable unsupported marketplace filters | A3 |
| **P1** | Notifications UI when API approved | B1 |
| **P1** | User documents hub or redirect to per-request docs | B2 |
| **P1** | Inbox enrichment when case list API extended | B2 / A2 |
| **P2** | Public navbar session display on public pages | A1 |
| **P2** | Portal enum/date localization | A4 |
| **P2** | SEO hreflang/sitemap | C |
| **P2** | Messaging attachments, unread badges | B5 / C |
| **P2** | Figma pixel polish (non-messaging flows) | C |

---

## 12. Figma and requirements alignment

- **Farm Details:** Structure mapped in `FIGMA_SCREEN_INVENTORY` (verified D/T/M references); not pixel-certified in 10A.
- **Communications:** Local pack confirmed at `web/figma-baselines/phase9/` (gitignored). Phase 9E-C: thread layout acceptable; inbox list density below Figma until API supports previews.
- **Purchase proposals:** Farm Details PDF does not define full proposal screens; existing routes preserved (Phase 8).
- **Add Farm:** Single create form + separate list wizard — multi-step Figma for “add farm” may differ; do not invent steps without product approval.

---

## 13. Backend boundaries respected in code review

- No direct party contact fields surfaced in messaging UI.
- Public management/partnership pages do not call fake discovery APIs.
- Proposals and sale terms respect owner-configured eligibility.
- Communication remains case/request scoped with staff mediation.

---

## 14. Final recommendation (single label)

| Label | Applicability |
|-------|----------------|
| **READY FOR MANUAL UAT** | **Selected** — Core routes and BFF integrations are in place for UAT; gaps are documented and mostly backend- or fixture-blocked. |
| FRONTEND FIXES REQUIRED | Not the primary gate — no P0 disconnected primary workflow found in static audit; address P1 after UAT findings. |
| BLOCKED BY BACKEND DECISIONS | Parallel track for notifications, documents catalog, public marketplaces, inbox metadata, owner partnership decisions. |

**Do not treat this audit as “100% complete.”** Sign-off requires manual UAT with configured auth, staff participation for messaging, and explicit product acceptance of informational public pages and sample homepage blocks.

---

*End of Phase 10A audit. No source code was modified.*
