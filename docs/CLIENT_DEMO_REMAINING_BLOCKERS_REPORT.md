# Client demo remaining blockers

Date: 2026-10-22. API `http://127.0.0.1:4001/api/v1`, Website `http://localhost:3000` (production build, unchanged), Dashboard `http://localhost:3002`. Port 4000 not used. No commits or pushes.

## Recommendation

**LIMITED GO** for client demonstration.

- **Unblocked:** Super Admin staff assignment on unified request workflows (backend fix verified live). Purchase/co-purchase submission on an isolated newly published listing (769). Fresh registration and profile completion via real development OTP (API-level).
- **Still limited:** Request **753** was not mutated; Super Admin assignment on **753** was not re-clicked in the Dashboard UI after the fix (same API contract as verified on **763**). Messaging/Socket.IO on the new assignment was not re-run (prior Management/Partnership E2E remains the communication evidence). Website navbar after registration was not browser-checked. Listing **499** and UAT farm **552** sale draft state were preserved aside from intentional **769** approve/publish for proposal testing.

---

## Priority 0 — Super Admin assignment 403

### Root cause

`PUT /api/v1/staff/requests/:id/assignments` is decorated with `@StaffRoles(StaffRole.admin)`. `StaffGuard` required an exact role match (`staff.roles.includes(role)`), so members with only **`superAdmin`** (no parallel `admin` membership) received **403** with body `message: "You do not have access to this resource"` and `code: FORBIDDEN`. That text is produced by `forbidden()` in `api/src/modules/authorization/authorization.errors.ts` and surfaced by the Dashboard server action via `apiMutateAdmin` (not the Dashboard `requireAdminActionSession` copy, which says `Unauthorized`).

The assignment **service** already allowed super admins via `staffHasAdminScope`; the guard rejected the request before the handler ran. This explains why demo flows using an **`admin`** staff account (e.g. reviewer fixture **1112** with `admin` role) could assign while the live Super Admin session could not.

| Item | Value |
|------|--------|
| HTTP method | `PUT` |
| Path | `/api/v1/staff/requests/{requestId}/assignments` |
| Dashboard action | `assignRequestStaffAction` → same path |
| Body | `{ assignmentType: "reviewer" \| "caseAgent", assignedStaffId: "<staffUserId>" }` |
| Failing identity | `superAdmin` only (e.g. users **953**, **954**) |
| Request **753** | `approved` / `private` / `publishedAt` null — unchanged this run |
| Request **762** (comparison) | Prior demo; case agent **1113**, communication case **25** — unchanged |

### Fix (backend only)

- `staffSatisfiesDeclaredRole()` in `api/src/modules/authorization/staff-permissions.ts`: `superAdmin` satisfies `@StaffRoles(StaffRole.admin)`.
- `StaffGuard` uses that helper instead of raw `includes`.

Dashboard/BFF mapping was correct; no Dashboard code change.

### Verification

| Check | Result |
|-------|--------|
| Super Admin JWT (`superAdmin` role) → `PUT …/staff/requests/763/assignments` (case agent **1113**) | **LIVE VERIFIED** — HTTP **200**, assignment persisted |
| Request **753** data | **ISOLATED DB VERIFIED** — still `approved` / `private`; not used for assignment write |
| Reviewer-only staff → assignment | **MOCKED ONLY** (existing `staff.guard.spec` / `requests.e2e-spec` behaviour) |
| Super Admin on **753** in Dashboard UI | **NOT TESTED** (no live browser session); manual: reload farm-management **753**, assign case agent **1113** |
| Communication + Socket.IO after new assignment | **NOT TESTED** this run; **LIVE VERIFIED** (prior) on **762** / case **25** |

**Manual check for demo:** As Super Admin on `http://localhost:3002/en/admin/farm-management/753`, assign **Case Agent** → **1113**. Expect success and owner messaging eligibility per existing rules (no change to **753** publication state).

---

## Priority 1 — Purchase proposal and co-purchase

Isolated path: UAT sale listing request **769** (farm **552**, owner **1114**) — not public listing **499**.

| Step | Result |
|------|--------|
| Staff approve listing **769** | **LIVE VERIFIED** — `POST /staff/listing-requests/769/decision` **200** |
| Staff publish **769** | **LIVE VERIFIED** — `POST /staff/listing-requests/769/publish` **200**, slug `sale-91bde1e9662e96c626950fc351f33a17` |
| Cash proposal (buyer **1111**) | **LIVE VERIFIED** — `POST /marketplace/farms/{slug}/purchase-proposals` **201**, proposal request **775** |
| Co-purchase proposal (buyer **1110**) | **LIVE VERIFIED** — same endpoint, `proposalKind: coPurchase` **201** |
| Staff inbox review of proposals | **NOT TESTED** (no staff UI pass; API list endpoints exist) |
| Case-agent assignment on proposal requests | **NOT TESTED** |
| Website tracking UI | **NOT TESTED** (API persistence only) |

Note: First automated cash attempt used invalid `proposalKind: standardCash` (**400**); correct kind is **`cash`**.

Listing **499** was not read or mutated.

---

## Priority 2 — Fresh registration

Synthetic mobiles only (development OTP, no bypass).

| Step | Result |
|------|--------|
| `POST /auth/otp/request` | **LIVE VERIFIED** |
| `POST /auth/otp/verify` (new account) | **LIVE VERIFIED** — e.g. user **1117**, `isNewUser: true` |
| `POST /auth/profile/complete` | **LIVE VERIFIED** — `profileCompleted: true` |
| `POST /auth/refresh` | **LIVE VERIFIED** **200** |
| `POST /auth/logout` | **LIVE VERIFIED** **204** |
| Second OTP login after cooldown | **LIVE VERIFIED** **200**, `GET /auth/me` **200**, profile still complete |
| Website navbar / session UI | **NOT TESTED** |

Partial attempts on **01055990088** hit invalid OTP when codes were reused too quickly; not counted as product defects.

---

## Test identities and fixtures (no credentials)

| Ref | Role |
|-----|------|
| **953** / **954** | `superAdmin` (dashboard email login) |
| **1112** | `admin` (client-demo reviewer email fixture) |
| **1113** | `caseAgent` (demo agent; buyer OTP user) |
| **1110**, **1111** | Approved website users (co-purchase / cash buyers) |
| **1114** | Owner farm **552** / listing **769** |
| **1117** | `[DEMO] Blockers UAT Registrant` (synthetic registration) |
| **753** | Management request — read-only this run |
| **762–765** | Prior Management/Partnership demo — preserved |
| **769** | Approved + **published** for proposal isolation |
| **775** | Cash purchase proposal child of **769** |
| **499** | Public reference listing — untouched |

---

## Files changed

| File | Change |
|------|--------|
| `api/src/modules/authorization/staff-permissions.ts` | `staffSatisfiesDeclaredRole` |
| `api/src/modules/authorization/staff.guard.ts` | Use helper for `@StaffRoles` |
| `api/src/modules/authorization/staff-permissions.spec.ts` | Unit tests |
| `api/src/modules/authorization/staff.guard.spec.ts` | Super Admin admits admin-only routes |

No Dashboard, Website, or schema changes.

---

## Focused tests

```text
npm test -- staff.guard.spec staff-permissions.spec   (api) — 18 passed
```

---

## Remaining blockers

1. **Dashboard UI** confirmation on **753** for the logged-in Super Admin (expected fixed after API reload).
2. **Owner FarmExit messages** for **753** depend on case-agent assignment + existing communication lifecycle (verify after assign).
3. **Purchase/co-purchase** staff review and Website tracking pages not browser-verified.
4. **Registration** navbar/logout UX not re-run in Chromium.
5. Management/Partnership **public marketplace** publication remains **BLOCKED BY EXISTING API** (unchanged; see prior reports).

---

## Evidence labels summary

| Area | Label |
|------|--------|
| Super Admin assignment API fix | **LIVE VERIFIED** (request **763**) |
| Super Admin on **753** UI | **NOT TESTED** |
| Assignment service rules | **ISOLATED DB VERIFIED** + unit tests |
| Purchase + co-purchase submit | **LIVE VERIFIED** (listing **769**) |
| Fresh registration API | **LIVE VERIFIED** |
| Socket.IO messaging | **LIVE VERIFIED** (prior E2E only) |
