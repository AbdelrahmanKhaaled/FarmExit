# FarmExit Dashboard V2 — Implementation Report

## Reference inspection

- **URL:** [Paces CRM Luxe](https://themes.coderthemes.com/paces/bootstrap/dashboard-crm.html?luxe) (`?luxe` preset)
- **Visual basis:** Paces Luxe layout (light sidenav, dark topbar, dense KPI row, chart + donut, primary table, footer widgets) adapted to FarmExit green/gold.
- **Screenshots:** User-provided reference captures used for density and hierarchy; no proprietary assets copied.

## New application

| Item | Value |
|------|--------|
| Path | `dashboard-v2/` |
| Package | `farmexit-dashboard-v2` |
| Dev port | **3003** |
| API | Same BFF as V1 (`FARMEXIT_API_URL` → `http://127.0.0.1:4001/api/v1`) |

### Run V2

```bash
cd dashboard-v2
npm install
cp .env.example .env   # or copy from dashboard/.env
npm run dev              # http://localhost:3003
```

V1 remains on **3002**; `dashboard/` is **unchanged**.

## Application structure

```
dashboard-v2/src/
  app/                    # Next.js routes (parity with V1 admin console)
  api/admin/              # Staff auth BFF (login/logout/refresh, realtime ticket)
  components/
    layout/               # AppShell entry (V2 presentation shell)
    ui/                   # New UI primitive layer (not imported from dashboard/)
    dashboard/            # Overview widgets (StatCard, DonutDistribution)
    icons.tsx
    brand/
  features/admin/         # Business logic, workflows, actions (from V1 reference)
  lib/                    # auth, API, permissions (same contracts as V1)
  config/                 # admin-navigation
  styles/                 # tokens.css, layout.css, components.css (V2-only paths)
  i18n/ + messages/       # EN/AR
```

## Design system (V2)

- **Tokens:** `src/styles/tokens.css` — FarmExit greens, Luxe light nav + deep green topbar.
- **Layout/shell:** `src/styles/layout.css` — `.luxe-shell`, sidenav, topbar, cards, stat cards.
- **Components:** `src/styles/components.css` — forms, tables, communications.
- **Primitives:** `src/components/ui/*` — rebuilt module tree (no `@/design-system` in V2).

## V1 → V2 parity

| Area | V2 status |
|------|-----------|
| Staff login / session / RBAC | Same API routes & `lib/admin` |
| All `(console)` list routes | Ported (server pages + V2 UI imports) |
| Detail routes (requests, farms, listings, …) | Ported |
| Workflows (publish, assignments, forwarding, co-purchase, evaluations) | `features/admin` actions/panels retained |
| Communications + Socket.IO | `CommunicationCaseWorkspace` + realtime ticket route |
| Analytics | Page + date filters |
| Overview CRM layout | KPIs, charts, donut, recent requests table, queue/alerts |
| EN/AR | `next-intl` + `messages/en|ar/admin.json` |

## API integrations

Unchanged Nest contracts via V1-equivalent paths, e.g.:

- `/staff/admin/dashboard/overview`, `/staff/admin/work-queue`
- `/staff/requests`, `/staff/communication/cases`, etc.

## RBAC

`filterAdminNavigation`, `requireConsolePage`, `staff-permissions` — same as V1.

## Verification

After `npm install` in `dashboard-v2/`:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

(Manual: login, EN/AR toggle, overview, requests list, communications detail on **3003**.)

## Screenshot comparison

Not automated in CI. Compare side-by-side: reference Luxe CRM vs `http://localhost:3003/en/admin`.

## Unfinished / follow-up

- Optional: dedicated Playwright suite for V2 on port 3003.
- Optional: further visual divergence from V1 by restyling `components/ui/*` without touching V1.
- Root `package.json` script `dev:dashboard-v2` not added (avoid scope creep); use commands above.

## Strict compliance

- `dashboard/` not modified.
- `api/`, `web/`, DB — not modified.
- No commit/push.
