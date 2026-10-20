# Phase 5 — Authentication and My FarmExit visual reconstruction

Phase 5 only. Local PDFs were used as the visual source; no Figma MCP quota was consumed. See [reference-to-route map](PHASE5_REFERENCE_MAP.md) for all 52 exported pages and the exact scope/API limits.

## Implemented presentation

- Authentication: standalone photo/form layout, intercepted login modal, compact mobile layout, EN/AR RTL, Egyptian `EG +20` input, six LTR OTP boxes, resend timer, error/loading presentation, verified mobile and first-time name completion. Existing optional email, OTP payloads, cookies, refresh logic, deferred saved-item intent and sanitized `returnTo` behavior are retained.
- Portal: account sidebar, icons/active links, responsive horizontal tablet navigation, full navigation/logout access on mobile, five-item mobile bottom bar with reserved space, headings, row cards, empty states, onboarding journey cards, saved cards with real/pending FarmExit Score, profile presentation, verification status cards, and request confirmation/sent presentation.
- Messages: existing FarmExit-mediated inbox/composer and per-case routes remain functional; desktop thread view includes the inbox, while mobile shows the conversation. No direct owner/buyer channel was added.
- Existing Phase 7–9 actions remain available. Public Farm Details, API handlers, backend, dashboard, database, migrations and seeds were not modified by this phase. No commit or push was made.

## Verification and screenshots

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, including direction and EN/AR message checks |
| `npm run build` | Passed |
| Isolated Playwright visual suite | 6 passed; EN/AR × 1440/1024/390px |
| Production authentication / existing portal regression suite | 41 passed, 9 skipped |
| Malformed OTP and private BFF authorization checks | 12 passed; no SMS/database writes |

Visual suite: `npx playwright test --config tests/visual/phase5.config.ts`.

Regression suite: `npx playwright test auth.spec.ts phase5-auth.spec.ts phase7-portal.spec.ts phase8-portal.spec.ts phase9-portal.spec.ts phase10-authenticated.spec.ts --workers=2`.

API guards: `npx playwright test phase10-integration.spec.ts --grep 'malformed OTP|private BFF' --workers=2`.

The skipped cases are intentional project exclusions and the real authenticated-session test: no dedicated `FX_E2E_MOBILE` development account was selected. Live OTP/session rotation and populated private account screens therefore remain unverified in this run. API/session implementation files were preserved. Browser-intercepted OTP tests verify normalization, six code fields and validation; the production modal test verifies soft-navigation interception, Escape dismissal and standalone rendering after refresh.

There are **102 browser captures** covering 17 screen/state presentations at six locale/viewport combinations. They render shared production components inside the existing isolated visual-test app. Test-only identities, example request rows, message bubbles and score values are confined to that app; they are never inserted into MySQL or served by production routes. Actual documents/notifications remain unavailable. The suite checks runtime errors, horizontal overflow, mobile bottom-bar clearance, absence of an unsupported request message field, and verification-card action placement.

- [Interactive PDF/browser comparison](../artifacts/phase5/comparison.html)
- [English desktop review](../artifacts/phase5/en-1440-review.png), [tablet](../artifacts/phase5/en-1024-review.png), [mobile](../artifacts/phase5/en-390-review.png)
- [Arabic desktop review](../artifacts/phase5/ar-1440-review.png), [tablet](../artifacts/phase5/ar-1024-review.png), [mobile](../artifacts/phase5/ar-390-review.png)
- [Full browser captures](../artifacts/phase5/screenshots/)
- Validation logs: [build](../artifacts/phase5/build.log), [typecheck](../artifacts/phase5/typecheck.log), [lint](../artifacts/phase5/lint.log), [visual](../artifacts/phase5/visual-test.log), [regression](../artifacts/phase5/regression-test.log), [API guards](../artifacts/phase5/api-guard-test.log).

Manual comparison corrected the split auth composition, form widths/spacing, Egyptian prefix, OTP cells/errors, mobile logo/close treatment, green onboarding card, portal sidebar/navigation, mediated message bubble colors, empty-state medallions, verification styles and mobile verification action crowding. The PDF print margins and multiple frames per page prevent a meaningful whole-page pixel-difference metric. This report does **not** claim exact pixel parity.

## Missing capabilities and remaining differences

| Area | Preserved honest behavior / remaining visual difference |
| --- | --- |
| Documents | No aggregate documents feed. Existing per-request document actions are retained; aggregate page shows unavailable with a requests link |
| Notifications | No notifications feed, unread counts or mark-read operation; no sample notifications are displayed |
| Profile | Real identity fields remain read-only. No fabricated photo/location controls or four-step completion percentage |
| Farm and saved cards | List responses lack approved public photos and several PDF fields. Neutral existing placeholders and available real values are used; private images are never exposed |
| Overview | No invented needs-attention counts/messages. Owner/buyer examples become actual user activity, never a global role. All existing portal links remain, so navigation is larger than some PDF examples |
| Applications | Existing partnership applications remain; professional-opportunity examples are not fabricated |
| Returning account | Existing redirect is retained; no extra confirmation step that changes authentication behavior |
| Request confirmation/success | Presentation follows the reference within existing protected portal routes rather than a new modal workflow. No unsupported message field; actual submission controls sent state |
| Arabic portal | No dedicated local Arabic portal reference PDF. RTL/overflow/navigation were verified at all widths using current approved tokens and translations |
| Existing routes/actions | Optional profile email, full sidebar access, logout, portal footer and existing professional/request actions remain even where omitted from the PDF composition |
| Fine visual parity | Different real content, missing card imagery/metadata, print scaling, some wrapping, and preserved portal structure remain visible differences |

Build output retains the existing multiple-lockfile workspace-root warning. Isolated dev renders also log shared logo dimension/LCP recommendations; they do not fail rendering or alter the approved assets.

## Files modified

Changes are confined to web authentication, My FarmExit presentation, EN/AR copy, tests and review artifacts. [Exact file list](../artifacts/phase5/files-modified.txt).

- Auth shell/forms: `src/features/auth/{AuthScreen,AuthDialog,AuthClose,SignInRoute,SignInForm,MobileInput,OtpInput,ProfileForm}.tsx`.
- Auth routing: locale layout slot, `@auth` interception/default/null routes, sign-in and profile-completion pages.
- Portal components: `PortalUI`, `PortalNavigation`, `MyFarmExitLayout`, `OverviewContent`, `SavedListings`, `ProfileContent`, scoped `portal.css`.
- Portal pages: overview, farms, requests, applications, saved, documents, notifications, profile and message thread.
- Existing feature presentation: inbox/conversation, shared message thread, professional status cards, protected farm-details request form/detail. The public Phase 4 Farm Details components were untouched.
- Copy: `messages/{en,ar}/{auth,workspace}.json`.
- Verification: Playwright auth/visual tests and config, isolated fixture route, reference map, this report, PDF renders, comparison viewer, screenshots and logs.

Stopped after Phase 5. No Phase 6 implementation was started.
