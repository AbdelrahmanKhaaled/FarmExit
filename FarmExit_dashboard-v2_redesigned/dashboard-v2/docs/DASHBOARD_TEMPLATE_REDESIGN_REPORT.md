# FarmExit Dashboard — CRM Template Redesign Report

**Reference (structure only):** [Paces CRM dashboard (Luxe)](https://themes.coderthemes.com/paces/bootstrap/dashboard-crm.html?luxe)
**Scope:** UI/UX and shared styling in `dashboard/` only. No API, permissions, or route semantics changed.

## Summary

The admin console was aligned with a premium CRM-style layout rhythm: solid top bar, elevated main canvas, unified card headers, stronger table shells, overview hero + KPI row, and a structured communications workspace. FarmExit tokens (green sidebar, gold accents, Manrope / Plex Arabic) are unchanged in intent.

## What was redesigned

### Global shell
- **Main content area** (`admin-main`): consistent padding, subtle radial canvas wash.
- **Top bar**: solid `--admin-topbar-bg`, shadow, mobile page title when breadcrumbs are hidden.
- **Sidebar**: light vertical gradient, refined active nav inset highlight.

### Design tokens & CSS utilities
- New tokens: `--admin-topbar-bg`, `--admin-kpi-icon-bg`, `--admin-shadow-topbar`; tuned canvas and card shadow.
- Utilities: `admin-page-header`, `admin-hero-card`, `admin-segment-pill`, `admin-comm-workspace` grid, table row hover, `admin-form-control.max-w-none`.
- Fixed relay bubble colors to use `--admin-brand-gold` (was invalid `--admin-accent-gold`).

### Shared components
- **New:** `CardHeader`, `CardBody` (`design-system/components/CardChrome.tsx`).
- **Updated:** `ChartShell`, `KpiStrip` / `Panel`, `PageHeader`, `SectionHeader`, `FilterBar`, `DataTable`, `PaginatedTableShell`, list/detail/workspace headers.

### Overview
- Welcome block wrapped in `admin-hero-card`; KPI cards use icon chips and hover elevation.

### List pages (via shared primitives)
All routes using `AdminListPageHeader`, `AdminFilterForm` / `FilterBar`, and `PaginatedTableShell` inherit:
- Unified page header spacing
- Elevated filter bar
- Card-style tables with hover rows and footer pagination chrome

**List routes:** farms, listings, listing-pipeline, requests, proposals, co-purchase, communications, users, administrators, evaluations, verification, farm-details, farm-management, partnerships, audit-logs.

### Detail pages
- `AdminDetailHeader` uses `admin-page-header` for consistency with list and analytics headers.

### Communications
- Case workspace: sidebar panels (status, participants), main thread + compose, full-width relay panel; segment pills; staff bubble contrast; form controls aligned with admin system.

### Analytics
- Chart and panel cards use shared `CardHeader` / `CardBody` (via `ChartShell` and `KpiStrip.Panel`).

## Routes still on legacy / page-local markup

Detail workspaces that use bespoke section markup (request forwarding panels, partnership application review, evaluation forms, etc.) were **not** rewritten page-by-page; they already consume shared badges, `admin-detail-panel`, and action panels where implemented. Further pass could migrate remaining raw borders to `CardHeader` if desired.

**Login / forbidden:** Already on-brand; no structural change this pass.

## Blockers

- None for build or tests.
- **Next.js security advisory:** `next build` warns that Next.js 16.4.0 has a known vulnerability; first build attempt stopped on the nudge; retry succeeded. Consider `next upgrade --agent=security` when appropriate.

## Verification

| Check | Result |
|--------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass (eslint + direction/messages/sidebar-motion/session scripts) |
| `npm run test:unit` | Pass (27 tests) |
| `npm run build` | Pass (after retry) |

### Manual QA (recommended)

- EN + AR: overview, one list (e.g. requests), communications detail, analytics.
- Breakpoints: 1440, 1024, 768, 390 — sidebar mobile overlay, table horizontal scroll, comm grid stacking below 1024px.

## Files changed

```
dashboard/src/styles/admin-tokens.css
dashboard/src/styles/admin-components.css
dashboard/src/design-system/components/CardChrome.tsx (new)
dashboard/src/design-system/components/ChartShell.tsx
dashboard/src/design-system/components/FilterBar.tsx
dashboard/src/design-system/components/PageHeader.tsx
dashboard/src/design-system/components/SectionHeader.tsx
dashboard/src/design-system/index.ts
dashboard/src/design-system/workspace/DataTable.tsx
dashboard/src/design-system/workspace/KpiStrip.tsx
dashboard/src/design-system/workspace/WorkspacePageHeader.tsx
dashboard/src/features/admin/AdminShell.tsx
dashboard/src/features/admin/AdminHeader.tsx
dashboard/src/features/admin/AdminSidebar.tsx
dashboard/src/features/admin/AdminOverview.tsx
dashboard/src/features/admin/communications/CommunicationCaseWorkspace.tsx
dashboard/src/features/admin/workspace/AdminListPageHeader.tsx
dashboard/src/features/admin/workspace/AdminDetailHeader.tsx
dashboard/src/features/admin/workspace/PaginatedTableShell.tsx
dashboard/next-env.d.ts (typegen)
```

## Git

No commit or push performed per task instructions.
