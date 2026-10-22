# Public Management & Partnership opportunities — launch blockers

This document lists **missing approved backend contracts** only. No publication business rules were implemented in the Website UI pass.

## Current behaviour (accurate)

- Owner Management/Partnership requests can be created, reviewed, and approved while remaining **private** (`visibility: private`, `publishedAt: null`).
- Public list endpoints (`GET /public/management`, `GET /public/partnerships`) return **empty** when nothing is publicly eligible — not a frontend cache bug.
- Website marketplaces show honest empty states with owner **submit** and **track** CTAs (not “publish now”).

## Required backend capabilities (not yet approved/implemented)

1. **Explicit authorized publication action** for Management and Partnership owner requests (separate from review approval), analogous in spirit to listing `POST /staff/listing-requests/:id/publish` but with product-defined rules for MP workflows.
2. **Canonical publication and withdrawal rules** — who may publish, required fields, document gates, and how withdrawal/unpublish works.
3. **Public eligibility predicates** — when a request becomes discoverable (status, visibility, `publishedAt`, farm linkage, etc.).
4. **Public detail API** — read-only opportunity payload for a single published Management/Partnership request (no private owner PII, no exact coordinates).
5. **Website public detail route** — e.g. `/management/:slug` or id-based detail consuming the detail API.
6. **Partnership public apply entry** — discovery → detail → apply using existing `partnership-applications` where appropriate; today apply exists but **public discovery → detail → apply** is incomplete.
7. **Management application API/workflow** — apply-to-published-management-opportunity flow does **not** exist; Website must not fabricate Management applications.

## Frontend already aligned (this task)

- Renamed misleading partnership CTA to **Submit a partnership request**.
- Branded empty states on `/management` and `/partnerships`.
- My Applications shows Management filter as **disabled** with explanatory copy.

## Out of scope for launch proposal

- Auto-publishing on approval.
- Surfacing private approved requests in public lists.
- Fake opportunity cards.
