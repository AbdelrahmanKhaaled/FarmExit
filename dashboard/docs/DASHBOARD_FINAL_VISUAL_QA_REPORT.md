# FarmExit Admin Dashboard — Final Visual QA Report

**Date:** 2026-10-21  
**Environment:** Local — API `http://127.0.0.1:4001`, Dashboard `http://127.0.0.1:3002` (dev server, HTTP 200)  
**Browser:** Cursor IDE browser (Chromium)

---

## 1. Pages actually opened

| Route | Opened | Authenticated |
|-------|--------|---------------|
| `/en/admin/login` | Yes | N/A (public) |
| `/ar/admin/login` | Yes | N/A (public) |
| `/en/admin` | Redirect → login | No session |
| All other console routes | **Not opened** | **Blocked** — no staff credentials in agent environment |

**Auth blocker:** No `dashboard/.env.local`, no `DASHBOARD_E2E_EMAIL` / `DASHBOARD_E2E_PASSWORD` in shell, and `api/.env` contains no bootstrap email variables. Playwright E2E expects those env vars (see `dashboard/tests/e2e/admin-shell.spec.ts`). Credentials were not invented.

---

## 2. Screenshot paths

Stored under `dashboard/.visual-qa/2026-10-21/` (gitignored via root `.gitignore`).

| File | Route | Locale | Viewport | Notes |
|------|-------|--------|----------|-------|
| `farmexit-en-login-1440.png` | Login | EN | 1440 | Pre-polish baseline |
| `farmexit-ar-login-390.png` | Login | AR | 390 | Pre-polish; mobile gutter issue |
| `postfix-en-login-1440.png` | Login | EN | 1440 | Post-polish |
| `postfix-en-login-1024.png` | Login | EN | 1024 | Post-polish |
| `postfix-en-login-390.png` | Login | EN | 390 | Post-polish |
| `postfix-ar-login-1440.png` | Login | AR | 1440 | Post-polish; RTL layout issues visible |
| `postfix2-ar-login-1440.png` | Login | AR | 1440 | After RTL column order + panel overflow fix |

---

## 3. Viewports and locales tested

| Viewport | EN | AR |
|----------|----|----|
| 1440×900 | Login | Login |
| 1024×900 | Login | — |
| 390×844 | Login (partial) | Login (pre-fix) |

Console modules (overview, tables, communications, etc.): **not tested** — authentication required.

---

## 4. Visual issues discovered (confirmed in browser)

### Login — Arabic desktop (1440)

1. **Hardcoded English footer** on brand panel (`FarmExit · Staff operations`) while UI is Arabic.
2. **RTL split layout:** Form column on the wrong side vs. reading direction; brand panel marketing copy **clipped** at the viewport edge (`overflow-hidden` on brand section).
3. **Password field:** Arabic label “إظهار” (show) **overlapped** placeholder text in the password input.

### Login — mobile (390, AR pre-fix)

4. **Dark gutters** beside the form when the page background was unset (body default vs. canvas token).

### Environmental (not app bugs)

5. **Next.js dev indicator** (“N” / Dev Tools) visible on dev server — absent in production build.
6. **Cursor browser viewport:** Some mobile captures show content not filling the full emulated width (tooling); re-check on real device or Playwright with exact `viewport` + `deviceScaleFactor`.

---

## 5. Issues fixed

| Issue | Fix |
|-------|-----|
| English footer on AR login | `admin.login.panelFooter` in EN/AR; login page uses `t('panelFooter')` |
| Canvas / gutter background | `bg-[var(--admin-bg-canvas)]` + `w-full min-w-0` on `admin-root` and login grid |
| RTL split column order | Brand `lg:order-2` in RTL; form `lg:order-1` in RTL |
| Brand text clipping | `overflow-x-hidden` instead of `overflow-hidden`; `min-w-0` on columns |
| Password show control overlap | Increased `pe-*` on password input; truncated max-width on toggle button |

**Not done (no evidence / no access):** `DetailWorkspace` on other detail routes, communications split-pane, console-wide table/chart polish.

---

## 6. Before / after comparisons

| Area | Before | After |
|------|--------|-------|
| AR brand footer (a11y tree) | `FarmExit · Staff operations` | `فارم إكزيت · عمليات الموظفين` |
| AR desktop layout | Form left, clipped green panel | Column order swapped for RTL; reduced clipping (`postfix2-ar-login-1440.png`) |
| Mobile canvas | Black side gutters (pre-fix capture) | Full-width canvas on login root |

---

## 7. Remaining visual problems

1. **All authenticated console screens** — unverified until staff login is available.
2. **AR login at 1024 / 390** — not re-captured after final RTL fix (recommended).
3. **Login error copy** still references API port **4000** in `admin.login.errors.network` (copy bug; not triggered in this session).
4. **Communications desktop split-pane** — not evaluated; defer until inbox can be opened with `communication.relay` permission.

---

## 8. Accessibility and responsive findings

- Login form: labels associated with inputs; show/hide control has `aria-label`.
- Sign-in disabled until email + password filled (expected).
- RTL: document `dir=rtl` on AR routes; split layout adjusted with logical order utilities.
- Touch targets on login buttons appear adequate at 390; full mobile pass pending authenticated shell (drawer, tables).

---

## 9. Test results (after polish)

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | Pass (22) |
| `npm run build` | Pass |

---

## 10. Manual completion instructions (authenticated QA)

Run from repo root with API + dashboard up:

```powershell
cd "F:\Abdo Khaled projects\Qeema_Node_Projects\FarmExit\dashboard"
$env:DASHBOARD_E2E_EMAIL = "<your-staff-dashboard-email>"
$env:DASHBOARD_E2E_PASSWORD = "<your-password>"
$env:PORT = "3202"
npx playwright test tests/e2e/admin-shell.spec.ts --project=desktop-en
npx playwright test tests/e2e/admin-shell.spec.ts --project=desktop-ar
```

For full route matrix screenshots, sign in manually at `http://localhost:3002/en/admin/login`, then capture (DevTools device mode):

- Overview, Analytics, Requests (+ one detail ID you are assigned to), Listings (+ detail), Communications (+ case), Evaluations (list / new / detail), Farm details detail, Partnership detail, Proposal detail, Co-purchase detail, Users, Audit logs — at **1440**, **1024**, **390**, in **EN and AR**.

Save under `dashboard/.visual-qa/<date>/` and upgrade rows in `DASHBOARD_REDESIGN_ROUTE_MATRIX.md` only where evidence exists.

---

## 11. Final design readiness verdict

| Scope | Status |
|-------|--------|
| **Admin login (EN/AR)** | **VISUALLY VERIFIED** (limited viewports; see §3) |
| **Full operations console** | **BLOCKED** — no authorized staff session |
| **Overall product readiness** | **PARTIALLY VERIFIED** — design system applied in code; **enterprise sign-off requires authenticated live QA** |

**Recommendation:** Provide `DASHBOARD_E2E_EMAIL` / `DASHBOARD_E2E_PASSWORD` (or sign in once in a browser the agent can reuse) and re-run this checklist for console routes before client demo.
