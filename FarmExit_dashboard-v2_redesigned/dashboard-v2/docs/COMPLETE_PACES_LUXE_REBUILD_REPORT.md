# FarmExit Admin — Complete Paces Luxe Rebuild Report

## 1. Reference inspected

- **URL:** [Paces CRM Dashboard — Luxe (`?luxe`)](https://themes.coderthemes.com/paces/bootstrap/dashboard-crm.html?luxe)
- **Luxe variant:** Confirmed via `?luxe` query (theme preset in page customizer). Structural reference taken from live page markup and **user-provided screenshots** (CRM overview, Analytics, Chat, Proposals, tables, icons).
- **Not copied:** No template assets, JS, or proprietary CSS. Layout and density were reimplemented in FarmExit React/Next.js.

## 2. Structural mapping (Paces → FarmExit)

| Paces Luxe | FarmExit implementation |
|------------|-------------------------|
| Light sidenav + profile card | `AdminSidebar` + `luxe-sidenav__profile` |
| Dark utility topbar | `AdminHeader` + `luxe-topbar` (FarmExit deep green `#0B3824`) |
| 4 KPI stat cards | `StatCard` × 4 on overview (farms, listings, requests, communications) |
| Overview chart + side donut | `OverviewCharts` (stack) + `DonutDistribution` (sale/rent) |
| Primary CRM table | `OverviewRequestsTable` (live `/staff/requests`) |
| Lower operational widgets | `OverviewQueue` + `OverviewAlerts` |
| List page toolbars + dense tables | `AdminListPageHeader`, `FilterBar`, `PaginatedTableShell` → `luxe-card` |
| Chat split layout | Existing `CommunicationCaseWorkspace` + `admin-comm-workspace` (prior pass) |

## 3. Legacy presentation replaced

| Area | Change |
|------|--------|
| Tokens | `admin-tokens.css` — Luxe light nav + dark topbar, FarmExit greens/gold |
| Shell CSS | New `admin-luxe.css` (cards, stat cards, nav, topbar, toolbars) |
| `AdminShell` | `luxe-shell` layout |
| `AdminSidebar` | Rebuilt: light nav, profile block, `luxe-nav-link` active bar |
| `AdminHeader` | Rebuilt: dark topbar, breadcrumbs, `LuxeUserMenu` dropdown |
| `AdminOverview` | Full CRM grid (KPI → charts/donut → requests table → queue/alerts) |
| List/detail headers | `luxe-page-head` pattern |
| Tables/filters | `luxe-card` chrome on shells |

## 4. New component architecture

```
dashboard/src/design-system/luxe/
  StatCard.tsx
  LuxeCard.tsx
  DonutDistribution.tsx
dashboard/src/features/admin/shell/
  LuxeUserMenu.tsx
dashboard/src/features/admin/overview/
  OverviewRequestsTable.tsx
```

Existing design-system primitives (`DataTable`, `ChartShell`, `StatusBadge`, etc.) remain the functional layer; Luxe classes provide the visual system.

## 5. Design tokens (summary)

- Primary `#126B3A`, deep `#0B3824`, gold `#D4A83F`
- Canvas `#eef0eb`, white cards, subtle borders
- Sidebar: white surface; topbar: deep green
- Compact radius (0.5–0.75rem), card shadow `admin-shadow-card`

## 6. Overview implementation

- Real data: overview + work-queue APIs (unchanged contracts)
- Recent requests: `GET /staff/requests?page=1&pageSize=8`
- No fake trend percentages or demo KPI deltas

## 7. Routes updated (via shared shell + list chrome)

All `(console)` routes inherit the new shell. List/index pages use updated headers, filters, and table shells. Analytics and overview use Luxe cards/charts.

**Detail workspaces** (request review panels, partnership application, evaluation forms) still use section components (`AdminDetailSection`, `DetailWorkspace`) with new headers and global tokens; full per-section Luxe refactor can continue incrementally.

## 8. Routes not fully bespoke-redesigned

- Highly custom workflow panels on some detail pages (multi-step review UIs) — functionally intact, global Luxe shell/tokens applied.

## 9. EN / AR

- Messages added for overview table/distribution (`messages/en/admin.json`, `messages/ar/admin.json`)
- RTL: sidebar `inset-inline-start`, nav active bar mirrors in `[dir=rtl]`
- Language toggle unchanged on topbar

## 10. Responsive

- Shell: mobile drawer sidebar (existing motion guards preserved)
- KPI grid: 1 → 2 → 4 columns
- Overview: chart column stacks below donut on narrow viewports
- Tables: horizontal scroll via `min-w` on tables

## 11. Visual comparison / screenshots

- **Reference:** User screenshots + [Paces Luxe URL](https://themes.coderthemes.com/paces/bootstrap/dashboard-crm.html?luxe)
- **FarmExit:** Not captured in CI this run (no Playwright screenshot job executed). **Manual:** open `http://localhost:3002/en/admin` beside reference after `npm run dev:dashboard`.
- Browser automation was not used for pixel diff per workspace policy; comparison should be done locally.

## 12. Functional regression

- RBAC navigation filtering unchanged (`filterAdminNavigation`)
- APIs, actions, Socket.IO communications unchanged
- Recommended manual: login, EN/AR, requests table link, communications thread, logout via user menu

## 13. Build results

| Step | Result |
|------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | Pass (27) |
| `npm run build` | Pass on retry (Next.js security nudge on first attempt) |

## 14. Files changed (main)

- `src/styles/admin-tokens.css`, `admin-luxe.css`, `admin-components.css` (unchanged partial)
- `src/app/[locale]/admin/layout.tsx`
- `src/features/admin/AdminShell.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`, `AdminOverview.tsx`
- `src/features/admin/shell/LuxeUserMenu.tsx`
- `src/features/admin/overview/*` (OverviewCharts, OverviewQueue, OverviewRequestsTable)
- `src/features/admin/workspace/AdminListPageHeader.tsx`, `AdminDetailHeader.tsx`, `PaginatedTableShell.tsx`
- `src/design-system/luxe/*`, `FilterBar.tsx`, `DataTable.tsx`, `ChartShell.tsx`, `PageContainer.tsx`
- `src/app/[locale]/admin/(console)/page.tsx`
- `messages/en/admin.json`, `messages/ar/admin.json`

## 15. Blockers / follow-ups

- Optional: Playwright visual baselines for overview/requests/communications/RTL/mobile
- Optional: Next.js `next upgrade --agent=security` for advisory
- Optional: Luxe-style chat list + thread split on `/admin/communications` (reference Chat page)

## Git

No commit or push (per instructions).
