# FarmExit requests, localization, and workflows implementation report

Date: 2026-11-02 (Africa/Cairo). **Partial delivery; not release-ready and not 100% complete.**

## Checkout and production safety

- Fetched `origin/main`; base commit: `6c3bcb720f969f9cb4c01fc4de60c368540d4754`.
- Implementation branch: `fix/six-request-workflows`.
- Isolated checkout: `.worktrees/six-request-workflows`. Implementation changes are uncommitted. The original checkout's staged work was preserved; no reset, clean, stash, force-push, push, or deployment was performed.
- Read the complete supplied brief, backend rules, applicable repository instructions, schema, owner and staff services, DTOs, BFF routes, locale pages, and shared layouts. Screenshots were treated as defect evidence, not proof of a backend cause.
- No production DB connection, seed, migration, approval, PM2 action, or production configuration change was performed. Public URL fetches through the web tool were unsuccessful; production authenticated behavior was not verified.
- Prisma client generation used dummy loopback connection strings and does not prove a database connection. Browser tests used a loopback mock API, fake expiring fixture tokens, and synthetic records. These are **not authentication or MySQL evidence**.

## Six defects

Source references below are relative to this isolated checkout; source line numbers are listed in `evidence/six-fixes/source-references.txt`.

| Defect | Exact root cause | Implemented fix | Executed verification | Status |
|---|---|---|---|---|
| 1. Account sidebar stretches | `web/src/features/my-farmexit/MyFarmExitLayout.tsx:32` at base: grid explicitly used `items-stretch`; aside had neither self-sizing nor sticky positioning. | Grid uses start alignment; desktop aside uses sticky 96px offset, content height, viewport-bounded height and local overflow. Smaller layouts remain in normal flow. Shared locale layout preserves RTL/LTR ordering. | Real Chromium at 1440/1024/390, AR/EN; top/middle/bottom screenshots; desktop computed sticky assertion. | Implemented and mock-backed browser verified; full authenticated acceptance remains partially blocked. |
| 2. Missing bilingual authoring | Language editor placement was limited to selected forms/steps. `PartnershipWizard.tsx:195` at base restricted `localizedContent` PATCH to owner requests. Application DTO/service had no localized contract; canonical fallback could resurrect cleared text. Other real narrative surfaces remain monolingual. | UI locale now initializes authoring language. Management custom term/goals/experience/presence and request team/facility text have editors. Partnership narrative fields and application narrative answers use the editor; application translations persist inside existing `proposalDetails.localizedContent`, preserving sibling JSON properties. Added explicit-clear helper and locale-aware application/admin read-back. | Two content helper tests; management DTO/service tests; both editor languages switched repeatedly and saved/reloaded in Chromium. | Professional verification summaries, purchase proposal notes and exchange-asset descriptions now have DTO/storage/editor/read-back support too. Comprehensive all-surface authoring acceptance remains partially blocked. |
| 3. Responsibilities cannot be selected | `ManagementWizard.tsx:486` at base rendered `checked={false}`, `disabled`, and a no-op handler. Existing Prisma `responsibilities`, `experienceLevel`, `onSitePresence` columns were omitted from write DTOs, create/update service data and response mapper. | Existing four responsibility IDs retained; checkbox state supports select/deselect. Added shared validated requirements DTO, field limits, create/update/read mappings, owner review and staff review presentation. No assignment or farm-inventory write. | DTO rejection cases, bilingual merge and read-back service test; actual owner browser selection/save/reload. | Implemented; real DB create→submit→review→owner read-back remains partially blocked. |
| 4. Resources cannot be edited | `ManagementWizard.tsx:500` at base showed unsupported copy plus a deliberately read-only farm inventory. Existing `currentTeam` and `resourcesAndFacilities` request columns were never exposed in DTOs/services. | Separate request-owned team entries (role/count) and facilities (known facility type/details), add/remove, nested validation, per-language text, persistence/read-back and staff display. Registered inventory remains read-only. | Nested DTO validation rejects invalid count/type/extra fields; service write/read/clear test; AR/EN browser resource save/reload and mobile overflow assertions. | Implemented; representative legacy-data and MySQL persistence verification remain partially blocked. |
| 5. No Single Request decision | `RequestActions.tsx:52` at base excluded every specialized type with `!specialized`, although guarded domain decision actions already existed. Super Admin scope already exists on the backend; a role bypass was unnecessary. | New typed action dispatcher embeds the established decision form and selects each domain's server action. Only eligible under-review requests show it. Existing application review remains the single application form. Success refreshes the page; unified list/detail invalidation added. Publication remains separate. | 44 focused API tests include Super Admin scope, denial, rejection reason and racing approval. 24 mock-backed real-browser cases: six types × AR/EN × desktop/mobile; save decision→refresh→private approved state. | Implemented action wiring; actual authenticated end-to-end decisions and prerequisites across all domains remain partially blocked. |
| 6. Exact details route 404 | `my/farm-details-requests/new/page.tsx:22` at base explicitly called `notFound()` whenever `slug` was absent. The route existed in both locales; it was not a middleware/filesystem omission. | Missing slug now shows localized listing-selection guidance and locale-aware `/farms` navigation behind existing profile/session guards. A supplied slug retains the real listing request form. | Exact no-query route exercised with fixture session in AR/EN at all three widths. 79 route patterns inventoried; 63 protected patterns × two locales exhibited guest login guards. | Exact route fixed and browser verified; full authenticated locale parity, all dynamic data/error states remain partially blocked. |

## Domain decision matrix

All decisions continue through existing controller→authorization→domain service→transaction paths. Nothing adds a generic database status override.

| Request type | Domain decision endpoint | Eligible decision source | Existing permitted scope | What approval does not do |
|---|---|---|---|---|
| farmListing | `/staff/listing-requests/:id/decision` | underFarmExitReview | admin/Super Admin or assigned reviewer with review permission | Publish a listing, approve image rights, accept a sale |
| farmManagement | `/staff/farm-management-requests/:id/decide` | underFarmExitReview | admin/Super Admin or assigned reviewer with review permission | Publish, appoint a manager, create farm relationships |
| partnership | `/staff/partnership-requests/:id/decide` | underFarmExitReview | Existing partnership authorization | Publish an opportunity or promise financial returns |
| professionalVerification | `/staff/professional-verification-requests/:id/decide` | underFarmExitReview | Existing verification authorization and capability checks | Publish private documents or appoint professionals |
| partnershipApplication | `/staff/partnership-applications/:id/decide` | underFarmExitReview | Existing admin/Super Admin and assigned case-agent policy | Accept contractual terms or expose contacts |
| farmDetails | `/staff/farm-details-requests/:id/reviews` | underFarmExitReview | Existing admin/Super Admin and assigned case-agent policy | Send private files automatically or make public content |
| professionalApplication and other generic unified requests | Existing `/staff/requests/:id/reviews` and domain status policy | Existing generic policy, unchanged | Existing generic staff policy | Bypass specialized request protections |
| farmPurchaseProposal | Existing proposal/offer and forwarding workflows | Existing domain-specific policy, unchanged | Existing proposal authorization | Accept an offer, transfer ownership, or complete a payment |

The new dispatcher returns no form for drafts or final/published states. Existing services own prerequisite checks, audit/history writes, assignment restrictions, and concurrency. The management test proves one winner using a mocked conditional update; it is not proof of database transaction isolation. No new notification mechanism was invented.

## Bilingual source-of-truth mapping

| Surface | Authoritative storage | Structured fields kept separate |
|---|---|---|
| Farm/listing authoring | Existing farm/listing `localizedContent` and legacy canonical fields | Farm IDs, prices, enums, dates, media |
| Management narrative | `FarmManagementDetail.localizedContent` plus legacy canonical fields | Professional need, management types, responsibility IDs |
| Management team/facilities | Request's `currentTeam` / `resourcesAndFacilities` JSON; each entry can contain validated `localizedContent` | Count and authoritative facility IDs |
| Management experience/presence | Existing short canonical columns plus translated values in request `localizedContent` | Limits: 30 and 100 characters respectively |
| Partnership owner narrative | Existing `PartnershipDetail.localizedContent` | Objectives and partner-kind choices |
| Partnership application narrative | Existing `RequestApplicationDetail.proposalDetails.localizedContent` | Company identity, registration/contact fields, IDs |
| Farm details request | Listing slug and request identity; no authored message in its existing contract | No artificial language switch added |
| Professional verification / purchase proposal | New nullable `localizedContent` columns; summaries/notes/asset descriptions retain canonical fallbacks | Identity, financial values and component types remain structured |

UI route locale and content editor language are independent. No machine translation is performed. Completeness counts nonblank fields in that editor section, not request eligibility. Display prefers the requested translation, then existing canonical text, then the other stored language. A translated value is never invented. PATCH merges language dictionaries. New management validation bounds responsibility lists, nested resources, counts, text lengths and unknown fields. The explicit-clear helper prevents management canonical text from reappearing after both translated values are cleared for the covered fields; this behavior still needs auditing across every legacy authoring surface.

## Schema and compatibility

Migration `20261102120000_request_narrative_locales` adds nullable JSON columns to `ProfessionalVerificationDetail` and `FarmPurchaseProposalDetail`. It is unapplied and requires MySQL verification. See `FARMEXIT_REQUEST_NARRATIVE_MIGRATION_REVIEW.md`. All management fields already exist in `FarmManagementDetail`. Application localized content is an additive JSON key within existing `proposalDetails`; existing sibling keys are preserved. Old clients can omit every added field; old records may have null values. Real legacy JSON shapes were not inspected in production and must be covered with sanitized fixtures before release.

Never use `db push`, database reset, or a production seed. Compare the release branch migration directory with the deployed migration ledger during release review; the brief reports nine applied migrations including `20261028140000_bilingual_public_content`, but that production ledger was not independently accessed here.

## Executed checks and evidence

- API build and Prisma schema validation: passed. `prisma generate`: passed using dummy local URLs, without a database connection.
- Website and dashboard builds/typechecks/lint: see retained final logs in `evidence/six-fixes/`. Final website/dashboard logs show successful builds, typechecks and lint.
- Focused API suite: **44 passing tests**, five suites, using `node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.six.config.cjs --runInBand` from `api/`.
- Content fallback/clear tests: **2 passing**, using `node --experimental-strip-types --test --test-isolation=none web/src/lib/content/localized.test.ts` from the checkout root.
- Owner Chromium: six viewport/locale combinations, 36 screenshots. `browser-results.json` records mock-backed interaction, independent bilingual values, draft save and reload checks.
- Admin Chromium: 24 combinations, 24 screenshots. `admin-browser-results.json` records six specialized request types in both locales at 1440px and 390px, decision→refresh checks. Synthetic fixture authorization is not a real login test.
- Additional narrative Chromium: four AR/EN desktop/mobile combinations, eight screenshots; verification summaries and purchase proposal notes independently switched, saved and reloaded. See `narrative-browser-results.json`.
- `route-parity.json`: 79 shared locale route patterns, 63 protected route patterns checked as guests in both locales; no missing login guards observed. Public pages are inventoried, not marked functionally verified. Exact `/ar/my/farm-details-requests/new` has separate fixture-session screenshots.
- Full default API test command failed on existing ESM/Jest global setup. The dedicated focused config uses explicit ESM transformation, extension mapping and Jest globals. An earlier expanded run also found the existing management test asserting absence of `visibility`, although the existing mapper returns that property. It was not removed to hide the failure.
- Default API typecheck fails broadly on extensionless imports under NodeNext. Full API lint likewise reports widespread unresolved types and existing errors; it is not a passing gate. No claim that every changed API file is lint-clean is made.
- Real local MySQL was unavailable; Docker daemon was not running. No staging database was supplied or inferred from production credentials.

Screenshots are actual browser captures of the application, backed by the explicitly local mock API. Examples: `ar-1440-responsibilities.png`, `en-390-resources.png`, `ar-390-details-new.png`, `en-1440-sidebar-bottom.png`, and `ar-390-admin-farmManagement.png`. All are under `docs/evidence/six-fixes/`.

Reproduction: build each app with loopback `FARMEXIT_API_URL=http://127.0.0.1:4499/api/v1`; run `web/scripts/six-fixes-mock-api.mjs`; start website on 3499 and dashboard on 3599. Run owner checks before admin checks because the fixture server intentionally shares synthetic state. Start a fresh mock API process before owner tests so its management fixture is draft; admin harness resets its request for each type. Run scripts from `web/`: `node scripts/verify-six-fixes.mjs`, `node scripts/verify-six-fixes-admin.mjs`, `node scripts/verify-six-fixes-narratives.mjs`, and `node scripts/route-parity-six-fixes.mjs`. Never substitute production API URLs into these fixture runs.

## Remaining blockers / required acceptance work

1. Complete all-surface bilingual acceptance, including newly added professional verification and purchase proposal translations. Review any remaining localizable authored fields on admin edit surfaces and professional profiles; those broader editing surfaces are not comprehensively browser verified.
2. Provision an explicitly disposable local/staging MySQL database. Apply the full reviewed migration chain there; seed only synthetic users/staff/farms/listings/documents. Complete management and partnership/application create→draft→refresh→edit→submit→real admin decision→owner read-back. Include actual cookie login, upload authorization, submit prerequisites and document privacy.
3. Run document-prerequisite, invalid-status, unauthorized-owner, assigned-staff and concurrent decision tests for every domain against that database. Management mocked tests do not cover all domains.
4. Complete authenticated parity for every applicable route, canonical/back links, loading/error/not-found states, keyboard/focus, scroll bounds/footer collision, validation failures and unknown legacy JSON records. Current browser evidence covers a subset, with mocks.
5. Resolve the repository's API test/typecheck/lint configuration and baseline failures before release. Repeat all affected checks and regression suites for listing, partnership, homepage, permissions and uploads.
6. The supplied brief identifies production `NODE_ENV=development` and development SMS/storage providers as a **production security blocker**. These were not independently verified or changed. Review and correct them through an approved release process before any deployment.

## Safe release instructions — not executed

1. Review this branch's diff and this report. Do not merge or deploy while the acceptance blockers above remain. Record a reviewed implementation commit, test DB results and immutable build artifacts. Re-fetch `origin/main`; reconcile in this isolated feature branch without disturbing the original index/worktree. Do not force-push.
2. Once gates pass, merge through the normal reviewed PR process. Record pre-release API commit, PM2 environment/config, active web/dashboard deployment IDs, and a verified database backup/restore plan. Keep secrets out of logs and reports.
3. Audit production environment configuration: production mode, approved SMS/storage, CORS, secure cookies, private document storage and disabled development OTP/seeds. Obtain explicit release approval. Do not merely change `NODE_ENV` while keeping development providers.
4. Release API first from the reviewed commit. Use its lockfile (`npm ci`), generate Prisma client, and build. This patch includes `20261102120000_request_narrative_locales`. Inspect SQL and migration status against the recorded ledger, test the full chain on restored disposable data, back up, and only then run the approved `prisma migrate deploy` before activating the new API artifact. Never run reset or seed.
5. After approval, update the existing PM2 `farmexit` process with the reviewed production environment (for example the team's approved `pm2 reload farmexit --update-env` procedure). Confirm port 9321/Apache routing, `/api/v1/health`, and synthetic authorized smoke tests; do not decide real customer requests for QA.
6. Build/deploy website and dashboard previews from the same reviewed commit against authorized staging. Repeat AR/EN desktop/mobile persistence and domain decision tests there. Promote only after explicit approval, preserving the prior deployment IDs. No automatic Vercel deployment was performed in this task.
7. Rollback: restore previous web/dashboard deployments first if necessary, then the prior API artifact and reviewed environment through the approved PM2 procedure. Keep the new nullable columns and additive optional JSON keys in place when rolling back application code; do not drop saved translations. Preserve newer customer data. Any migrations introduced elsewhere in the merged branch require their own reviewed roll-forward/rollback plan.

## Changed files

See `evidence/six-fixes/changed-files.txt` for the exact implementation and artifact inventory. Build/test logs and screenshots are evidence, not production application data. The branch has no implementation commit yet; its HEAD remains the base commit above.
