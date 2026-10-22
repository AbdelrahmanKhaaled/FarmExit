# User Dashboard Figma alignment report

Date: 2026-10-22. Website `web/` only; API/Dashboard unchanged except documentation.

## PDF reference

`User_Dashboard.pdf` was **not present in the repository** during implementation; pages were aligned to the task’s cited references (overview 1–2, farms 3–4, requests 5 / mobile 14, applications 6, saved 7, messages 8 / mobile 17, documents/notifications/profile 9–11, empty states 12, mobile nav 13–17) and the user-supplied screenshots. **Re-verify against the PDF after placing it in the repo.**

## Sidebar and navigation

| Before | After |
|--------|--------|
| 13+ items (management, professional, partnerships, proposals separate) | **9 primary items**: Overview, My farms, My requests, My applications, Saved, Messages, Documents, Notifications, Profile |
| — | Legacy routes (`/my/management/*`, `/my/partnerships/*`, `/my/proposals/*`, `/my/professional/*`, `/my/farm-details-requests/*`) **unchanged**; **My requests** nav highlights when on those paths |
| Mobile bottom bar | Overview, My requests, My farms, Messages, Profile (`data-mobile-nav` for spacing) |

## Overview

- Returning users: **Welcome back** + existing section previews (farms, requests, saved).
- **Needs your attention** band for draft / changes-requested requests (real `/requests` data).
- New/empty account: existing onboarding journey cards preserved.
- Request preview links use **`requestDetailHref`** (correct deep routes).

## Unified My Requests

- Single workspace at `/my/requests` with filter chips (All, listings, details, management, partnership, professional verification, purchase proposals).
- **Active / in progress** vs **closed / decided** sections from real status + `closedAt`.
- Cards: type label, farm title or request number, date, status badge, lifecycle action.
- **Excludes** `partnershipApplication` (shown under My Applications).
- URL state: `?category=` and `?page=` pagination.

## Unified My Applications

- `/my/applications` — partnership applications from `/partnership-applications`.
- In progress / decided sections; partnership filter; **management filter disabled** with honest copy (no fake records).

## My Farms, Saved, Messages, Profile, Documents, Notifications

- Farms: existing `MyFarmsList` / workflows unchanged.
- Saved: existing `SavedListings`.
- Messages: taller workspace grid, composer `data-portal-composer` for WhatsApp offset; bubble/layout tweaks preserved REST + Socket.IO.
- Documents / Notifications: existing honest gap / coming-soon behaviour retained.
- Profile: existing `ProfileContent`.

## WhatsApp floating CTA

- Component: `FloatingWhatsApp` via `SiteChrome` in `[locale]/layout.tsx`.
- Position: `end-*` + safe-area (RTL → left automatically).
- **Configuration:** `NEXT_PUBLIC_FARMEXIT_WHATSAPP_NUMBER` documented in `web/.env.example`.
- **Status:** Button **hidden** until a valid number is configured (no invented number).

## EN/AR and responsive

- New strings in `workspace.json` (`unifiedRequests`, `unifiedApplications`) and `contact.json` (both locales).
- Partnership marketplace CTA copy corrected EN/AR.
- Portal padding adjusted for mobile nav + floating CTA.

## Routes preserved (no 404 regressions)

All prior `/my/**` workflow routes remain. Navigation consolidation is display-only.

## Files changed (principal)

| Area | Files |
|------|--------|
| Nav | `portal-nav.ts`, `PortalNavigation.tsx`, `MyFarmExitLayout.tsx` |
| Requests | `unified-requests-core.ts`, `unified-requests.ts`, `UnifiedRequestsWorkspace.tsx`, `my/requests/page.tsx` |
| Applications | `UnifiedApplicationsWorkspace.tsx`, `my/applications/page.tsx` |
| Overview | `OverviewContent.tsx`, `OverviewAttention.tsx`, `my/page.tsx` |
| WhatsApp | `FloatingWhatsApp.tsx`, `SiteChrome.tsx`, `[locale]/layout.tsx`, `messages.ts`, `contact.json` |
| Marketplaces | `PublicOpportunityEmpty.tsx`, `PublicOpportunities.tsx`, `partnership.json` |
| Messages | `MessagesWorkspace.tsx`, `ConversationView.tsx` |
| Tests | `unified-requests.test.ts`, `package.json` (`test:unit`) |
| i18n | `workspace.json` (en/ar), `.env.example` |

## Test results

| Command | Result |
|---------|--------|
| `npm run typecheck` (web) | **PASS** |
| `npm run lint` (web) | **PASS** |
| `npm run test:unit` (web) | **PASS** (9 tests) |
| Production `npm run build` (web) | **NOT RUN** — avoid disrupting port **3000** demo server |
| Browser EN/AR screenshots | **PENDING** — no automated browser pass in this task |

## Screenshots

None captured in-repo. Re-capture after deploying a build with these changes.

## Remaining Figma vs backend gaps

- Global Documents hub (Figma inventory) — API not implemented; gap screen kept.
- Persistent notifications feed — not implemented; no fake badges.
- Management applications — no backend; filter disabled.
- Public opportunity cards on `/management` and `/partnerships` — blocked on publication APIs (`docs/PUBLIC_OPPORTUNITIES_LAUNCH_BLOCKERS.md`).
- Settings nav item — no dedicated settings route; profile covers supported edits.

## Readiness verdict

**LIMITED GO (code-ready, deploy-pending)**

- Information architecture and unified Requests/Applications match the requested Figma direction.
- Real API integration preserved; no fake data.
- **Deploy:** rebuild Website with `NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN=http://127.0.0.1:4001` when replacing the port 3000 production demo.
- **Configure WhatsApp** before demo if official contact is required.
- **Case Agent live relay:** credential blocker documented in `docs/CASE_AGENT_DASHBOARD_ACCESS_VERIFICATION.md`.
