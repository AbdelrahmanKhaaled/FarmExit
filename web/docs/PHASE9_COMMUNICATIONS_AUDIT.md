# Phase 9A — Communications & Messaging (read-only audit)

**Date:** 2026-10-21 · **Scope:** Website messaging UI and integration only; dashboard staff relay already exists. **Preserves:** all Stage 1E local work (sale terms, marketplace filters, proposals). **No implementation in this phase.**

**References:** `web/figma-baselines/phase9/PHASE9_REFERENCE_MAP.md`, PNGs under `web/figma-baselines/phase9/references/`, `Communications & Messaging.pdf` (same folder). No Figma MCP.

---

## 1. Figma page → route / UI mapping

| PDF / PNG | Design intent | Current implementation | Gap |
|-----------|---------------|----------------------|-----|
| **p01** navigation capabilities | Messages in portal nav | `/[locale]/my/messages` in `portal-nav.ts` / `PortalNavigation` (phase 9) | No unread badge; nav matches capability list only |
| **p02** overview + messages | Entry from overview | `MyFarmExitLayout` quick link to `/my/messages` | No activity preview / last message |
| **p03, p11, p24** desktop inbox + thread | Split pane: list + conversation | `/my/messages` (inbox only); `/my/messages/[caseId]` → `MessageThread` (sidebar inbox + `ConversationView` on `desktop:`) | Inbox rows show `Case #{id}` + raw `requestId`, not request title/farm/status; no selected-state styling; p24 layout variants not matched |
| **p05, p33** mobile conversation | Full-width thread + composer | `[caseId]` page: back link, thread, composer; sidebar inbox hidden on mobile | No mobile inbox list; no swipe/back-to-list pattern from Figma |
| **p27** partnership message context | Thread header tied to partnership request | `ConversationView` shows numeric `requestId` + mediation copy only | Missing request type, number, farm name, status chip, link back to request detail |
| **p38** Arabic RTL messages | RTL inbox/thread | Routes use `next-intl` + `workspace.messages` AR strings | Needs Phase 9D visual pass (bubble alignment, sidebar order, timestamps) |
| **p04, p06** farm / activity “Message FarmExit” | CTA from listing tracking | `AddFarmWizard` success links to `/my/messages` (generic); **no** `OpenCommunicationCaseButton` on `ListingTracking` | Need request-scoped open case + deep link (`listing` `requestId`) |
| **p07, p08** management changes / declined | Message CTA on management detail | `ManagementRequestDetail` → `RequestTracking` → generic “Help” → `/my/messages` | Replace with `OpenCommunicationCaseButton` (or open existing case by `requestId`) |
| **p15** My Requests message links | Per-row message entry | `/my/requests` → detail routes only; no message action on row | Optional row action or status-based CTA |
| **p16** partnership changes | Message CTA | `PartnershipWizard` tracking → `RequestTracking` (generic messages link) | Same as management |
| **p26** application tracking | Message CTA | `PartnershipApplicationDetail` → wizard tracking → `RequestTracking` | Same gap |
| **CONTEXT only (p4–8, 15–16, 26)** | Phase 8 decision/withdrawal screens in PDF | Out of Phase 9 scope per `PHASE9_REFERENCE_MAP.md` | Do not implement owner accept/decline from messaging PDF pages |

**Already wired (context CTAs):**

- Farm details: `FarmDetailsRequestDetail` → `OpenCommunicationCaseButton`
- Purchase proposals: `ProposalDetail` → `OpenCommunicationCaseButton`

---

## 2. Reusable UI (website)

| Component | Path | Use in Phase 9 |
|-----------|------|----------------|
| `PortalRow`, `PortalEmpty`, `PortalHeading`, `PortalStatus` | `features/my-farmexit/PortalUI.tsx` | Inbox rows, empty inbox, request context header |
| `Surface`, `Button`, `ButtonLink` | `components/ui/*` | Thread bubbles, composer |
| `MyFarmExitLayout`, `PortalNavigation` | `features/my-farmexit/*` | Shell, nav highlight |
| `MessagesInbox`, `MessageThread`, `ConversationView`, `OpenCommunicationCaseButton` | `features/my-messages/*` | Core messaging (extend, do not replace) |
| `RequestTracking` communication card | `features/phase7/RequestTracking.tsx` | Pattern for management/partnership/application CTAs |
| Visual fixtures | `tests/visual/app/[locale]/phase5/*` (`messages`, `conversation`) | Baseline for 9D; add `stage9` fixtures later |

**Staff (out of website 9B–9D scope but relevant):** `dashboard/.../CommunicationCaseWorkspace.tsx` — multi-conversation, relay, case status (website users never see relay UI).

---

## 3. API & BFF contracts (exact)

**Auth:** Website routes use `@RequireCompletedProfile()`; BFF uses `readBffAccessToken()` → 401 if missing. Staff routes: `@StaffOnly()` + `communication.relay`.

### User API (`/api/v1/communication/...`)

| Method | Path | Body / query | Response |
|--------|------|--------------|----------|
| POST | `/communication/cases` | `{ requestId: string }` (digits) | `CommunicationCaseResponseDto`: `id`, `requestId`, `status`, `assignedStaffId`, `createdAt`, `closedAt` |
| GET | `/communication/cases` | `page`, `pageSize` (via `ListFarmsQueryDto`) | `CommunicationCaseListResponseDto` |
| GET | `/communication/cases/:id` | — | `CommunicationCaseResponseDto` |
| GET | `/communication/cases/:id/messages` | `page`, `pageSize` | `MessageListResponseDto`: `items[]`, `page`, `pageSize`, `total` |
| POST | `/communication/cases/:id/messages` | `{ body: string }` (1–8000) | `MessageResponseDto` |

**`MessageResponseDto`:** `id`, `senderId`, `body`, `sentAt`, `isRelayedCopy` (boolean; true for staff-relayed copies in recipient thread).

**Open case rules:** Caller must be external participant on request (`CommunicationAccessService.assertExternalParticipant`); request not `draft`/`withdrawn`; **case agent** must exist on request (`request_staff_assignments.assignment_type = caseAgent`) or **400** `"A case agent must be assigned..."`. Re-open returns existing non-closed case and ensures a `conversation` row for caller.

**Send/list rules:** User messages only in their `conversation` (`case_id` + `external_user_id`). Closed case → **409** on send. User list is **only their channel** (not other party’s raw messages).

### BFF (website)

| BFF | Proxies |
|-----|---------|
| `web/src/app/api/communication/cases/route.ts` | GET/POST cases |
| `web/src/app/api/communication/cases/[id]/route.ts` | GET case |
| `web/src/app/api/communication/cases/[id]/messages/route.ts` | GET/POST messages |

Documented in `web/docs/PHASE9_API_MAPPING.md`.

### Staff API (not exposed on website)

`staff/communication/cases`, `cases/:id`, `cases/:id/conversations`, `cases/:id/messages?conversationId=`, POST message with `?externalUserId=`, POST `cases/:id/relay` (`RelayMessageDto`), PATCH `cases/:id/status`.

### Related (not messaging, but Phase 9 context links)

- Farm details: POST/GET `/farm-details-requests` — **no** persisted inquiry `message` (`message: null` in DTO).
- Partnership `applicationMessage` on application record — **not** a chat message; separate from `CommunicationCase`.
- Proposals: case agent assigned via staff purchase-proposal APIs (`offers` module); assignment does **not** auto-open a case.

---

## 4. Data model & conversation types

**Prisma** (`api/prisma/schema.prisma`):

- `CommunicationCase` → one `request_id`, `assigned_staff_id`, `status` (`open` \| `waitingCustomer` \| `waitingOwner` \| `closed`).
- `Conversation` → **one external user per case** (`@@unique([caseId, externalUserId])`). Schema comment: no direct buyer↔owner channel.
- `Message`, `MessageRelay` (staff audit + delivered copy), `MessageAttachment`, `MessageRead` — **attachments and reads are not used by any API service**.

**“Conversation type” in product terms:** Not a separate enum. Context is always **`requestId`** on the case. Supported request types for participants (`RequestType`): listing, management, partnership, professional verification/application, partnership application, farm details, farm purchase proposal. Participation rules in `communication-access.service.ts` (creator, farm owner on proposal, partnership owner on application parent farm, `request_forwarding` recipient).

**Mediation flow:** User → staff in user’s conversation; staff → other party via direct staff message or **relay** (new message in target conversation, `isRelayedCopy: true`). Users never see the other party’s identity in API responses (only `senderId` — UI labels non-self as “FarmExit”).

---

## 5. Permissions & privacy

| Check | Where |
|-------|--------|
| Profile complete | `RequireCompletedProfile` on communication controller |
| Request participant | `assertExternalParticipant` / `assertCaseParticipant` |
| Draft/withdrawn request | Forbidden to open case |
| Staff case access | `communication.relay`; assignee or admin scope or case agent on request |
| Relay target | Must be valid external participant on same request |
| PII | BACKEND_RULES + schema: no cross-party contact in messaging APIs; website copy states mediation |
| Documents | Per-request `RequestDocumentsPanel`; not embedded in messages |
| Location | Not in message APIs |

**Gap:** `listConversationMessages` has unused `hideStaffNote` logic; **no** API hides pending (unrelayed) user messages from the other side because each side has a separate conversation. **No** `MessageRead` writes — unread is UI-only if ever added.

---

## 6. Missing contracts & unsupported Figma features

| Feature | Status |
|---------|--------|
| Inbox preview (last message, timestamp, unread) | Not in API |
| Case ↔ request summary in list/detail | API returns ids only; need GET `/requests/:id` (existing) client-side or case DTO extension |
| Deep link `?requestId=` open or navigate to case | Not implemented |
| Attachments in composer | DB model only; no upload/send/list |
| Read receipts / unread counts | `MessageRead` unused |
| Real-time (WebSocket / SSE) | Not present; client fetch on load + after send |
| Typing indicators, read badges in nav | Not present |
| In-message document sharing | Use request documents flow; not in chat API |
| User-visible relay metadata | Only `isRelayedCopy`; no source quote |
| Notifications for new messages | No website notifications API (`PHASE9_API_MAPPING.md`) |
| Direct buyer–owner thread | **Prohibited** — not in schema/services |

---

## 7. Implementation plan (minimal)

### 9B — Inbox & conversation UI

- Align desktop/mobile layouts with p03/p05/p11/p24/p33 (split pane, selected row, mobile list vs thread).
- Enrich inbox rows: fetch request metadata (type, `requestNumber`, title/farm where available) via existing `/requests/:id` or lightweight batch (see §8).
- `ConversationView` header: request context panel (p27) + link to specialized detail route (same mapping as `my/requests/page.tsx`).
- Optional: resolve `OpenCommunicationCaseButton` label to “Continue conversation” when case exists (GET cases filtered client-side or new query param if backend adds `requestId` filter).
- RTL pass for p38 (bubble `ms`/`me`, sidebar order).

### 9C — Request-context links & integration

- Replace `RequestTracking` generic `/my/messages` with `OpenCommunicationCaseButton` where `requestId` is known (management, partnership, partnership application tracking).
- `ListingTracking`: add Message FarmExit CTA with listing `request.id`.
- `/my/requests`: optional secondary action “Messages” when case exists or always open-case (respect no-agent error).
- Support navigation from CTA → `/my/messages/[caseId]` after POST open (already in button).

### 9D — Responsive verification & regression

- Extend visual tests (`stage9` or phase5 message screens) against phase9 PNGs; EN + AR at 390/1024/1440.
- Keep `phase9-portal.spec.ts` auth gate; add signed-in fixture flows if env tokens exist.
- Re-run targeted portal + Phase 8 proposal/farm-details tests; **full gate once** at end (per project skill).

---

## 8. Files expected to change (implementation phases)

**9B–9D website (primary):**

- `web/src/features/my-messages/MessagesInbox.tsx`
- `web/src/features/my-messages/ConversationView.tsx`
- `web/src/features/my-messages/MessageThread.tsx`
- `web/src/features/my-messages/OpenCommunicationCaseButton.tsx` (optional UX)
- `web/src/app/[locale]/my/messages/page.tsx`, `[caseId]/page.tsx`
- `web/messages/{en,ar}/workspace.json`
- `web/src/features/phase7/RequestTracking.tsx`
- `web/src/features/my-farms/ListingTracking.tsx`
- `web/src/app/[locale]/my/requests/page.tsx` (optional)
- `web/tests/visual/*` (new stage9 config/spec/fixtures)
- `web/docs/PHASE9_API_MAPPING.md` (if API query extended)

**Possible API (optional, no schema):**

- `api/src/modules/communication/dto/communication.dto.ts` — optional `requestSummary` on case list/detail
- `api/src/modules/communication/communication-cases.service.ts` — `GET /communication/cases?requestId=` for idempotent UI
- `api/src/modules/communication/communication.controller.ts`

**Do not touch for messaging-only work:** Stage 1E sale-terms/marketplace/proposal validation files unless regression demands it.

**Dashboard:** No change required for website Phase 9; staff relay already implemented.

---

## 9. Risks to Phase 8 & Stage 1E

| Risk | Mitigation |
|------|------------|
| Accidental edits to `ProposalDetail`, sale terms, marketplace filters | Keep diffs confined to `my-messages` + tracking CTAs |
| Opening cases before case agent assigned | Preserve existing 400 + `noAgent` copy; listing/partnership flows may hit this until staff assigns agent |
| Owner sees empty thread until staff relays | Product-correct; do not fake cross-party messages |
| `listMine` includes cases for owned requests without user conversation | Inbox may list cases with empty thread until user opens case or staff messages |
| Visual regressions on Phase 5 message fixtures | Run phase5/stage9 visual diffs after layout changes |
| RTL breaks proposal/farm-details layouts | Scoped message CSS; 9D AR screenshots |

---

## 10. Backend / database changes required?

**No schema or migration required** for core Phase 9 website work. Existing models and user/staff endpoints are sufficient for mediated text chat.

**Optional (API-only) improvements** (product convenience, not blockers):

- `GET /communication/cases?requestId=` to avoid scanning inbox.
- Enriched case DTO (`requestNumber`, `requestType`, `requestStatus`, optional `lastMessageAt` / preview) — may need efficient Prisma joins; still no new tables.
- **Not recommended without product sign-off:** exposing `MessageRead` or `MessageAttachment` (new upload pipeline, storage auth).

**Staff assignment** remains prerequisite for opening cases; assigning agents is already part of listing review / proposal staff flows — not a Phase 9 schema change.

---

## Appendix — source docs checked

- `docs/BACKEND_RULES.md` (§ FarmExit intermediary, location, documents)
- `api/prisma/schema.prisma` (communication block)
- `web/docs/FARMEXIT_UI_STYLE_GUIDELINES.md` (portal / messages UI family)
- `web/docs/PHASE8_VISUAL_REPORT.md` (mediated messages retained)
- `web/docs/STAGE1E_IMPLEMENTATION_REPORT.md` (Phase 9 not started; preserve local work)
- `web/docs/PHASE9_API_MAPPING.md`, `FIGMA_SCREEN_INVENTORY.md` (route inventory)
