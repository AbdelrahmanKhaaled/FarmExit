# FarmExit Dashboard V2 — delivered visual rebuild

## Intent
This is an **actual source-code redesign**, not a Cursor prompt. The newly styled admin console retains the original functional modules, session handling, request actions, RBAC, and API clients from the supplied ZIP.

## Visible changes
- **Navigation shell** — former light/sidebar + dark/topbar pairing replaced by a **deep forest sidebar** with section groups, higher-contrast active item, branded header, role card and logout. RTL/mobile motion behavior was preserved.
- **Top navigation** — formerly dark, now a clean white compact utility bar with current route, workspace context, locale switching, staff profile and the existing sidebar toggles.
- **Overview** — new green editorial welcome band with abstract CSS-only decor, an operational shortcut, four *recomposed* KPI cards, a new categorical workload bar chart sourced from actual existing API totals, a restyled sale/rent donut, request table and priority queue.
- **Shared page UI** — new tokens, tighter CRM-style spacing, filter bars, tables, forms, shared `KpiStrip`, list/detail cards and status presentation. These styles apply across existing V2 routes without changing mutations.
- **English and Arabic** — translated new workspace labels and titles added in both locale JSON files.

The visual direction is independently implemented using CSS and existing FarmExit assets. **No commercial Paces source code or proprietary images were copied**. This is a custom FarmExit interpretation, not a claim of pixel-perfect reproduction of the inaccessible live Luxe template.

## Edited or added files
- `src/styles/tokens.css`
- `src/styles/layout.css`
- `src/styles/components.css`
- `src/features/admin/AdminSidebar.tsx`
- `src/features/admin/AdminHeader.tsx`
- `src/features/admin/AdminOverview.tsx`
- `src/features/admin/overview/OverviewWorkloadChart.tsx` (new)
- `src/components/dashboard/StatCard.tsx`
- `src/components/ui/workspace/KpiStrip.tsx`
- `messages/en/admin.json`
- `messages/ar/admin.json`

## Verification performed
- TSX syntactic transpilation on newly changed components: **PASS**.
- `scripts/check-direction.mjs`: **PASS**.
- `scripts/check-sidebar-motion.mjs`: **PASS**.
- `scripts/check-messages.mjs`: **PASS**.
- `scripts/check-session-readonly.mjs`: **PASS**.
- CSS parse with tinycss2: **PASS**.
- Full Next.js production build and live authenticated browser screenshots: **NOT EXECUTED**. This sandbox lacks cached npm packages and outbound package download; `npm ci --offline` failed with `ENOTCACHED` for `zod-validation-error`.

## Run locally
```bash
cd dashboard-v2
npm ci
npm run dev
```
Then open `http://localhost:3003/en/admin/login` or `/ar/admin/login`. Keep the old `dashboard/` on 3002 and FarmExit API on 4001. The `.env.example` remains intact, and real staff credentials are still required.

Before deployment, execute `npm run typecheck`, `npm run lint`, `npm run test:unit`, and `npm run build` in a fully installed environment. Perform a visual and functional check of Farms, Requests, Communications, management and partnership publication, login, and Arabic RTL.
