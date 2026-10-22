# FarmExit Admin Dashboard — Runtime & UI Recovery Report

**Date:** 2026-10-22  
**Trigger:** Super Admin live screenshots on `localhost:3002` (user-provided) showing `FORMATTING_ERROR`, raw `admin.*.pagination.*` keys, and raw enum strings.

---

## 1. Executive summary

Recovered **critical runtime i18n** across all paginated list routes by centralizing pagination in an async `TablePaginationLinks` that calls `getTranslations('admin.pagination')` with proper ICU variables (`from`, `to`, `total`, `page`, `pages`).

Added shared **`admin.enums`** messages and **`EnumLabel` / `StatusBadge`** client components so statuses, request types, listing types, professional types, admin roles, and account statuses render as localized labels instead of technical strings.

Applied targeted UI polish: table shell, pagination bar, filter bar utilities, analytics distribution labels, taller time-series charts.

**Evidence:** User screenshots = **LIVE (before)**. Post-fix pages = **CODE VERIFIED** (typecheck, lint, unit tests, build pass). Re-load farms, listing-pipeline, and requests in your session to confirm overlay cleared.

**Verdict:** **COMPLETE — CODE VERIFIED, LIVE QA PENDING** (refresh browser after pull).

---

## 2. Root cause — `FORMATTING_ERROR`

Pages called `t('pagination.showing')` **without** `{ from, to, total }`. next-intl validates ICU at call time and throws `FORMATTING_ERROR` for strings like `Showing {from}–{to} of {total}`.

`TablePaginationLinks` then received an error/fallback and manual `.replace()` never ran on a valid pattern.

---

## 3. Root cause — raw translation keys in UI

When `t('pagination.showing')` fails or returns the unresolved key path, the footer showed strings such as `admin.farms.pagination.showing`. Same pattern on all list modules using per-page `labels={{ showing: t(...) }}`.

---

## 4. i18n fix applied

| Item | Change |
|------|--------|
| `admin.pagination` | Shared namespace (EN/AR) with `showing`, `showingEmpty`, `prev`, `next`, `page` |
| `TablePaginationLinks` | Async server component; interpolates inside component via `t('showing', { from, to, total })` |
| All list pages | Removed `labels` prop (15 routes) |
| `pagination-range.ts` | Clamps invalid pages, empty totals |

---

## 5. Enum / status formatting

| Component | Role |
|-----------|------|
| `admin.enums.*` | status, requestType, professionalType, listingType, adminRole, accountStatus, caseStatus, proposalKind |
| `EnumLabel` | Client; `t.has` + fallback humanize |
| `StatusBadge` | Semantic colors + localized label (no ALL_CAPS raw enum) |
| Analytics page | Distribution rows use `tEnum` for type/status/proposal kind |

---

## 6. Shared component / UI improvements

- **DataTable:** Softer shadow, inner horizontal scroll.
- **TablePaginationLinks:** Attached footer styling, button-like prev/next.
- **admin-components.css:** `.admin-form-control`, `.admin-filter-bar` (farms filters applied).
- **TimeSeriesChart:** Taller bars (`h-44`), slightly wider gap.
- **Login:** (prior QA pass) RTL split, `panelFooter` i18n, canvas background.

---

## 7. Module notes (from screenshots)

| Module | Runtime | Labels | UI |
|--------|---------|--------|-----|
| Overview | OK | OK | Prior layout; KPI/queue panels unchanged structurally |
| Analytics | OK | Distributions localized | Chart height tweak |
| Farms | **Fixed** | **Fixed** | Filter bar |
| Listings / pipeline | **Fixed** | **Fixed** | Listing type label |
| Requests | **Fixed** | Type filter + column | — |
| Specialized inboxes | **Fixed** | Status badges | — |
| Evaluations | **Fixed** | Status badges | — |
| Communications | **Fixed** | Case status group | — |
| Users / Admins | **Fixed** | Account/admin role labels | — |
| Audit logs | **Fixed** | — | Filters unchanged (pattern available) |

---

## 8. EN / AR

- New keys in `messages/en/admin.json` and `messages/ar/admin.json`.
- `check-messages` passes.

---

## 9. Tests & build

| Command | Result |
|---------|--------|
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test:unit` | Pass (26 tests, incl. `pagination-range`, `status-variants`) |
| `npm run build` | Pass |

---

## 10. Files changed (principal)

- `src/features/admin/workspace/TablePaginationLinks.tsx`
- `src/features/admin/workspace/pagination-range.ts` (+ test)
- `src/features/admin/workspace/EnumLabel.tsx`
- `src/features/admin/workspace/StatusBadge.tsx`
- `src/features/admin/workspace/status-variants.ts` (+ test)
- `messages/en/admin.json`, `messages/ar/admin.json`
- All `(console)/*/page.tsx` list routes using pagination
- `src/app/[locale]/admin/(console)/analytics/page.tsx`
- `src/design-system/workspace/DataTable.tsx`
- `src/styles/admin-components.css`
- `src/features/admin/analytics/TimeSeriesChart.tsx`

---

## 11. Remaining issues

1. **Post-fix LIVE screenshots** — refresh your Super Admin session and confirm overlay gone on `/admin/farms`, `/admin/listing-pipeline`, `/admin/requests`.
2. **Filter bars** — only farms uses `admin-filter-bar`; roll out to requests, audit-logs, communications for visual parity.
3. **Table + pagination wrapper** — pagination is sibling of `DataTable`; optional single-card wrapper per page.
4. **Communications** — still numeric agent IDs (API shape); no fabricated names.
5. **Detail workspaces** — `DetailWorkspace` not extended in this pass.
6. **Arabic RTL** — re-check login split after prior fixes.

---

## 12. Evidence type

| Phase | Type |
|-------|------|
| Defects | **LIVE** (user screenshots) |
| Fixes | **CODE VERIFIED** (automated gate) |
| Post-fix UI | **LIVE QA PENDING** (user refresh) |

---

## 13. Final readiness

**Runtime defects addressed in code.** Dashboard list modules should no longer throw pagination ICU errors or show raw pagination keys. **Please hard-refresh** (`Ctrl+Shift+R`) on affected routes and confirm. Full premium polish across every filter bar and detail page remains incremental.
