# Case Agent dashboard access verification

Date: 2026-10-22. Code inspection and existing local fixtures; **no staff password reset** and **no live Case Agent login** in this pass.

## Staff login route

- URL: `http://localhost:3002/en/admin/login`
- BFF: `POST /api/admin/auth/login` with dashboard JWT cookie
- **Not** Website OTP (`/auth/otp/*`)

## Required role and credential

| Requirement | Detail |
|-------------|--------|
| Staff membership | Active `staff_memberships` row |
| Case Agent role | `caseAgent` (demo user **1113**, email `client-demo-agent@farmexit.invalid`) |
| Dashboard credential | `admin_credentials` row (email + password hash); created for demo agent in `api/scripts/seed-client-demo.cjs` |
| Console admission | `staffHasSharedConsoleAccess` — all approved staff roles including `caseAgent` (`dashboard/src/app/api/admin/auth/login/route.ts`) |
| Home route | `getStaffHomePath` → `/admin/communications` when `communication.relay` is granted |
| Communications | `StaffPermission.CommunicationRelay`; list/detail under `/admin/communications` |

Super Admin assignment (`PUT /staff/requests/:id/assignments`) is **not** proof of Case Agent login.

## Demo Case Agent 1113 — usable credential?

| Check | Result |
|-------|--------|
| Staff role `caseAgent` | **ISOLATED DB VERIFIED** (prior demo seed / reports) |
| `admin_credentials` row exists | **ISOLATED DB VERIFIED** (seed creates on first user insert) |
| Known password for live login | **NOT AVAILABLE** — password generated at seed time, stored only in memory (`secrets.set('agent', password)`), never logged |
| Password hash reversible | **No** — Argon2 hash only |

**Credential blocker:** Without the original seed-time password or an authorized reset, automated live login for **1113** cannot be performed in this task.

## Assignment and communication prerequisites (verified elsewhere)

1. Super Admin assigns case agent — **LIVE VERIFIED** after guard fix (`docs/CLIENT_DEMO_REMAINING_BLOCKERS_REPORT.md`, request **763**).
2. User opens communication case — **LIVE VERIFIED** (prior UAT / Management fixture **762**, case **25**).
3. Case Agent dashboard login — **NOT TESTED** (credential).
4. Agent sees assigned case in Communications — **NOT TESTED** (depends on step 3).
5. Agent relay reply → user receives — **NOT TESTED** (depends on step 3).

Backend relay and Socket.IO behaviour unchanged; no Dashboard code changes in this UI task.

## Safe manual steps (Super Admin + Case Agent)

### Option A — Re-run local demo seed (only if explicit local apply is acceptable)

From `api/` with local safety flags (see `client-demo-safety.cjs`):

1. Run `seed-client-demo.cjs` with `--apply --confirm-local-development` on a **fresh** demo agent user only if policy allows (may skip if user **1113** already exists — script does not rotate password on existing users).
2. If a **new** demo agent user is created, capture the one-time password from the script’s in-memory output in your secure notes (script does not persist it).

### Option B — Authorized password reset (requires explicit approval)

1. Super Admin uses an approved internal process to set a new `admin_credentials` password for `client-demo-agent@farmexit.invalid` (not done in this task).
2. Case Agent signs in at `http://localhost:3002/en/admin/login`.
3. Open **Communications** → case linked to assigned request (e.g. Management **762** / case **25**).
4. Send relay message; confirm Website user sees it after refresh (existing UAT path).

### Option C — Use admin staff for relay smoke test

User **1112** (`client-demo-reviewer@farmexit.invalid`, role `admin`) has dashboard access; UAT rotated password in memory only. Same credential limitation applies.

## Dashboard UI note

Console layout allows any `staffHasConsoleAccess` role (`dashboard/src/app/[locale]/admin/(console)/layout.tsx`). Case agents are **not** blocked at login; navigation is permission-scoped (`console-routes.ts`). No targeted Dashboard bug was found that would deny a legitimate Case Agent with valid credentials.
