# Phase 9 — Website API mapping

Base: `FARMEXIT_API_URL` (see `web/.env.example`). **Verify with** `node web/scripts/assert-farmexit-api.mjs` — FarmExit exposes `GET /marketplace/farms` with `{ items: [] }`. Port **4000** may host another app (e.g. ore-care-backend).

## Communication (mediated, user-scoped)

| Action | Method | API | BFF |
|--------|--------|-----|-----|
| Open case | POST | `/communication/cases` `{ requestId }` | `/api/communication/cases` |
| List cases | GET | `/communication/cases` | same |
| Case detail | GET | `/communication/cases/:id` | `/api/communication/cases/[id]` |
| List messages | GET | `/communication/cases/:id/messages` | `/api/communication/cases/[id]/messages` |
| Send message | POST | `/communication/cases/:id/messages` `{ body }` | same |

**Not on web:** `staff/communication/*`, `RelayMessageDto`, relay endpoints.

Case open requires external participant on request + assigned case agent (backend).

## Farm details inquiries

| Action | Method | API | BFF |
|--------|--------|-----|-----|
| Create | POST | `/farm-details-requests` `{ listingSlug }` | `/api/farm-details-requests` |
| List/get | GET | `/farm-details-requests`, `/:id` | same |
| Submit | POST | `/farm-details-requests/:id/submit` | `/api/farm-details-requests/[id]/submit` |

No freeform message field in schema.

## Purchase proposals (Phase 8 completion)

| Action | API | BFF |
|--------|-----|-----|
| PATCH proposal | `/purchase-proposals/:id` | `/api/purchase-proposals/[id]` |

Exchange assets: `factory`, `villa`, `apartment`, `car` (`ExchangeAssetType`).

## Documents / notifications

- Request documents: existing `/requests/:id/documents` BFF (per-request only).
- No user-wide document catalog API found.
- No website notifications API — nav stays informational if unsupported.
