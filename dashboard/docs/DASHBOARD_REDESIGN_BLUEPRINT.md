# FarmExit Admin Dashboard — Redesign Blueprint (Stage 1)

**Date:** 2026-10-21  
**Mode:** Planning only — no UI implementation in this stage.  
**Constraint:** Preserve functional architecture (`AdminShell`, server actions, API paths, i18n, RTL).  
**Visual reference:** No approved dashboard Figma pack in repo; pixel-perfect compliance is **pending** external design assets. This blueprint aligns admin UI with **public website brand tokens** and enterprise SaaS patterns.

---

## 1. Current state diagnosis

### 1.1 Structure (keep)

| Layer | Location | Notes |
|-------|----------|-------|
| App shell | `features/admin/AdminShell.tsx` | Sidebar + header + main |
| Navigation config | `config/admin-navigation.ts` | Grouped routes; settings disabled |
| Data loading | RSC pages under `app/[locale]/admin/(console)/**` | `apiFetchAdmin` / `apiFetchAdminResult` |
| Mutations | `features/admin/actions/*` | Server actions → API |
| Design primitives | `src/design-system/**` | Button, Card, DataTable, KpiStrip, ChartShell, states |
| Tokens | `src/styles/admin-tokens.css` | ORE-inspired light theme; greens `#166534`, gold `#d4a72c` |

### 1.2 Visual gaps (why redesign is requested)

- **Sidebar:** Every nav item uses the same `IconOverview` icon — weak wayfinding (`AdminSidebar.tsx`).
- **Inconsistent density:** Mix of design-system components and raw bordered `<input>` filters on list pages (communications, evaluations, audit).
- **Action panels:** Review forms repeat similar markup (`ListingActions`, `RequestActions`, workflow panels) with minimal hierarchy between primary/secondary/danger actions.
- **Typography:** Admin scale is smaller than website marketing type; acceptable for data UI but needs clearer **page title / section / meta** tiers.
- **Charts:** `OverviewCharts`, `TimeSeriesChart`, `DistributionBars` functional but visually basic — need unified chart chrome (`ChartShell` underused).
- **RTL:** Layout uses logical properties in places (`border-e`, `inset-inline-start`); full Arabic pass not verified visually.
- **Premium bar:** Current aesthetic is clean light SaaS but reads as **generic admin template**, not a distinct FarmExit operations product.

### 1.3 Reusable assets (extend, do not replace)

| Component | Path | Redesign use |
|-----------|------|----------------|
| `PageContainer`, `PageHeader`, `WorkspacePageHeader` | `design-system` | Standardize all list/detail pages |
| `DataTable`, `Th`, `Td` | `design-system/workspace/DataTable.tsx` | Primary table system |
| `KpiStrip`, `StatCard`, `MetricCard` | design-system | Overview + analytics |
| `FilterBar` | design-system | Replace ad-hoc filter rows |
| `StatusBadge` | `features/admin/workspace/StatusBadge.tsx` | Workflow statuses — extend variants |
| `EmptyState`, `LoadingState`, `ErrorState` | design-system | Mandatory on every data view |
| `Button`, `Badge`, `Input` | design-system | Form consistency |
| `Logo` | `@/components/brand/Logo` | Shared with website |
| `DecideWorkflowForm`, `StaffAssignmentForm` | `features/admin/workspace` | Approval workflow pattern |

---

## 2. Visual direction

**One-line:** *Calm agricultural enterprise — deep green authority, warm neutral surfaces, gold only for emphasis (badges, alerts), data-first layouts.*

Principles:

1. **No glassmorphism, neon gradients, or decorative animation.**
2. **Whitespace and alignment** over card clutter; one primary action per panel.
3. **Status is color + label**, never color alone (WCAG).
4. **Tables are the hero** on list pages; detail pages use **two-column workspace** (content + sticky actions).
5. **Bilingual parity:** EN LTR and AR RTL with mirrored sidebar and table toolbars.

Mood board (token-level, not new colors):

- Align `--admin-brand-primary` with website `--color-brand-primary` (`fx-green-700` family).
- Canvas: warm off-white `#f6f8f4` (keep).
- Sidebar: optional **subtle green wash** (`#f3f6f1`) vs pure white — test contrast for “premium” without dark sidebar cliché.

---

## 3. Color & typography system

### 3.1 Color (evolve `admin-tokens.css`)

| Role | Current | Proposed |
|------|---------|----------|
| Primary actions | `--admin-brand-primary` | Map to website green scale; add `--admin-brand-primary-hover` |
| Accent / KPI highlight | Gold | Restrict to badges, “FarmExit” marks, warning highlights |
| Surfaces | White cards on canvas | Add `--admin-surface-sunken` for table headers |
| Borders | Hairline green-gray | Keep; add `--admin-border-focus` tied to focus ring |
| Status | Warning/danger/success bg | Document semantic pairs for workflow badges |

### 3.2 Typography

| Level | Use | Suggested |
|-------|-----|-----------|
| Page title | H1 on every route | `--admin-text-2xl` / semibold |
| Section | Card headers, table titles | `--admin-text-lg` |
| Body | Table cells, descriptions | `--admin-text-base` |
| Meta | Timestamps, hints | `--admin-text-sm` + muted |
| KPI value | Overview/analytics | `--admin-text-3xl` tabular-nums |

**Font:** Match website body font stack in `dashboard` layout (inspect `layout.tsx`); if different, unify in redesign phase 3.

---

## 4. Sidebar & navigation

1. **Icon set:** One distinct icon per `adminNavigation` item (requests, farms, listings, communications, etc.) — extend `design-system/icons.tsx`.
2. **Groups:** Keep five groups; add subtle group dividers; collapse shows icon-only with tooltips.
3. **Active state:** Keep start border accent; add **font-semibold** on active label only.
4. **Role badge:** Show staff role under name (already partially present); gold `ADMIN` badge for superAdmin/admin only.
5. **Future:** When case-agent shell exists, split nav config (`adminNavigation` vs `agentNavigation`) — do not hack disabled flags.

---

## 5. Header & page layout

**Header (`AdminHeader`):**

- Breadcrumb: `Overview → Listings → #12345` (generate from route + entity number).
- Global actions: locale switcher, refresh (where applicable), staff menu.
- Height: keep `--admin-topbar-height`; increase touch targets on mobile.

**Page layout template:**

```
[ PageHeader: title + description + primary action ]
[ FilterBar: search | status | date | assignee ]
[ KpiStrip optional on hub pages ]
[ DataTable | split detail ]
[ Pagination ]
```

**Detail template:**

```
[ Back link | Entity title | StatusBadge ]
[ 2-col: 65% facts + timeline | 35% sticky ActionPanel ]
[ Tabs: Documents | Messages link | Audit snippet ]
```

---

## 6. KPI & analytics cards

- **Overview (`AdminOverview`):** Use `MetricCard` grid 4-up desktop, 2-up tablet, 1-up mobile; single chart row with `ChartShell` title + period label.
- **Analytics page:** Date filters in `FilterBar`; KPI row; timeseries full width; distributions two-column below.
- **No fabricated metrics** — all numbers from `/staff/admin/dashboard/overview` and `/staff/admin/analytics`.

---

## 7. Data table system

Standardize on `DataTable`:

- Sticky header on long lists.
- Row hover; clickable row → detail route.
- Column types: `text`, `status` (badge), `date` (locale formatted), `id` (monospace subtle).
- Empty: `EmptyState` with CTA (e.g. clear filters).
- Loading: skeleton rows via `LoadingState`.
- Pagination: unify `TablePaginationLinks` styling with design-system.

---

## 8. Filters, tabs & search

- Replace raw inputs on communications, evaluations, audit, farms with **`FilterBar`** + `Input` / select components.
- **Enums:** Status filters use allowed backend values (from shared status vocabulary or OpenAPI), not free text where API expects enum.
- **Tabs:** Partnerships page (requests vs applications) — extract `TabList` component for reuse on proposals/co-purchase if needed.

---

## 9. Forms, drawers & modals

- **Review decisions:** Extract `ReviewDecisionForm` (decision select + required comment when changes/reject + submit) shared by listing, request hub, specialized panels.
- **Staff assignment:** Keep `StaffAssignmentForm`; add success toast pattern (inline alert region, not `alert()`).
- **Relay / message composer:** Communications workspace — fixed footer composer, clear “relay to” selector; no modal unless mobile.
- **Drawers (optional P2):** Quick preview of request from queue without full navigation — only if ops request it.

---

## 10. Request review & approval workflows

| Workflow | Page | Panel component | Redesign focus |
|----------|------|-----------------|----------------|
| Listing review | `/admin/listings/[id]` | `ListingActions` | Decision panel prominence; publish separated as primary green |
| Unified request | `/admin/requests/[id]` | `RequestActions` + forwarding | Forwarding decision UI when API wired |
| Farm details | `/admin/farm-details/[id]` | `SpecializedWorkflowPanel` | Timeline of reviews |
| Management | `/admin/farm-management/[id]` | same | |
| Verification | `/admin/verification/[id]` | same | Document table styling |
| Partnership | `/admin/partnerships/[id]` | same | |
| Application | `/admin/partnerships/applications/[id]` | same | |
| Proposals | `/admin/proposals/[id]` | `ProposalActionsPanel` | Clear non-binding disclaimer styling |
| Communications | `/admin/communications/[id]` | `CommunicationCaseWorkspace` | Thread + relay layout parity with website |

---

## 11. Responsive behavior

| Breakpoint | Behavior |
|------------|----------|
| `< md` | Sidebar drawer; tables horizontal scroll with shadow hint; action panels stack below content |
| `md–lg` | Sidebar collapsible; two-column detail optional |
| `lg+` | Full sidebar; sticky action column |

Touch: min 44px tap targets on primary buttons.

---

## 12. Arabic RTL approach

1. Use `next-intl` + existing `[locale]` routing; **no duplicate routes**.
2. Prefer logical CSS (`ms-`, `me-`, `ps-`, `border-s/e`) — audit remaining physical `left/right` in admin features during redesign.
3. Mirror sidebar to inline-end; chart axes may stay LTR for numbers (document exception).
4. Translation keys: expand `admin.*` namespaces for new labels; avoid concatenated English enum strings in UI.

---

## 13. Page redesign order (recommended)

| Order | Page(s) | Rationale |
|-------|---------|-----------|
| 1 | **Shell** — `AdminShell`, `AdminSidebar`, `AdminHeader`, tokens | Foundation |
| 2 | **Login** | First impression |
| 3 | **Overview** `/admin` | KPI + queue + charts |
| 4 | **Requests hub** `/admin/requests`, `[id]` | Highest daily traffic |
| 5 | **Listings** + **listing-pipeline** | Publication critical path |
| 6 | **Communications** `[id]` | Realtime + relay UX |
| 7 | **Farm details / management / verification / partnerships** detail pages | Shared workflow template |
| 8 | **Proposals** + **co-purchase** | Financial sensitivity — clear disclaimers |
| 9 | **Farms** + **evaluations** | Directory + score editing |
| 10 | **Users** + **administrators** | PII care |
| 11 | **Analytics** | Charts polish |
| 12 | **Audit logs** | Read-only table |

---

## 14. Refactoring opportunities (non-functional)

| Area | Action |
|------|--------|
| Duplicate action forms | `ReviewDecisionForm`, `ActionPanel` wrapper |
| List page filters | Single `AdminListPage` layout component |
| Icons | Nav icon map in `admin-navigation.ts` |
| Status colors | Central map in `StatusBadge` from `web/src/lib/domain/status.ts` vocabulary |
| Success/error feedback | `useActionFeedback` hook for transitions |

---

## 15. Out of scope (this redesign)

- New backend endpoints or business rules.
- Website public UI changes.
- Case-agent console (until product approves — see `CROSS_APP_INTEGRATION_GAP_MAP.md` DASH-001).
- Pixel-perfect Figma until dashboard frames are supplied.

---

## 16. Visual comparison status

**Pending:** No current dashboard screenshot archive in repo. Before implementation sprint 1, capture baseline screenshots at 1440 / 1024 / 390 for `/admin`, `/admin/requests`, `/admin/listings/[id]`, `/admin/communications/[id]` (EN + AR).

---

*End of dashboard redesign blueprint.*
