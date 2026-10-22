# Client demo: Management and Partnership verification

Date: 22 October 2026, Africa/Cairo. Repository: FarmExit. Local development only.

## Result and limits

The owner submission, private tracking, Partnership application, staff review and staff-mediated communication journeys were verified against the actual local MySQL database and HTTP API. Website and Dashboard browser checks also passed for the isolated fixtures.

**Public discovery with clickable published opportunities is BLOCKED by the missing approved publication workflow and public detail contracts.** Six separate `[DEMO]` owner requests were prepared, but remain approved/private. Zero public opportunities were inserted. Management applications are **BLOCKED BY MISSING API**. These blocked actions are not client-demo-ready.

The previous implementation incorrectly made review approval publish requests automatically. That behavior has been removed. Request `753` was not changed. No private customer request was published, no schema or migration was changed, and no commit or push was made. Port 4000 was never used.

Evidence labels used below:

- **LIVE VERIFIED**: real local HTTP/BFF/browser/Socket.IO responses backed by MySQL.
- **ISOLATED DB VERIFIED**: persisted synthetic fixtures in the confirmed local development DB.
- **MOCKED TEST PASSED**: unit tests or HTTP tests using fake Prisma.
- **STATIC VERIFIED**: source/contract inspection only.
- **BLOCKED**: required contract or product rule does not exist.
- **FAILED**: an unsuccessful check; corrected failures and their final results are distinguished.

## A. Existing request diagnosis

**ISOLATED DB VERIFIED — read-only inspection of the existing record:**

| Field | Actual result |
| --- | --- |
| ID/reference | `753` / `FM555E9CBB575CFC6A666816DB` |
| Type | `farmManagement` |
| Status | `approved` |
| Visibility | `private` |
| Publication timestamp | `null` |
| Submitted | `2026-10-21T09:18:14.083Z` |
| Approved review | `2026-10-22T07:42:36.093Z` |
| Farm | `487`, active, not deleted |
| Owner | Active owner relationship matches the request creator |
| Supporting document | One document, `reviewed` |

The persisted history is draft → underFarmExitReview → approved. Reviewing the document does not publish the opportunity. Management submission requires a current-situation description; the existing Management approval service does not enforce a separate document publication check. Neither condition grants publication authority.

The actual lifecycle is:

1. Owner creates a private draft through `FarmManagementRequestsService.create`.
2. `submit` checks owner/editable state/current situation and changes status to `underFarmExitReview`, explicitly retaining private visibility.
3. Document review is a separate private operation.
4. Authorized specialized staff review changes the request status, and records review/status/audit history.
5. There is **no dedicated approved Management or Partnership publish action**.
6. Public list queries exclude private requests. Website public pages fetch those lists directly during server rendering, with `cache: 'no-store'`.

Therefore `753` is absent because it is private, has no publication timestamp, and has never passed an authorized publication operation. This is not an empty-state mapping or stale-cache bug. Changing application code cannot legitimately retroactively publish it.

Partnership requests `749` and `750` were also inspected read-only: both are approved/private with no publication timestamp. They were not changed.

### Current public query versus approved product rule

The existing public list implementation was present and registered in both feature modules. It had been introduced in the prior change, with `status = approved`, `visibility = public`, non-deleted farm, and an unconditional `verified: true` response. It did not have a separate authorized publication operation or public details.

The retained read-only list contract is now more conservative:

```text
requestType = farmManagement OR partnership, according to endpoint
status = approved
visibility = public
publishedAt IS NOT NULL
at least one requestReview with decision = approved
related farm exists and deletedAt IS NULL
```

These are the exact current read predicates, **not approval of a new product publication policy**. In particular, the current list contract still filters on `approved`; it does not accept `status = published`. The project has a generic `published` status and publication fields, but the dedicated lifecycle for these two request types is missing. Generic status transitions reject specialized request types, so that endpoint cannot be used as a publishing shortcut.

`docs/PHASE6_MARKETPLACE_API_AUDIT.md` explicitly records the need for product-approved discovery/eligibility rules. `docs/BACKEND_RULES.md` prohibits invented verification claims. The previous automatic visibility/timestamp changes were removed from both specialized review services. An approval now updates **only status**, preserving visibility/publication fields.

Required next product decision: define the canonical Management/Partnership release state, publication authority, release fields/document rules, and withdrawal behavior. Then implement a separately authorized publication action and detail contract. No new publication endpoint or workaround was invented here. Existing request `753` should remain private unless its intended publication is explicitly authorized through that future approved path.

## B. Actual API and Website contracts

All Backend paths below have prefix `/api/v1`.

| Capability | Contract and evidence |
| --- | --- |
| Management public list | `GET /public/management`; **LIVE VERIFIED**, 200, total 0 |
| Partnership public list | `GET /public/partnerships`; **LIVE VERIFIED**, 200, total 0 |
| Public detail, either domain | **BLOCKED**: no public detail API; attempted `GET /public/{domain}/:id` returns 404; no corresponding Website detail page |
| Management owner creation | `POST /farms/:id/management-requests` |
| Management owner tracking | `GET /farm-management-requests`, `GET /farm-management-requests/:id`; **LIVE VERIFIED** |
| Management update/submit | `PATCH /farm-management-requests/:id`, `POST /farm-management-requests/:id/submit` |
| Management apply/proposal | **BLOCKED BY MISSING API**: no supported manager-application endpoint/form to an opportunity |
| Partnership owner request | `POST /farms/:id/partnership-requests`; GET/PATCH `/partnership-requests/:id`; POST `/:id/submit` |
| Partnership applications | POST/GET `/partnership-applications`; GET/PATCH `/:id`; POST `/:id/submit`; **LIVE VERIFIED** |
| Application payload | Create: `{ parentPartnershipRequestId, applicantKind }`; PATCH application message/fit/experience/company fields; upload supporting document before submit |
| Application eligibility | Completed Website profile; parent status approved or published; creator/active farm owners cannot apply to their own opportunity; duplicate active applications rejected |
| Generic own tracking/history | `GET /requests`, `GET /requests/:id`; own permitted status/review/document data |
| Supporting documents | POST/GET `/requests/:id/documents`; GET `/:documentId/download`; private authorization enforced |
| Staff reviews | GET/POST decide under `/staff/farm-management-requests`, `/staff/partnership-requests`, `/staff/partnership-applications` |
| Staff assignment | `PUT /staff/requests/:id/assignments`; existing authorized workflow used on isolated fixtures |
| User conversations | POST/GET `/communication/cases`; GET `/:id`; POST/GET `/:id/messages`; **LIVE VERIFIED** |
| Staff conversations | GET `/staff/communication/cases`; GET `/:id`; GET `/:id/conversations`; POST/GET `/:id/messages`; POST `/:id/relay`; PATCH `/:id/status` |
| Staff message target | Existing `externalUserId` query selects an authorized external conversation; it does not permit arbitrary recipients |
| Realtime | POST `/communication/realtime-ticket` and `/staff/communication/realtime-ticket`; Socket.IO namespace `/communication`, `conv.join` / `case.join`, `message.created` |

Public pagination supports `page` 1–100000 and `pageSize` 1–50, default 20, ordered by publication timestamp and ID descending. Safe response DTO explicitly allows ID, farm name, governorate/area, area in feddans, publication timestamp, actual `reviewStatus: approved`, and selected Management/Partnership description fields. No owner contacts, coordinates, documents, reviewer identity or internal comments are returned. JSON array fields are normalized to strings.

There is **no `verified` database flag**. The unconditional response flag was removed. The card label is now **Reviewed by FarmExit**, tied to an actual approved review predicate, without claiming ownership/document/site verification.

Public discovery uses **direct server-side API fetching**, not a Website public BFF route. Private Website BFF routes exist for Management requests, Partnership requests/applications, documents and communication. Actual Website OTP BFF login, HttpOnly cookies, tracking and logout were verified in Chromium.

Public cards currently have no detail link because the destination contract does not exist. No dead link or invented application endpoint was added.

## C. Safe local fixtures

Script: `api/scripts/seed-client-demo.cjs`.

Safety: `api/scripts/client-demo-safety.cjs` and its Node tests. Requires explicit `NODE_ENV=development`, MySQL loopback host, database exactly `farmexit`, and `--apply --confirm-local-development` for writes. The actual database identity is queried read-only; `@@hostname` must match this development machine. Production, staging, remote/customer/unknown targets and missing environment values are rejected. Default is dry-run. `--publish` explicitly refuses to bypass the missing product rule.

Confirmed target: **127.0.0.1:3306 / farmexit**, server hostname matched the local machine. Credentials were never printed. No migration, reset, truncation or deletion was run.

The dry-run displayed the six references/names before applying. Five isolated synthetic identities were created: owner, different applicant, demo administrator used for reviews, case agent, and other applicant for authorization checks. Dedicated staff passwords were generated randomly in memory; only password hashes were stored. They are not in source or reports. No existing staff account was overwritten.

| ID | Stable reference | Name | Final state |
| --- | --- | --- | --- |
| 762 | DEMO-MP-MGT-01 | [DEMO] Citrus Orchard Management | approved/private, no publishedAt |
| 763 | DEMO-MP-MGT-02 | [DEMO] Greenhouse Management | approved/private, no publishedAt |
| 764 | DEMO-MP-MGT-03 | [DEMO] Mixed Farm Management | approved/private, no publishedAt |
| 765 | DEMO-MP-PART-01 | [DEMO] Orchard Operating Partnership | approved/private, no publishedAt |
| 766 | DEMO-MP-PART-02 | [DEMO] Greenhouse Technical Partnership | approved/private, no publishedAt |
| 767 | DEMO-MP-PART-03 | [DEMO] Mixed Farm Distribution Partnership | approved/private, no publishedAt |

Each request has its own synthetic farm, valid active owner relationship, real domain detail row, draft/submission/review history and `[DEMO]` audit markers. Existing submission and specialized review services were used after draft insertion. Synthetic review comments explicitly say they are not real reviews or publication authorization. Governorate is `[DEMO] Region`; no real customer location, coordinates, photos or performance figures are used. Arabic demonstration text is explicitly authored as synthetic content.

**ISOLATED DB VERIFIED:** six owner requests total, three per domain. **Public fixture count: zero (BLOCKED).**

Seed idempotency was verified against MySQL: second and subsequent applications created **zero users and zero requests**. Stable references are collision-checked; unrelated matching identities/requests cause refusal rather than overwrite.

Verification subsequently created Partnership application `768` against parent `765`, owned by the separate applicant; it is approved/private. Its supporting PDF is a valid synthetic document stored using the existing private document-upload workflow. Two communication cases were opened through existing assignment/case APIs: `25` for Management owner request `762`, and `26` for application `768`. Both hold persisted user/FarmExit messages.

The seed alone is idempotent. `--verify` deliberately exercises writes on these isolated fixtures, including demo messages and rotating only the dedicated synthetic staff credentials in memory for login. It is not a general database reseed.

The initial snapshot of all **317 pre-existing requests** was compared after verification and matched exactly for ID/status/visibility/publication timestamp/update timestamp/creator/farm:

```text
SHA-256: 62118c398722dbecfb493f17b18d34b685e15bb3572bec7c95c417732f84a3b8
unchangedFromInitialSnapshot: true
request 753: still approved/private, publishedAt null
```

No unrelated record was intentionally written; all inserts/updates were restricted to the identified new fixtures and their test authentication/session/audit/document/message records.

## D. End-to-end matrix

| Scenario | Management | Partnerships |
| --- | --- | --- |
| Public listing route EN/AR | **LIVE VERIFIED** HTTP 200, correct empty state, private fixtures excluded | **LIVE VERIFIED** same |
| Published demo card | **BLOCKED** publication workflow absent | **BLOCKED** publication workflow absent |
| Public detail/card navigation | **BLOCKED** missing API + route | **BLOCKED** missing API + route |
| Logged-out authentication requirement | **LIVE VERIFIED** protected Website routes require login | **LIVE VERIFIED** application form redirects to sign-in, preserves return path |
| Owner request create/submit | **ISOLATED DB VERIFIED** real submission service | **ISOLATED DB VERIFIED** real submission service |
| Apply from marketplace | **BLOCKED BY MISSING API** | **BLOCKED** public discovery/detail entry point; existing private application API/form verified separately |
| Application validation/persistence | **BLOCKED BY MISSING API** | **LIVE VERIFIED** different applicant, invalid submit rejected, supporting PDF uploaded, application persisted |
| Owner cannot self-apply | Not applicable; no API | **LIVE VERIFIED** 409 |
| Another user cannot read private application | Not applicable; no API | **LIVE VERIFIED** 404 for other applicant and owner on applicant-only detail |
| Own request/application tracking | **LIVE VERIFIED** Backend + Website BFF + EN/AR browser | **LIVE VERIFIED** Backend + Website BFF + EN/AR browser |
| Review decision reflected | **LIVE VERIFIED** approved owner/staff detail retained | **LIVE VERIFIED** application approved status and staff page retained |
| Staff Dashboard detail | **LIVE VERIFIED** `/en/admin/farm-management/762`, Arabic equivalent | **LIVE VERIFIED** `/en/admin/partnerships/765`, application `/768` |
| Communication case | **LIVE VERIFIED** owner-request case 25 after case-agent assignment | **LIVE VERIFIED** application case 26 after case-agent assignment |
| User message | **LIVE VERIFIED** persisted to staff-mediated conversation | **LIVE VERIFIED** persisted |
| Staff reply | **LIVE VERIFIED** real Dashboard JWT / assigned agent | **LIVE VERIFIED** same |
| Socket.IO delivery | **LIVE VERIFIED** one-use Website ticket, authorized room, real `message.created` | **LIVE VERIFIED** same |
| Staff Dashboard case | **LIVE VERIFIED** `/en/admin/communications/25` | **LIVE VERIFIED** `/en/admin/communications/26` |
| Refresh/history/pagination | **LIVE VERIFIED** Website refresh and real API page 2 | **LIVE VERIFIED** same |
| No direct customer messaging | **LIVE VERIFIED** unknown direct-recipient body rejected; authorized staff-mediated channel used | **LIVE VERIFIED** same, no owner/applicant direct channel |
| Unauthorized case access | **LIVE VERIFIED** outsider receives 403 | **LIVE VERIFIED** outsider receives 403 |
| Dashboard vs Website audience | **LIVE VERIFIED** Website JWT rejected for Dashboard identity/realtime ticket | **LIVE VERIFIED** same shared authentication contracts |
| Logout | **LIVE VERIFIED** sessions revoked and protected requests rejected | **LIVE VERIFIED** BFF logout, protected API 401 and refreshed page redirects |

Reviewer and case-agent permission boundaries also have **MOCKED TEST PASSED** coverage. The live tests used separate demo administrator and assigned case agent. They did not turn a user into a globally exclusive owner/applicant role; authorization remained contextual.

## E. Exact changes in this task

Production Backend:

- `farm-management-requests/staff-farm-management-reviews.service.ts` and `partnership-requests/staff-partnership-reviews.service.ts`: removed prior automatic public visibility/publication timestamp updates from approval.
- `farm-management-requests.service.ts` / `partnership-requests.service.ts`: moved public database reads out of controllers into service methods; normalized public JSON array fields; tightened explicit publication/review predicates.
- Corresponding controllers: thin HTTP delegates with documented response DTO.
- `marketplace/dto/public-opportunity.dto.ts`: explicit public allowlist; actual `reviewStatus`, no invented verified flag.
- `partnership-applications/staff-partnership-applications-reviews.service.ts`: authorized staff can reopen an already reviewed application, while decision concurrency still requires under-review state. This prevents another post-review 404.
- `communication/communication-realtime.gateway.ts` / `.types.ts`: room joins wait for asynchronous connection authentication before checking the user; existing authorization checks remain in place.
- `communication/dto/list-staff-messages-query.dto.ts` and `staff-communication.controller.ts`: properly validate/preserve the Dashboard's `conversationId` query. Previously the global whitelist rejected it, causing a Dashboard conversation HTTP 500.

Website:

- `PublicOpportunities.tsx`: Reviewed wording grounded in actual review state; accurate published-empty wording.
- Management page: removed copy advertising a manager application capability that does not exist. Layout was preserved.

Tooling/tests:

- Local-only seed, environment tests, actual HTTP/Socket.IO verifier, Website BFF browser verifier and Dashboard browser verifier under `api/scripts/*client-demo*`.
- Targeted publication/privacy, reviewed-detail, asynchronous socket-authentication and conversation-query regression tests.
- `api/package.json`: explicit demo commands; `api/eslint.config.mjs`: scoped untyped-JavaScript linting for these CJS utility scripts; production TypeScript lint rules remain unchanged.

The repository already contained extensive uncommitted work. It was preserved. No Dashboard layout, unrelated module, migration, credential policy or customer record was redesigned or replaced.

## F. Checks and evidence

| Check | Result |
| --- | --- |
| Focused API unit suites | **MOCKED TEST PASSED**, 12 suites / 92 tests |
| Seed environment safety tests | **MOCKED TEST PASSED**, 11 Node tests including production/staging/unknown/remote/customer rejection and explicit opt-in |
| Existing Management/Partnership/communication HTTP e2e tests | **MOCKED TEST PASSED**, 3 suites / 9 tests, fake Prisma; not presented as live DB evidence |
| Live MySQL seed/idempotency | **ISOLATED DB VERIFIED**, 6 requests, no duplicate users/requests |
| Actual API/BFF/Socket.IO/browser journeys | **LIVE VERIFIED**, see evidence artifacts |
| API build | Passed `npm --prefix api run build` |
| Website TypeScript | Passed direct `tsc --noEmit`; also checked by successful Website build |
| Targeted API/Website lint | Passed; full Website `npm run lint` also passed, including direction and 15 bilingual message namespaces |
| Website build | Passed with SWC cache access; Next compiled/typed/generated routes successfully |
| Public loading state | **STATIC VERIFIED** server-rendered async read; no separately verified opportunity loading skeleton |
| Empty/error states | **LIVE VERIFIED** EN/AR empty states with real API; EN/AR recoverable error text with temporary test API stopped |
| Eligible public row projection | **MOCKED TEST PASSED** only; no real/public fixture was fabricated to claim publication readiness |
| Draft/rejected/private exclusion | **STATIC VERIFIED** exact predicates + **MOCKED TEST PASSED**; actual approved-private exclusion additionally **LIVE VERIFIED** |

Initial sandbox listener/cache attempts failed because the sandbox prevented binding port 4001 and materializing SWC's cache. Authorized local verification/builds were rerun with the necessary execution access and succeeded. No automatic approval rejection occurred.

Two actual defects found by live verification were fixed and reverified: early socket room-join authentication race, and rejected `conversationId` in staff message queries. Earlier failed smoke attempts are not treated as successful evidence; the final artifacts record successful reruns.

Evidence files:

- `docs/artifacts/client-demo-db-diagnosis.json`: existing request diagnosis, fixture state, unchanged-original-request checksum.
- `docs/artifacts/client-demo-live-evidence.json`: actual API/MySQL/Socket.IO results and explicit blocked scenarios.
- `docs/artifacts/client-demo-browser/evidence.json`: Website BFF, EN/AR pages, tracking, conversation refresh and logout.
- `docs/artifacts/client-demo-browser/dashboard-evidence.json`: Dashboard BFF login, approved request/application pages and both communication cases.
- `docs/artifacts/client-demo-browser/error-evidence.json`: EN/AR public API-unavailable states.
- PNGs in that browser directory: public pages, owner/applicant pages, conversations and Dashboard fixture pages. Only synthetic fixture content was selected.

## G. Remaining blockers

1. **BLOCKED — public publication:** no approved Management/Partnership publication operation/policy. Approval is intentionally private; six fixtures cannot legitimately be made public under the current contract.
2. **BLOCKED — public detail/navigation:** neither public detail API nor Website detail route exists. No clickable opportunity journey is claimed.
3. **BLOCKED BY MISSING API — Management applications:** supported Management journey is owner submission/tracking/communication, not manager application to a public opportunity.
4. **BLOCKED — complete public Partnership entry journey:** private application API/form works, but discovery → public detail → apply is unavailable until publication and details are defined.
5. Local `api/.env` currently configures port 4000. It was not edited or used. All verification listeners explicitly used 4001. Use the explicit command below for a demo; do not run an unqualified API start command that inherits 4000.

## H. Practical manual demo walkthrough

These steps demonstrate supported private workflows; they do not demonstrate public published opportunities.

1. The verified API was left running on **4001** for the local demo. If it needs restarting, use this explicit command from `api/`:

   ```powershell
   node -e "process.env.PORT='4001'; require('./dist/main.js')"
   ```

   Use Website on 3000 and Dashboard on 3002. Existing user-owned servers were left untouched. Temporary verification API listeners are closed by their scripts.

2. Sign into Website using the isolated `[DEMO] Client Demo Owner` identity from `PEOPLE` in the seed script, through the normal local development OTP flow. Codes remain in the existing DevelopmentSmsProvider path; no fixed password/code is supplied here.
3. Open `/en/my/management/762` (or `/ar/my/management/762`), show approved status/history/feedback and the clearly synthetic request; then open `/en/my/messages/25` to show persisted FarmExit-mediated conversation.
4. Using an existing authorized Dashboard session, open `/en/admin/farm-management/762`, `/en/admin/partnerships/765`, and `/en/admin/partnerships/applications/768`. The approved pages now remain accessible.
5. Sign into Website as the separate `[DEMO] Client Demo Applicant`. Open `/en/my/applications/768`, `/en/my/applications`, and `/en/my/messages/26`. Refresh to show persistence; Arabic counterparts also resolve.
6. In Dashboard open `/en/admin/communications/26` to show the correct applicant conversation and staff reply. Management conversation is `/en/admin/communications/25`. Continue messages only within these isolated demo cases and through FarmExit staff.
7. Logout and revisit the protected application URL: sign-in is required and protected BFF data is unavailable.
8. If showing `/en/management` or `/en/partnerships`, explicitly explain that public publication is not available; these pages correctly show no published opportunities. Do not describe them as ready public marketplaces with clickable demo cards.

Reproduction commands from the repository root:

```powershell
npm --prefix api run build
npm --prefix api run seed:client-demo -- --dry-run
npm --prefix api run seed:client-demo -- --apply --confirm-local-development
npm --prefix api run seed:client-demo -- --apply --confirm-local-development --verify
npm --prefix api run verify:client-demo-browser
node api/scripts/verify-client-demo-dashboard.cjs
```

The verification commands bind port 4001 themselves and refuse to replace an existing listener. Run sequentially with that port free. Browser checks use running Website/Dashboard servers on 3000/3002. OTP cooldown/hourly limits remain enforced. Synthetic staff verification credentials can rotate; no password is printed or committed. Normal seed-only runs do not rotate credentials.
