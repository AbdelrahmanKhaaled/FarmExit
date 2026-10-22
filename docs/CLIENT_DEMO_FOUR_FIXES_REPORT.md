# Client demo — four fixes report

**Date:** 2026-10-22  
**Ports:** Website 3000 (unchanged), Dashboard 3002, API 4001. Port 4000 not touched.  
**Evidence:** Automated tests + live `GET /api/v1/public/management` on 4001. No browser screenshots in this pass (workspace rule: no browser automation).

---

## 1. Messages scroll

### Root cause

The conversation thread column did not participate in a full **height chain** (`flex-1`, `min-h-0`, `overflow-hidden`) from the portal workspace down to `ConversationView`. Message history had correct internal scrolling, but the grid cell could still grow with content, lengthening the page.

### Fix

- `fx-messages-host` wrapper on `/my/messages` pages with `portal.css` max-height using `dvh` and `min-h-0`.
- `MessagesWorkspace`: `flex-1` workspace height via `ResizeObserver` / `visualViewport`; thread column `flex-1 overflow-hidden`.
- `ConversationView`: scroll helpers in `message-scroll.ts`; reset stick-to-bottom on `caseId` change; scroll only on `[data-testid="message-history"]` (no `window.scrollTo`).

### Socket.IO

- “Reconnecting for new messages…” is shown only while status is `connecting` or `reconnecting` (`useCommunicationSocket.ts`).
- Persistent banner usually means ticket/origin/CORS issues or API not on **4001** with `NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN` / API URL aligned.
- **Verify:** Network → WS to API `:4001`, `POST /api/communication/realtime-ticket` 200, no duplicate message IDs after resync.

### Tests

- `web/src/features/my-messages/message-scroll.test.ts` (node:test) — **pass**
- Existing `message-merge.test.ts` — **pass**

### UI verification note

Port **3000** may still serve an older production build. Confirm chat layout on a fresh `web` dev/preview build before the demo; do not assume :3000 reflects these changes until rebuilt/restarted.

---

## 2. Safe client-demo OTP (`123456`)

### Design

| Safeguard | Implementation |
|-----------|----------------|
| Opt-in, default OFF | `CLIENT_DEMO_OTP_ENABLED=false` |
| Allowlist only | `CLIENT_DEMO_OTP_ALLOWED_MOBILES` (E.164) |
| Not production | Refused when `NODE_ENV=production` |
| Not NODE_ENV-only enable | Requires `CLIENT_DEMO_OTP_ENABLED=true` **and** loopback DB check |
| Local DB only | `mysql://…@127.0.0.1\|localhost\|::1]/farmexit` |
| Server-side only | `OtpService` via `buildClientDemoOtpConfig` + `pickOtpCodeFromConfigs` |
| Coexists with dev OTP | `CLIENT_DEMO_*` checked before `DEV_FIXED_OTP_*` |

### Enable for client presentation (local demo only)

In `api/.env` (loopback `farmexit` DB):

```env
CLIENT_DEMO_OTP_ENABLED=true
CLIENT_DEMO_OTP_CODE=123456
CLIENT_DEMO_OTP_ALLOWED_MOBILES=+201099887701,+201099887702,+201099887703,+201099887704,+201099887705
```

In `web/.env` (UX hint only, mirrors allowlist):

```env
NEXT_PUBLIC_CLIENT_DEMO_OTP_HINT_MOBILES=+201099887701,+201099887702,+201099887703,+201099887704,+201099887705
```

Restart API after changing env.

### Disable after demo

Set `CLIENT_DEMO_OTP_ENABLED=false` (or remove vars), restart API. Remove or clear `NEXT_PUBLIC_CLIENT_DEMO_OTP_HINT_MOBILES` on web.

### UX

- `SignInForm` shows localized `otp.demoHint` only when the entered mobile matches the public hint list.

### Tests

- `api/src/modules/auth/client-demo-otp.spec.ts` — **pass** (3 cases)

---

## 3. WhatsApp floating button

- Enhanced `FloatingWhatsApp.tsx`: WhatsApp green, shadow, breathe + ring animations (`portal.css`), `prefers-reduced-motion` respected, RTL/LTR via `end-*` positioning.
- **Live link:** `NEXT_PUBLIC_FARMEXIT_WHATSAPP_NUMBER` (digits only) → `wa.me` with localized prefill.
- **Placeholder:** `NEXT_PUBLIC_FARMEXIT_WHATSAPP_PLACEHOLDER=true` → visible disabled button, **no** `wa.me` link.
- Composer / mobile nav offsets preserved via existing `data-portal-composer` / `data-mobile-nav` selectors.

---

## 4. Management & partnership publication

### Contract (unchanged public query)

`GET /api/v1/public/management` and `GET /api/v1/public/partnerships` return rows where:

- `status = approved`
- `visibility = public`
- `publishedAt != null`
- approved `request_reviews` row
- farm not deleted

Approval **does not** publish (existing review tests unchanged).

### New staff action

- `POST /staff/farm-management-requests/:id/publish` (`@StaffRoles(admin)`, super-admin satisfies guard)
- `POST /staff/partnership-requests/:id/publish` (same)
- `OpportunityPublicationService`: eligibility (approved, private, `submittedAt` set, approved review, detail present, active owner, live farm), sets `visibility=public` + `publishedAt`, audit `opportunity_published`, status history reason `published_to_public_marketplace`. **Status stays `approved`** (not listing-style `published`).

### Owner consent

Represented by **`submittedAt`** (owner submitted the request to FarmExit). Not auto-published on approval.

### Dashboard

- `OpportunityPublishPanel` on farm-management and partnership detail pages: states *Approved — Private* / *Published* / *Not eligible*; **Publish** when eligible (admin session).

### Website

- `PublicOpportunities` already renders cards when API returns items; empty state when `total=0`.
- **Management public apply API:** not implemented — no fake Apply button (unchanged).

### Live API check

- `GET http://127.0.0.1:4001/api/v1/public/management?page=1&pageSize=5` → `{"items":[],"total":0}` (**live**, 2026-10-22) — expected until staff publishes an eligible demo request (e.g. **762**, not **753**).

### Tests

- `api/src/modules/requests/opportunity-publication.service.spec.ts` — **pass**
- `api/src/modules/farm-management-requests/public-marketplaces.spec.ts` — **pass**

---

## 5. Files changed (summary)

| Area | Files |
|------|--------|
| API OTP | `client-demo-otp.ts`, `client-demo-otp.spec.ts`, `otp.service.ts`, `env.validation.ts`, `.env.example` |
| API publication | `opportunity-publication.service.ts`, `opportunity-publication.service.spec.ts`, `requests.module.ts`, staff MP controllers, MP modules, MP/partnership DTOs + `toResponse` |
| Web messages | `MessagesWorkspace.tsx`, `ConversationView.tsx`, `message-scroll.ts`, `message-scroll.test.ts`, messages pages, `portal.css`, `MyFarmExitLayout.tsx` |
| Web auth/contact | `SignInForm.tsx`, `client-demo-hint.ts`, `FloatingWhatsApp.tsx`, `messages/*/auth.json`, `contact.json`, `workspace.json`, `.env.example` |
| Dashboard | `OpportunityPublishPanel.tsx`, `workflows.ts` actions, farm-management + partnership detail pages, `admin.json` (en/ar) |
| Scripts | `client-demo-safety.cjs` (`--publish` guard updated) |
| Web tests | `package.json` `test:unit` includes `message-scroll.test.ts` |

---

## 6. Test & build results

| Command | Result |
|---------|--------|
| API jest `client-demo-otp\|opportunity-publication\|public-marketplaces` | **20 passed** |
| API `npm run build` | **OK** |
| Web `npm run test:unit` | **10 passed** |
| Web `npm run typecheck` | **OK** |
| Dashboard `npm run typecheck` | **OK** |

---

## 7. Safe demo walkthrough

1. **OTP:** Enable `CLIENT_DEMO_*` on API + hint env on web; sign in as `+201099887701` with `123456`; sign out and confirm session ends.
2. **Messages:** Open `/en/my/messages/{caseId}` on a build that includes this diff; send several messages — only `#message-history` scrolls; composer stays visible.
3. **WhatsApp:** Set `NEXT_PUBLIC_FARMEXIT_WHATSAPP_PLACEHOLDER=true` for visual demo, or real number when available.
4. **Publication:** As admin/super-admin, open approved **private** management or partnership request (not 753); use **Publish opportunity**; refresh `GET /public/management` or `/public/partnerships`; confirm card on `/en/management` or `/en/partnerships`.
5. **Negative:** Non-allowlisted mobile + `123456` fails; reviewer cannot publish (403).

---

## 8. Remaining blockers

| Item | Notes |
|------|--------|
| Port 3000 build freshness | Rebuild/restart website or use isolated preview to validate UI fixes. |
| Realtime banner | If persistent, fix `NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN` / API CORS / ticket 401. |
| Public management apply | No applicant API — document only. |
| Screenshots | Capture corrected chat + marketplace cards manually during demo prep. |
| DB publication | No auto-publish; staff must publish at least one eligible demo opportunity for non-empty public pages. |

---

## 9. Readiness verdict

**Conditionally ready for client demo** after:

1. Enabling client-demo OTP env (local only) and disabling afterward.  
2. Publishing at least one **eligible** approved management/partnership request via dashboard (not 753).  
3. Verifying messages + WhatsApp on a **current** website build (not assumed stale :3000).  
4. Confirming Socket.IO connects to API **4001**.

Core backend publication and OTP safeguards are implemented and tested; UI scroll/WhatsApp/auth hints require a fresh website preview for visual sign-off.
