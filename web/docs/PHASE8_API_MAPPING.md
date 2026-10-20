# Phase 8 — Website API mapping

Base URL: `FARMEXIT_API_URL` (default `http://127.0.0.1:4001/api/v1`). All website calls go through BFF route handlers with HttpOnly session cookies unless noted.

## Partnership requests (owner)

| Action | Method | API | Auth | Status |
|--------|--------|-----|------|--------|
| Create | POST | `/farms/:farmId/partnership-requests` | Completed profile, farm **owner** | Implemented → `/api/farms/[id]/partnership-requests` |
| List mine | GET | `/partnership-requests?page&pageSize` | Completed profile | `/api/partnership-requests` |
| Get | GET | `/partnership-requests/:id` | Owner of request | `/api/partnership-requests/[id]` |
| Update draft | PATCH | `/partnership-requests/:id` | Draft / changesRequested | same |
| Submit | POST | `/partnership-requests/:id/submit` | Requires description or objective | `/api/partnership-requests/[id]/submit` |

DTOs: `CreatePartnershipRequestDto`, `UpdatePartnershipRequestDto` (`api/src/modules/partnership-requests/dto/partnership-request.dto.ts`).

Frontend: `/my/partnerships`, `/my/partnerships/new`, `/my/partnerships/[id]`.

Submission stays **private** until staff publish (no auto public marketplace listing).

## Partnership applications (applicant)

| Action | Method | API | Auth | Status |
|--------|--------|-----|------|--------|
| Create | POST | `/partnership-applications` | Parent request **approved or published**; not farm owner | `/api/partnership-applications` |
| List mine | GET | `/partnership-applications` | Applicant | same |
| Get / update / submit | GET/PATCH/POST submit | `/partnership-applications/:id` | Owner of application | `/api/partnership-applications/[id]` (+ submit) |
| Documents | POST | `/requests/:id/documents` | Owned request | existing BFF |

`CreatePartnershipApplicationDto`: `parentPartnershipRequestId`, `applicantKind` (`individual` | `company`).

**Gap:** No public partnership opportunity discovery API. Users cannot browse private owner requests. Application create requires a known `parentPartnershipRequestId` (e.g. invitation link with query param). Public `/partnerships` remains informational.

Frontend: `/my/applications`, `/my/applications/[id]`, `/my/applications/new?parentPartnershipRequestId=`.

## Purchase proposals (buyer)

| Action | Method | API | Auth | Status |
|--------|--------|-----|------|--------|
| Sale terms (published) | GET | `/marketplace/farms/:slug/sale-terms` | Completed profile | `/api/marketplace/farms/[slug]/sale-terms` |
| Create proposal | POST | `/marketplace/farms/:slug/purchase-proposals` | Buyer, not farm owner; one per listing | `/api/marketplace/farms/[slug]/purchase-proposals` |
| List mine | GET | `/purchase-proposals` | Buyer | `/api/purchase-proposals` |
| Get / update | GET/PATCH | `/purchase-proposals/:id` | While `submitted` and not in staff co-purchase group | `/api/purchase-proposals/[id]` |

DTO: `CreateProposalDto` — `proposalKind`, `components[]`, optional `proposedTotalValue`, `requestedSharePercent` (co-purchase only), `proposalNotes`.

Eligibility from `FarmSaleTerms` via `SaleTermsService.effective` (standard cash = cash only; quick sale = cash/installment/exchange).

Frontend: `/my/proposals`, `/my/proposals/[id]`, `/my/proposals/new?slug=`; Farm details CTA → sign-in → offer form.

## Co-purchase (staff-only)

| Action | API | Website |
|--------|-----|---------|
| Create/manage groups | `POST/GET/PATCH /staff/co-purchase-groups` | **Not exposed** (staff dashboard) |
| Add members | `POST .../members` | **Not exposed** |

User-facing co-purchase interest is expressed only through `proposalKind: coPurchase` on purchase proposals (nonbinding share %). No user-scoped group read API.

## Staff endpoints (never used on web)

- `staff/partnership-requests`, `staff/partnership-applications`
- `staff/purchase-proposals`, `staff/co-purchase-groups`

## Unified requests

`GET /requests`, `GET /requests/:id` — list/detail for cross-type inbox; specialized types link to Phase 8 pages from My Requests.
