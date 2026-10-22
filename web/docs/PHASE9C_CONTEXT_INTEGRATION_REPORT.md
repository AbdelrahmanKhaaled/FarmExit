# Phase 9C — Request-scoped messaging & contextual navigation

**Date:** 2026-10-21 · **Builds on:** Phase 9B messaging UI. **No backend, schema, dashboard, or marketplace/sale-terms changes.**

## Changed files

| File | Purpose |
|------|---------|
| `web/src/features/my-messages/open-communication-case.ts` | Shared POST client, status mapping, in-flight dedupe per `requestId` |
| `web/src/features/my-messages/OpenCommunicationCaseButton.tsx` | Uses shared opener; ref + busy guard; localized errors |
| `web/src/features/my-messages/MessageFarmExitPanel.tsx` | **New** — tracking sidebar card (note + button) |
| `web/src/features/my-messages/request-context.ts` | `requestDetailHref`, `canOpenCommunicationForStatus`, types |
| `web/src/features/my-messages/RequestContextHeader.tsx` | **New** — thread header (type, number, farm name, link) |
| `web/src/features/my-messages/ConversationView.tsx` | `GET /api/requests/:id` once per open thread |
| `web/src/features/my-messages/MessagesWorkspace.tsx` | Preview passes `request` into thread |
| `web/src/features/phase7/RequestTracking.tsx` | `MessageFarmExitPanel` instead of generic `/my/messages` link |
| `web/src/features/my-farms/ListingTracking.tsx` | `MessageFarmExitPanel` with listing **request** id |
| `web/src/app/[locale]/my/requests/page.tsx` | Uses shared `requestDetailHref` |
| `web/messages/en/workspace.json`, `ar/workspace.json` | Errors, request types, `viewRequest`, `messagingUnavailable` |
| `web/tests/visual/stage9c.*`, `app/[locale]/stage9c/page.tsx` | Mocked open-case tests |
| `web/tests/visual/app/[locale]/phase5/[screen]/page.tsx`, `phase9b/page.tsx` | Preview request context for visuals |

**Unchanged (already correct):** `FarmDetailsRequestDetail`, `ProposalDetail` → `OpenCommunicationCaseButton` with entity **request** `id`.

## Request ID mapping (communication `requestId`)

All cases use the platform **`requests.id`** (bigint string), not farm id, listing slug, or application-only surrogate.

| Context | UI surface | `requestId` source | Detail route |
|---------|------------|-------------------|--------------|
| Farm listing tracking | `ListingTracking` | `request.id` (farm listing request) | `/my/requests/[id]` |
| Management | `ManagementRequestDetail` → `RequestTracking` | `id` prop | `/my/management/[id]` |
| Professional verification | `VerificationRequestDetail` → `RequestTracking` | `id` | `/my/professional/verification/[id]` |
| Partnership owner request | `PartnershipWizard` tracking → `RequestTracking` | `record.id` | `/my/partnerships/[id]` |
| Partnership application | `PartnershipApplicationDetail` → wizard tracking → `RequestTracking` | `initial.id` (application request) | `/my/applications/[id]` |
| Farm details inquiry | `FarmDetailsRequestDetail` | `request.id` | `/my/farm-details-requests/[id]` |
| Purchase proposal | `ProposalDetail` | `proposal.id` | `/my/proposals/[id]` |

**Blockers:** None identified — each tracked flow exposes the canonical request row id already used by `/requests` and specialized detail APIs.

**Draft / withdrawn:** `MessageFarmExitPanel` hides the open button and shows `messagingUnavailable` (API would forbid open anyway).

## API calls (unchanged BFF)

| Action | Call |
|--------|------|
| Open / reuse case | `POST /api/communication/cases` body `{ "requestId": "<digits>" }` → `CommunicationCaseResponseDto` |
| Thread context (single fetch) | `GET /api/requests/:requestId` → `RequestResponseDto` fields used: `requestNumber`, `requestType`, `status`, `farm.name` (if present) |
| Messages | Unchanged Phase 9B GET/POST on `/api/communication/cases/:caseId/messages` |

Backend open semantics unchanged: returns existing non-closed case for the request when present; requires case agent or **400** with case-agent message.

## Error handling

| HTTP | User message key |
|------|------------------|
| 400 (case agent) | `workspace.messages.noAgent` |
| 401 | `workspace.messages.errors.unauthorized` |
| 403 | `workspace.messages.errors.forbidden` |
| 404 | `workspace.messages.errors.notFound` |
| 409 | `workspace.messages.errors.conflict` |
| Network | `workspace.messages.errors.network` |
| Other | `workspace.messages.openError` |

User stays on the tracking page on failure. No auto case creation on load. Overlapping clicks deduped via `inflightByRequest` map + button `openingRef` / `busy`.

Navigation on success: `router.push(\`/my/messages/${caseId}\`)` (locale preserved by `next-intl` router).

## Permissions

- Still enforced only on the API (`assertExternalParticipant`, case agent, conversation channel).
- Website does not call `staff/communication/*`.
- Thread context uses the same authorized `GET /requests/:id` as request detail pages; failed load falls back to Phase 9B neutral header (`requestContextFallback` / `requestRef`).

## Tests

| Suite | Result |
|-------|--------|
| `npm run typecheck` (web) | Pass |
| `npm run lint` (web) | Pass |
| `npx playwright test -c stage9c.config.ts` | **4/4** pass (navigate AR, dedupe, no-agent 400, 403) |

No live MySQL / port 4001 integration run in 9C (mocked BFF only).

## Remaining gaps → Phase 9D

- Full responsive regression vs Phase 9 Figma (inbox rows still show case id + `requestId`, no last-message preview).
- Optional `GET /communication/cases?requestId=` to skip open POST when deep-linking (product/API).
- Inbox enrichment without N+1 (batch case summary API) if product requires list previews.
- E2E on real authenticated session + assigned case agent (needs approved test data).

## Deferred (not in 9C)

- My Requests list row-level message shortcut (optional product).
- Attachments, unread, notifications, WebSockets.
