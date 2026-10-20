# Phase 6 — Marketplace API audit

Audit date: 2026-10-18. Scope: public website discovery and safe user actions. Staff inboxes are not public APIs.

## A. Farm marketplace

| Topic | Status |
| --- | --- |
| **Public READ** | `GET /api/v1/marketplace/farms` (list + filters/sort/pagination), `GET /api/v1/marketplace/farms/:slug` |
| **Publication** | `request_type = farm_listing`, `status = published`, `visibility = public`, farm not deleted; whole-pound prices only |
| **Safe fields** | `PublicListingDto` / `PUBLIC_LISTING_FIELDS` — no coordinates, contacts, media, internal review data |
| **FarmExit Score** | `farmExitScore` on public listing DTO: latest `farm_evaluations` row with `status = published` and valid `score_value` / `score_max`, normalized to 0–5; otherwise `null` |
| **User actions** | `GET/POST/DELETE /api/v1/marketplace/saved/*` (completed profile); purchase proposals via authenticated listing routes |
| **Frontend** | `/[locale]/farms` loads published listings from API merged with sample adapter for imagery/copy; cards always show score UI (numeric or “Pending assessment”) |
| **Gaps** | Public detail page still uses sample `FarmDetailsSource` for non-sample slugs; rich filters (crop type, water, …) are client-only until listing attributes are exposed publicly |

## B. Management marketplace

| Topic | Status |
| --- | --- |
| **Public READ** | **None** — only owner `farm-management-requests` and staff `staff/farm-management-requests` |
| **Publication** | Submitted requests go `visibility = private`; no public discovery endpoint |
| **User actions** | Owner CRUD under `/farm-management-requests` and `/farms/:id/management-requests`; professional verification separate |
| **Frontend** | `/[locale]/management` — approved layout + **sample** requests; apply → sign-in; trust note |
| **Gaps** | Needs product-approved public READ for published management opportunities (visibility, safe fields, manager apply API) before replacing sample data |

## C. Partnership marketplace

| Topic | Status |
| --- | --- |
| **Public READ** | **None** — owner `partnership-requests` and staff inbox only |
| **Applications** | `partnership-applications` (auth + completed profile); non-binding workflow in services |
| **Frontend** | `/[locale]/partnerships` — approved layout + **sample** opportunities; express interest → sign-in |
| **Gaps** | Public discovery for published partnership requests + eligibility rules before live data |

## D. Agricultural facilities & factories

Separate future capability (cold storage, packing, service facilities). **Not implemented** — no listings, APIs, migrations, or submission flows. Farm detail “Facilities & equipment” remains farm attributes only.

## E. FarmExit Score policy (implemented projection)

Public release rule used in code: **only** evaluations in `EvaluationStatus.published` with both `score_value` and `score_max` set. No internal notes, checks, reviewer ids, or draft/approved-only rows. Methodology fields remain internal; UI does not invent scores.
