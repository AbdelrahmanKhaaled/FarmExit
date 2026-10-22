# Phase 9B — Messaging inbox & conversation UI

**Date:** 2026-10-21 · **Scope:** Website messaging layout only (no backend, no 9C CTAs, no attachments/unread/realtime).

## Changed files

| File | Change |
|------|--------|
| `web/src/features/my-messages/messages-types.ts` | Shared case/message types |
| `web/src/features/my-messages/MessagesWorkspace.tsx` | **New** — responsive split pane (inbox + thread / placeholder) |
| `web/src/features/my-messages/MessagesInbox.tsx` | Figma-style list rows, selected state, API-only metadata |
| `web/src/features/my-messages/ConversationView.tsx` | Header, privacy banner, bubbles, scroll, composer, send UX |
| `web/src/features/my-messages/MessageThread.tsx` | Delegates to `MessagesWorkspace` (+ optional `preview`) |
| `web/src/app/[locale]/my/messages/page.tsx` | Uses `MessagesWorkspace` (desktop split with select prompt) |
| `web/src/app/[locale]/my/messages/[caseId]/page.tsx` | Uses `MessagesWorkspace`; mobile list/thread routing |
| `web/messages/en/workspace.json` | New copy keys (`privacyBanner`, `composerPlaceholder`, statuses, …) |
| `web/messages/ar/workspace.json` | Arabic equivalents (RTL copy) |
| `web/tests/visual/app/[locale]/phase5/[screen]/page.tsx` | Conversation fixture `preview` data (regression) |
| `web/tests/visual/app/[locale]/phase9b/page.tsx` | Phase 9B visual fixture |
| `web/tests/visual/stage9b.config.ts` | Playwright config (port 3103) |
| `web/tests/visual/stage9b.spec.ts` | Screenshot capture |

## Figma screens matched

| Reference | Implementation |
|-----------|----------------|
| **p03 / p11 / p24** | Desktop: bordered split card, inbox column + active thread; selected row highlight (`border-s-4`, soft green bg); privacy banner; bubble meta lines; bottom composer with round send |
| **p05 / p33** | Mobile: full-width thread, back control to `/my/messages`, lock banner, composer with safe-area padding |
| **p38** | Arabic strings + logical `ms`/`me` bubble alignment, `dir="auto"` on message body, back/send icons use `rtl:rotate-180` only where direction-sensitive |

**Intentionally not mimicked (no API):** farm thumbnails, request-type labels, farm names, message previews, unread badges, staff names, document cards, nav notification counts.

**p27 (rich request context):** deferred to Phase 9C — header uses `requestRef` + `caseLabel` + case status only.

## Working interactions

- **List cases:** `GET /api/communication/cases` (unchanged BFF).
- **Open thread:** `/my/messages/[caseId]`; desktop keeps inbox visible with selection.
- **Load messages:** `GET /api/communication/cases/:id/messages?page=1&pageSize=100`.
- **Send:** `POST` with `{ body }`; appends **returned** `MessageResponseDto` to the thread (no fake success); draft kept on error.
- **Closed case:** composer hidden; status from case row.
- **Preview mode:** `preview` prop skips network (visual tests only).

## EN / AR & responsive checks

| Check | Result |
|-------|--------|
| `npm run typecheck` (web) | Pass |
| `npm run lint` (web) | Pass |
| Playwright `stage9b.config.ts` | **12/12** pass (1440, 1024, 390 × EN/AR) |

## Screenshots

Captured under `web/docs/artifacts/phase9b/`:

- `desktop-1440-en-thread.png`, `desktop-1440-ar-thread.png`
- `tablet-1024-en-thread.png`, `tablet-1024-ar-thread.png` (after full `stage9b` run)
- `mobile-390-en-thread.png`, `mobile-390-ar-thread.png`

Compare to baselines: `web/figma-baselines/phase9/references/page-03-desktop-messages-primary.png`, `page-05-mobile-chat-primary.png`, `page-38-arabic-rtl-messages.png`.

**How to regenerate:**

```bash
cd web/tests/visual
npx playwright test -c stage9b.config.ts
```

## Remaining UI gaps (9C / 9D / product)

- Request-scoped “Message FarmExit” on tracking pages (9C).
- Inbox last-message preview, unread counts, farm/request titles (needs API enrichment).
- Attachments, read receipts, live updates (out of scope).
- Tablet may show mobile thread layout below `desktop` breakpoint — verify in 9D against p11 if a dedicated tablet thread is required.

## Backend decisions (none required for 9B)

Optional later (not blocking):

- `GET /communication/cases?requestId=` for deep links.
- Case list DTO fields: `requestNumber`, `requestType`, `lastMessageAt` (avoid N+1 on the client).

No Prisma or communication service changes were made in 9B.
