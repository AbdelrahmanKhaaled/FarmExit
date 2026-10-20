# Phase 5 local Figma reference map

Sources: `figma-baselines/phase5/02 · Authentication.pdf` (23 pages), `03 · My FarmExit.pdf` (23 pages), and `03_Arabic_References_Figma.pdf` (6 pages). All 52 pages were rendered and reviewed, including contact sheets and detailed state references. These PDFs are image-only. No Figma MCP calls were made.

Page-level Figma references: [Authentication 251:4319](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=251-4319), [My FarmExit 264:2](https://www.figma.com/design/5orM3z9jyhuJdc0XW63Vs7?node-id=264-2). The PDFs do not provide individual frame IDs; none have been guessed.

Routes below have an `/en` or `/ar` prefix.

| PDF | Pages | Reference screens | Existing route / presentation |
| --- | --- | --- | --- |
| Authentication | 1 | Farm Details context | `/farms/[slug]`; Phase 4 visual UI untouched |
| Authentication | 2 | Request/login overlays | Soft navigation to `/sign-in`; `AuthDialog`, `SignInForm`. Request submission remains in the protected portal |
| Authentication | 3–4 | Six-digit OTP, invalid code, resend variants | `/sign-in`; `OtpInput`, existing request/verify endpoints and cooldown |
| Authentication | 5 | Verifying and first-time profile | Loading state in `SignInForm`; `/auth/complete-profile`, `ProfileForm` |
| Authentication | 6 | Request confirmation and submitted state | `/my/farm-details-requests/new?slug=…`, `/my/farm-details-requests/[id]` |
| Authentication | 7 | Tablet farm context | Existing Farm Details, unchanged |
| Authentication | 8–10 | Tablet login, OTP, profile, returning account and confirmation | Shared auth shell and existing authenticated redirect/request routes |
| Authentication | 11 | Standalone login and OTP | `/sign-in`; image/form split layout |
| Authentication | 12 | Standalone profile | `/auth/complete-profile`; same split layout |
| Authentication | 13–16 | Tablet overlay variants | Responsive `AuthDialog`, OTP and profile components; original redirect behavior retained |
| Authentication | 17 | Mobile request context | Protected request form, no unsupported message input |
| Authentication | 18 | Mobile login | Full-width auth shell with Egyptian number prefix and context chip when real public listing data exists |
| Authentication | 19–20 | Mobile OTP and error | Six LTR code cells inside EN/AR presentation, error alert and resend cooldown |
| Authentication | 21 | Mobile profile completion | Verified session number, name and existing optional email input |
| Authentication | 22–23 | Mobile confirmation/success | Protected request form/detail; actual submission date controls sent confirmation |
| Arabic references | 1 | RTL request/login | RTL auth dialog and real farm context |
| Arabic references | 2 | RTL OTP/profile | Shared localized OTP/profile components |
| Arabic references | 3 | RTL confirmation/success | Localized protected request form/detail |
| Arabic references | 4 | Returning account and standalone login | Mirrored image/form shell; existing returning-user redirect |
| Arabic references | 5 | Standalone OTP/profile and farm context | Shared localized auth shell/components |
| Arabic references | 6 | Homepage-context overlays | Soft-navigation auth interception with background retained |
| My FarmExit | 1 | Public marketplace | Outside Phase 5; unchanged |
| My FarmExit | 2–4 | Owner/activity/combined overview | `/my`; actual user-scoped farms, requests and saved results, no global Owner/Buyer role |
| My FarmExit | 5 | Professional overview | `/my`; verification cards only for capabilities returned for the current user |
| My FarmExit | 6 | New account onboarding | `/my`; four approved journey cards; unsupported profile-completeness metric omitted |
| My FarmExit | 7 | My Farms | `/my/farms`; real farm rows and existing add/manage links |
| My FarmExit | 8 | Farm management expansion | `/my/farms/[id]`; existing workspace/actions retained, shared portal presentation |
| My FarmExit | 9 | My Requests | `/my/requests`; real statuses, preserved specialized detail links |
| My FarmExit | 10 | My Applications | `/my/applications`; existing partnership applications only |
| My FarmExit | 11 | Saved | `/my/saved`; reusable cards, public listing links, actual/pending FarmExit Score |
| My FarmExit | 12 | Messages | `/my/messages`, `/my/messages/[caseId]`; desktop inbox/thread split, mobile thread, existing FarmExit-mediated composer |
| My FarmExit | 13 | Documents | `/my/documents`; honest aggregate-unavailable state and link to requests. Existing per-request document APIs/actions retained |
| My FarmExit | 14 | Notifications | `/my/notifications`; honest unavailable state |
| My FarmExit | 15 | Profile | `/my/profile`; real session identity, read-only details, professional profile link |
| My FarmExit | 16 | Empty state variants | Shared `PortalEmpty` for farms, requests, applications, saved, messages and unavailable areas |
| My FarmExit | 17–18 | Tablet overview/requests/navigation | Shared horizontal overflow navigation and fluid portal content |
| My FarmExit | 19 | Mobile overview/activity | `/my`, `/my/requests`; five-item bottom navigation |
| My FarmExit | 20 | Mobile owned-farm status | Existing `/my/farms/[id]` functionality; shared portal shell; no changes to public Farm Details |
| My FarmExit | 21 | Mobile conversation | `/my/messages/[caseId]` |
| My FarmExit | 22 | Mobile onboarding | `/my`; one-column journey cards |
| My FarmExit | 23 | Five verification states | Actual capability status on overview/professional UI: required, review, verified, changes requested, not approved |

## API and reference limits

- No aggregate documents feed, notifications feed/read-state controls, general profile photo/location editing, settings route, or authenticated needs-attention feed was added. Existing unavailable/read-only states remain explicit.
- Existing applications support partnership applications; professional opportunity examples do not become fictional applications.
- Farm/saved list responses do not supply all photographed cards, publication dates, prices or agronomic fields shown in the PDF. Missing fields and private photos are not reconstructed from examples. Saved cards retain neutral existing placeholders and FarmExit Score.
- Name/mobile profile completion and optional email remain functional. The PDF's photo/location completion percentage is omitted because those capabilities are unsupported.
- Returning accounts retain the existing immediate redirect instead of gaining an extra confirmation step. Request confirmation/success retain protected portal routes rather than introducing a new modal workflow.
- All existing Phase 7–9 portal sections remain navigable, including links absent from the smaller reference sidebars. Mobile Account links to profile, and the account-sections disclosure keeps the full navigation/logout accessible.
- The Arabic PDF supplies authentication references. No separate Arabic portal frames were exported; portal RTL checks therefore verify responsive behavior and existing approved tokens, not independent Arabic frame parity.
- Farm Details, backend, dashboard, schemas, migrations, seed data and API handlers were not changed in this phase.

## Review artifacts

- [Interactive comparison](../artifacts/phase5/comparison.html): source PDF pages beside browser screenshots, locale/viewport/screen selector.
- [Authentication contact sheet](../artifacts/phase5/reference/auth/contact-sheet.png), [portal contact sheet](../artifacts/phase5/reference/portal/contact-sheet.png), [Arabic contact sheet](../artifacts/phase5/reference/arabic/contact-sheet.png).
- Browser screenshots are isolated test captures of shared production components. They are never injected into production routes or a database. Test identities and example rows are explicitly confined to `tests/visual/`.
- PDF print margins/multiple frames and different live content prevent a meaningful whole-page pixel-difference percentage. Comparisons are manual; exact pixel parity is not asserted.
