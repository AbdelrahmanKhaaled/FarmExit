# FarmExit canonical Dashboard relocation and GitHub delivery

Date: 2026-10-28 (Africa/Cairo).

## Canonical structure and preservation

- Previous approved app: `FarmExit_dashboard-v2_redesigned/dashboard-v2`.
- New sole maintained app: `dashboard/` (approved V2, not the retired V1).
- Repository apps: `api/`, `web/`, `dashboard/`; documentation: `docs/`.
- Initial branch: main; remote: origin, https://github.com/AbdelrahmanKhaaled/FarmExit.git.
- Initial HEAD: fe05a357b1150031634d6a2df580b3bc811240ed. Prior adoption 4b2e64b and report fe05a35 confirmed in history.
- Initial status: only untracked docs/FARMEXIT_PRODUCTION_BACKEND_DEPLOYMENT_PLAN.md from the preceding authorized review; no tracked, staged, Website, Dashboard or Backend edits.
- Used git mv to preserve rename history. All 265 tracked app files plus the private local environment matched pre-move SHA-256 hashes immediately after relocation. All 222 functional source/assets/translations/package/example/private-environment files remain unchanged after implementation.
- The old wrapper and an empty nested dashboard folder were removed only after verifying they were empty. No second dashboard-v2 application remains. Ignored local QA evidence/caches moved with the application and remain ignored.
- Private .env.local was preserved byte-for-byte. No .env or secrets were staged. No Website source changes were needed; latest committed Website work remains intact.

## Workflow and push safety

Safety commit: a79c33bb43ffaca39c2237bd85d9f9de56b823fd, pushed first to origin/main.

1. GitHub API showed no repository webhooks and only one workflow; no queued/in-progress Actions at inspection time.
2. Disabled seed workflow ID 393263441 through GitHub before the first push and verified state disabled_manually.
3. Replaced the workflow source with only workflow_dispatch and a no-op notice: no automatic push/schedule/event trigger, checkout, install, environment, secrets, seed or deploy command.
4. Replaced root deploy:api with an immediate failure explaining backend NO-GO. It invokes no build, seed or restart. It was reviewed statically, not executed.
5. Existing manually invoked seed scripts remain separate operations requiring authorization; none was run. Backend helper scripts received path fixes only and were syntax-checked, not executed.
6. Subsequent push checks require the remote workflow to remain disabled and main to remain undiverged. No force-push used.

No production deployment, backend rebuild/restart, migration, seed, database write, upload modification, or contact with port 4000 was performed. Remote webhook/workflow inspection does not assert access to private server configuration or all third-party installations.

## Active references changed

- Root package.json dashboard setup/dev/start/build/typecheck/lint/format/test paths and description now use dashboard.
- README and dashboard README document canonical path, email/password staff access, port 3003 and Vercel settings.
- .gitignore QA-artifact/log/result paths now apply under dashboard.
- Current cross-app roadmap and gap-map path references updated; their older status assessments remain dated evidence.
- api/scripts/verify-dashboard-v2-batch2.cjs, verify-farm-publication-filters.cjs and verify-linked-request-applications.cjs now resolve Playwright/messages/artifacts in root dashboard. No backend runtime source or permission change.
- dashboard/scripts/test-enum-coverage.mjs now finds ../api/prisma/schema.prisma from the shallower app directory. Its first post-relocation run exposed the old path; both locale tests pass after this path correction.
- dashboard/tests/e2e/runtime-guards.spec.ts adds listings, users and administrators to the requested EN/AR route coverage.
- The preceding backend deployment plan is now tracked, with a dated relocation/workflow-safety note. Its historical source SHA and old paths remain as evidence. The adoption report and other historical reports retain historical paths.

## Effective environment

```dotenv
FARMEXIT_API_URL=https://farmexit.nodeteam.site/api/v1
NEXT_PUBLIC_FARMEXIT_API_URL=https://farmexit.nodeteam.site/api/v1
NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN=https://farmexit.nodeteam.site
```

Confirmed in dashboard/.env.example, preserved local configuration and API/realtime consumers. Old local API examples remain commented. Website production API settings remain intact. Authentication contracts, cookies, roles, service authorization and privacy rules were not changed.

## Verification from the new directory

| Check | Result |
| --- | --- |
| Dashboard npm ci | Passed; 398 packages installed, zero reported vulnerabilities |
| Dashboard typecheck | Passed |
| Dashboard lint + direction/messages/sidebar/session guards | Passed |
| Dashboard unit tests | 31 passed |
| Dashboard translation enum tests | 2 passed (EN/AR), after relative-path fix |
| Dashboard production build | Passed; 114 pages generated |
| Dashboard browser suite on port 3003 | 125 passed, 9 skipped for credentials/project-locale conditions |
| Supplemental existing read-only fixture browser QA | 72 views; zero failures; EN/AR layouts and interactions |
| EN and AR login HTTP checks on port 3003 | Both 200 |
| Website typecheck | Passed |
| Website lint | Passed with 2 existing unused-variable warnings |
| Website unit tests | 10 passed |
| Website production build | Passed on retry; 144 pages generated |
| Changed helper/script syntax checks | Passed |
| Staged diff whitespace/private/generated-path review | Passed |
| Credential-pattern scan | No matches across 274 staged source/configuration paths |

All nine requested console paths (overview, analytics, farms, listings, listing-pipeline, requests, communications, users, administrators) are checked for unauthenticated access boundaries and correct EN/AR directionality. Existing authenticated production tests require staff credentials and were not converted to fixtures to pass. Fixture evidence is supplemental isolated layout/navigation coverage, not proof of production API or successful live Super Admin access.

Website Next.js 16.4.0 emitted SecurityFatalError/upgrade advice on the initial build; the tool allowed a retry, which completed with the security warning still present. No dependencies were changed in this relocation. A separate reviewed security upgrade is recommended; passing build does not resolve that warning. Existing workspace-root inference warning also remains. Dashboard Next.js is 16.4.1.

The approved local dashboard was restarted only on port 3003 after a successful build. Production Backend was not managed.

## Vercel preparation

| Project | Root Directory | Framework | Install | Build |
| --- | --- | --- | --- | --- |
| Website | web | Next.js | npm ci | npm run build |
| Dashboard | dashboard | Next.js | npm ci | npm run build |

Set the three dashboard API/realtime variables above in intended hosting environments and rebuild for public-variable changes. The connected Vercel account returned no teams and no projects matching farmexit, so no existing Dashboard project root could be inspected. If another account owns it, its root must change from the prior nested path to dashboard. Keep Website root web; do not delete or replace its project. No hosted settings or Vercel deployments were changed or claimed verified.

## Remaining blockers

- Backend remains NO-GO: four required routes were absent at the preceding production check; production SMS/private storage adapters, live process/schema evidence and deployment prerequisites remain separate work. Consult FARMEXIT_PRODUCTION_BACKEND_DEPLOYMENT_PLAN.md. Workflow automation risk is controlled for this delivery, not a backend runtime fix.
- Live authenticated production feature/realtime acceptance still needs existing credentials and approved records/actions.
- Website security upgrade recommendation remains outstanding.
- Hosting root/environment changes remain an owner action; no frontend deployment is claimed.

## Git delivery

Implementation commit: 066c44f7aa8fc15864e743d1fbc8155427f4813e.
Implementation push confirmation: origin/main successfully advanced a79c33b..066c44f; no force-push.
Report delivery: this report will be committed and pushed separately after implementation delivery, with its exact hash provided in the final response and available via git log -1 -- docs/FARMEXIT_CANONICAL_DASHBOARD_GITHUB_REPORT.md.
Post-implementation status: only this final report remained untracked. All other intended files were committed, with no Website source changes. Final remote SHA and clean working-tree verification are performed after pushing the report commit.

## Exact implementation inventory

```text
M	.gitignore
D	FarmExit_dashboard-v2_redesigned/dashboard-v2/README.md
M	README.md
M	api/scripts/verify-dashboard-v2-batch2.cjs
M	api/scripts/verify-farm-publication-filters.cjs
M	api/scripts/verify-linked-request-applications.cjs
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/.env.example	dashboard/.env.example
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/.prettierrc.json	dashboard/.prettierrc.json
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/AGENTS.md	dashboard/AGENTS.md
A	dashboard/README.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/ADMIN_NAV_INFORMATION_ARCHITECTURE_AUDIT.md	dashboard/docs/ADMIN_NAV_INFORMATION_ARCHITECTURE_AUDIT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/COMPLETE_PACES_LUXE_REBUILD_REPORT.md	dashboard/docs/COMPLETE_PACES_LUXE_REBUILD_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_COMPLETE_REDESIGN_REPORT.md	dashboard/docs/DASHBOARD_COMPLETE_REDESIGN_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_DETAIL_WORKSPACES_COMPLETION_REPORT.md	dashboard/docs/DASHBOARD_DETAIL_WORKSPACES_COMPLETION_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_FINAL_MODULE_MATRIX.md	dashboard/docs/DASHBOARD_FINAL_MODULE_MATRIX.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_FINAL_VISUAL_QA_REPORT.md	dashboard/docs/DASHBOARD_FINAL_VISUAL_QA_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_FUNCTIONAL_COMPLETION_REPORT.md	dashboard/docs/DASHBOARD_FUNCTIONAL_COMPLETION_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_PREMIUM_UI_COMPLETION_REPORT.md	dashboard/docs/DASHBOARD_PREMIUM_UI_COMPLETION_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_REDESIGN_BLUEPRINT.md	dashboard/docs/DASHBOARD_REDESIGN_BLUEPRINT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_REDESIGN_ROUTE_MATRIX.md	dashboard/docs/DASHBOARD_REDESIGN_ROUTE_MATRIX.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_REMAINING_BLOCKERS.md	dashboard/docs/DASHBOARD_REMAINING_BLOCKERS.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_RUNTIME_AND_UI_RECOVERY_REPORT.md	dashboard/docs/DASHBOARD_RUNTIME_AND_UI_RECOVERY_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_TEMPLATE_REDESIGN_REPORT.md	dashboard/docs/DASHBOARD_TEMPLATE_REDESIGN_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_V2_BATCH_1_FIXES_REPORT.md	dashboard/docs/DASHBOARD_V2_BATCH_1_FIXES_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_V2_BATCH_2_FIXES_REPORT.md	dashboard/docs/DASHBOARD_V2_BATCH_2_FIXES_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_V2_IMPLEMENTATION_REPORT.md	dashboard/docs/DASHBOARD_V2_IMPLEMENTATION_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASHBOARD_V2_RUNTIME_FIX_REPORT.md	dashboard/docs/DASHBOARD_V2_RUNTIME_FIX_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/DASH_002_FORWARDING_DECISIONS_REPORT.md	dashboard/docs/DASH_002_FORWARDING_DECISIONS_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/FARMEXIT_V2_REDESIGN_HANDOFF.md	dashboard/docs/FARMEXIT_V2_REDESIGN_HANDOFF.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/FARM_STATUS_LISTING_PUBLICATION_FILTERS_REPORT.md	dashboard/docs/FARM_STATUS_LISTING_PUBLICATION_FILTERS_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/LINKED_REQUEST_APPLICATIONS_IMPLEMENTATION_REPORT.md	dashboard/docs/LINKED_REQUEST_APPLICATIONS_IMPLEMENTATION_REPORT.md
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/paces-area-reference.png	dashboard/docs/paces-area-reference.png
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/paces-charts-reference.png	dashboard/docs/paces-charts-reference.png
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/paces-column-reference.png	dashboard/docs/paces-column-reference.png
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/paces-pie-reference.png	dashboard/docs/paces-pie-reference.png
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/eslint.config.mjs	dashboard/eslint.config.mjs
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/messages/ar/admin.json	dashboard/messages/ar/admin.json
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/messages/ar/batch.json	dashboard/messages/ar/batch.json
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/messages/ar/common.json	dashboard/messages/ar/common.json
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/messages/en/admin.json	dashboard/messages/en/admin.json
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/messages/en/batch.json	dashboard/messages/en/batch.json
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/messages/en/common.json	dashboard/messages/en/common.json
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/next-env.d.ts	dashboard/next-env.d.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/next.config.ts	dashboard/next.config.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/package-lock.json	dashboard/package-lock.json
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/package.json	dashboard/package.json
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/playwright.config.ts	dashboard/playwright.config.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/public/brand/logo-full-dark.svg	dashboard/public/brand/logo-full-dark.svg
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/public/brand/logo-full-light.svg	dashboard/public/brand/logo-full-light.svg
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/public/brand/logo-horizontal-dark.svg	dashboard/public/brand/logo-horizontal-dark.svg
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/public/brand/logo-horizontal-light.svg	dashboard/public/brand/logo-horizontal-light.svg
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/public/brand/logo-icon-dark.svg	dashboard/public/brand/logo-icon-dark.svg
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/public/brand/logo-icon-light.svg	dashboard/public/brand/logo-icon-light.svg
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/scripts/batch-one-visual-qa.mjs	dashboard/scripts/batch-one-visual-qa.mjs
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/scripts/check-direction.mjs	dashboard/scripts/check-direction.mjs
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/scripts/check-messages.mjs	dashboard/scripts/check-messages.mjs
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/scripts/check-session-readonly.mjs	dashboard/scripts/check-session-readonly.mjs
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/scripts/check-sidebar-motion.mjs	dashboard/scripts/check-sidebar-motion.mjs
R095	FarmExit_dashboard-v2_redesigned/dashboard-v2/scripts/test-enum-coverage.mjs	dashboard/scripts/test-enum-coverage.mjs
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/administrators/page.tsx	dashboard/src/app/[locale]/admin/(console)/administrators/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/analytics/page.tsx	dashboard/src/app/[locale]/admin/(console)/analytics/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/audit-logs/page.tsx	dashboard/src/app/[locale]/admin/(console)/audit-logs/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/co-purchase/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/co-purchase/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/co-purchase/page.tsx	dashboard/src/app/[locale]/admin/(console)/co-purchase/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/communications/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/communications/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/communications/page.tsx	dashboard/src/app/[locale]/admin/(console)/communications/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/evaluations/[farmId]/[evaluationId]/page.tsx	dashboard/src/app/[locale]/admin/(console)/evaluations/[farmId]/[evaluationId]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/evaluations/new/page.tsx	dashboard/src/app/[locale]/admin/(console)/evaluations/new/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/evaluations/page.tsx	dashboard/src/app/[locale]/admin/(console)/evaluations/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/farm-details/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/farm-details/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/farm-details/page.tsx	dashboard/src/app/[locale]/admin/(console)/farm-details/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/farm-management/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/farm-management/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/farm-management/page.tsx	dashboard/src/app/[locale]/admin/(console)/farm-management/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/farms/[id]/edit/page.tsx	dashboard/src/app/[locale]/admin/(console)/farms/[id]/edit/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/farms/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/farms/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/farms/new/page.tsx	dashboard/src/app/[locale]/admin/(console)/farms/new/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/farms/page.tsx	dashboard/src/app/[locale]/admin/(console)/farms/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/layout.tsx	dashboard/src/app/[locale]/admin/(console)/layout.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/listing-pipeline/page.tsx	dashboard/src/app/[locale]/admin/(console)/listing-pipeline/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/listings/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/listings/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/listings/page.tsx	dashboard/src/app/[locale]/admin/(console)/listings/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/loading.tsx	dashboard/src/app/[locale]/admin/(console)/loading.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/page.tsx	dashboard/src/app/[locale]/admin/(console)/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/partnerships/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/partnerships/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/partnerships/applications/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/partnerships/applications/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/partnerships/page.tsx	dashboard/src/app/[locale]/admin/(console)/partnerships/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/proposals/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/proposals/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/proposals/page.tsx	dashboard/src/app/[locale]/admin/(console)/proposals/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/requests/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/requests/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/requests/page.tsx	dashboard/src/app/[locale]/admin/(console)/requests/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/users/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/users/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/users/page.tsx	dashboard/src/app/[locale]/admin/(console)/users/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/verification/[id]/page.tsx	dashboard/src/app/[locale]/admin/(console)/verification/[id]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/(console)/verification/page.tsx	dashboard/src/app/[locale]/admin/(console)/verification/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/forbidden/page.tsx	dashboard/src/app/[locale]/admin/forbidden/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/layout.tsx	dashboard/src/app/[locale]/admin/layout.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/login/page.tsx	dashboard/src/app/[locale]/admin/login/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/admin/not-found.tsx	dashboard/src/app/[locale]/admin/not-found.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/layout.tsx	dashboard/src/app/[locale]/layout.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/[locale]/page.tsx	dashboard/src/app/[locale]/page.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/api/admin/auth/login/route.ts	dashboard/src/app/api/admin/auth/login/route.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/api/admin/auth/logout/route.ts	dashboard/src/app/api/admin/auth/logout/route.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/api/admin/auth/refresh/route.ts	dashboard/src/app/api/admin/auth/refresh/route.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/api/admin/communication/realtime-ticket/route.ts	dashboard/src/app/api/admin/communication/realtime-ticket/route.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/api/admin/staff/requests/[requestId]/documents/[documentId]/route.ts	dashboard/src/app/api/admin/staff/requests/[requestId]/documents/[documentId]/route.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/fonts.ts	dashboard/src/app/fonts.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/app/globals.css	dashboard/src/app/globals.css
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/brand/Logo.tsx	dashboard/src/components/brand/Logo.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/dashboard/DonutDistribution.tsx	dashboard/src/components/dashboard/DonutDistribution.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/dashboard/LuxeCard.tsx	dashboard/src/components/dashboard/LuxeCard.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/dashboard/StatCard.tsx	dashboard/src/components/dashboard/StatCard.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/icons.tsx	dashboard/src/components/icons.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/layout/AppShell.tsx	dashboard/src/components/layout/AppShell.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/layout/index.ts	dashboard/src/components/layout/index.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/Badge.tsx	dashboard/src/components/ui/Badge.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/Button.tsx	dashboard/src/components/ui/Button.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/Card.tsx	dashboard/src/components/ui/Card.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/CardChrome.tsx	dashboard/src/components/ui/CardChrome.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/ChartShell.tsx	dashboard/src/components/ui/ChartShell.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/EmptyState.tsx	dashboard/src/components/ui/EmptyState.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/ErrorState.tsx	dashboard/src/components/ui/ErrorState.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/FilterBar.tsx	dashboard/src/components/ui/FilterBar.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/Input.tsx	dashboard/src/components/ui/Input.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/LoadingState.tsx	dashboard/src/components/ui/LoadingState.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/MetricCard.tsx	dashboard/src/components/ui/MetricCard.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/PageContainer.tsx	dashboard/src/components/ui/PageContainer.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/PageHeader.tsx	dashboard/src/components/ui/PageHeader.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/SectionHeader.tsx	dashboard/src/components/ui/SectionHeader.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/StatCard.tsx	dashboard/src/components/ui/StatCard.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/Table.tsx	dashboard/src/components/ui/Table.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/index.ts	dashboard/src/components/ui/index.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/workspace/DataTable.tsx	dashboard/src/components/ui/workspace/DataTable.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/workspace/DetailWorkspace.tsx	dashboard/src/components/ui/workspace/DetailWorkspace.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/workspace/KpiStrip.tsx	dashboard/src/components/ui/workspace/KpiStrip.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/components/ui/workspace/WorkspacePageHeader.tsx	dashboard/src/components/ui/workspace/WorkspacePageHeader.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/config/admin-navigation.test.ts	dashboard/src/config/admin-navigation.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/config/admin-navigation.ts	dashboard/src/config/admin-navigation.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/AdminHeader.tsx	dashboard/src/features/admin/AdminHeader.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/AdminLoginForm.tsx	dashboard/src/features/admin/AdminLoginForm.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/AdminOverview.tsx	dashboard/src/features/admin/AdminOverview.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/AdminShell.tsx	dashboard/src/features/admin/AdminShell.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/AdminSidebar.tsx	dashboard/src/features/admin/AdminSidebar.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/RefreshButton.tsx	dashboard/src/features/admin/RefreshButton.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/accounts/CreateAdministratorForm.tsx	dashboard/src/features/admin/accounts/CreateAdministratorForm.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/accounts/UserStatusAction.tsx	dashboard/src/features/admin/accounts/UserStatusAction.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/actions/accounts.ts	dashboard/src/features/admin/actions/accounts.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/actions/co-purchase.ts	dashboard/src/features/admin/actions/co-purchase.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/actions/farms.ts	dashboard/src/features/admin/actions/farms.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/actions/listings.ts	dashboard/src/features/admin/actions/listings.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/actions/platform.ts	dashboard/src/features/admin/actions/platform.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/actions/proposals.ts	dashboard/src/features/admin/actions/proposals.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/actions/requests.ts	dashboard/src/features/admin/actions/requests.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/actions/workflows.ts	dashboard/src/features/admin/actions/workflows.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/analytics/AnalyticsDateFilters.tsx	dashboard/src/features/admin/analytics/AnalyticsDateFilters.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/analytics/AnalyticsWorkspace.tsx	dashboard/src/features/admin/analytics/AnalyticsWorkspace.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/analytics/DistributionBars.tsx	dashboard/src/features/admin/analytics/DistributionBars.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/analytics/TimeSeriesChart.tsx	dashboard/src/features/admin/analytics/TimeSeriesChart.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/analytics/analytics-query.test.ts	dashboard/src/features/admin/analytics/analytics-query.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/analytics/analytics-query.ts	dashboard/src/features/admin/analytics/analytics-query.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/communications/CommunicationCaseWorkspace.tsx	dashboard/src/features/admin/communications/CommunicationCaseWorkspace.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/communications/communications-types.ts	dashboard/src/features/admin/communications/communications-types.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/communications/message-merge.test.ts	dashboard/src/features/admin/communications/message-merge.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/communications/message-merge.ts	dashboard/src/features/admin/communications/message-merge.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/communications/useStaffCommunicationSocket.ts	dashboard/src/features/admin/communications/useStaffCommunicationSocket.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/evaluations/CreateEvaluationForm.tsx	dashboard/src/features/admin/evaluations/CreateEvaluationForm.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/evaluations/EvaluationChecksPanel.tsx	dashboard/src/features/admin/evaluations/EvaluationChecksPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/evaluations/EvaluationEditPanel.tsx	dashboard/src/features/admin/evaluations/EvaluationEditPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/evaluations/evaluation-domain.ts	dashboard/src/features/admin/evaluations/evaluation-domain.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/farms/FarmFilters.tsx	dashboard/src/features/admin/farms/FarmFilters.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/farms/FarmRowActions.tsx	dashboard/src/features/admin/farms/FarmRowActions.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/farms/FarmWizard.tsx	dashboard/src/features/admin/farms/FarmWizard.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/farms/PrivateFarmLocationPanel.tsx	dashboard/src/features/admin/farms/PrivateFarmLocationPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/listings/ListingActions.tsx	dashboard/src/features/admin/listings/ListingActions.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/listings/PublishListingButton.tsx	dashboard/src/features/admin/listings/PublishListingButton.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewActivity.tsx	dashboard/src/features/admin/overview/OverviewActivity.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewAlerts.tsx	dashboard/src/features/admin/overview/OverviewAlerts.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewCharts.tsx	dashboard/src/features/admin/overview/OverviewCharts.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewHero.tsx	dashboard/src/features/admin/overview/OverviewHero.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewKpis.tsx	dashboard/src/features/admin/overview/OverviewKpis.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewModuleShortcuts.tsx	dashboard/src/features/admin/overview/OverviewModuleShortcuts.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewNextActions.tsx	dashboard/src/features/admin/overview/OverviewNextActions.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewOperationalAttention.tsx	dashboard/src/features/admin/overview/OverviewOperationalAttention.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewQueue.tsx	dashboard/src/features/admin/overview/OverviewQueue.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewRequestsTable.tsx	dashboard/src/features/admin/overview/OverviewRequestsTable.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewWorkflow.tsx	dashboard/src/features/admin/overview/OverviewWorkflow.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/OverviewWorkloadChart.tsx	dashboard/src/features/admin/overview/OverviewWorkloadChart.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/overview/overview-metrics.ts	dashboard/src/features/admin/overview/overview-metrics.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/EmbeddedRequestForwardingSection.tsx	dashboard/src/features/admin/requests/EmbeddedRequestForwardingSection.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/LinkedApplicationsPanel.tsx	dashboard/src/features/admin/requests/LinkedApplicationsPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/PartnershipApplicationReview.tsx	dashboard/src/features/admin/requests/PartnershipApplicationReview.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/RequestActions.tsx	dashboard/src/features/admin/requests/RequestActions.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/RequestDocumentsPanel.tsx	dashboard/src/features/admin/requests/RequestDocumentsPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/RequestForwardingPanel.tsx	dashboard/src/features/admin/requests/RequestForwardingPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/RequestHubForwardingLink.tsx	dashboard/src/features/admin/requests/RequestHubForwardingLink.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/RequestStatusTransitionPanel.tsx	dashboard/src/features/admin/requests/RequestStatusTransitionPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/RequestWorkspace.tsx	dashboard/src/features/admin/requests/RequestWorkspace.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/forwarding-decision.test.ts	dashboard/src/features/admin/requests/forwarding-decision.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/forwarding-decision.ts	dashboard/src/features/admin/requests/forwarding-decision.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/linked-applications.test.ts	dashboard/src/features/admin/requests/linked-applications.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/linked-applications.ts	dashboard/src/features/admin/requests/linked-applications.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/request-status-transitions.test.ts	dashboard/src/features/admin/requests/request-status-transitions.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/requests/request-status-transitions.ts	dashboard/src/features/admin/requests/request-status-transitions.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/shell/LuxeUserMenu.tsx	dashboard/src/features/admin/shell/LuxeUserMenu.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/shell/nav-icons.tsx	dashboard/src/features/admin/shell/nav-icons.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/shell/sidebar-motion.ts	dashboard/src/features/admin/shell/sidebar-motion.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workflows/CoPurchaseActionsPanel.tsx	dashboard/src/features/admin/workflows/CoPurchaseActionsPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workflows/CreateCoPurchaseForm.tsx	dashboard/src/features/admin/workflows/CreateCoPurchaseForm.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workflows/OpportunityPublishPanel.tsx	dashboard/src/features/admin/workflows/OpportunityPublishPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workflows/ProposalActionsPanel.tsx	dashboard/src/features/admin/workflows/ProposalActionsPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workflows/SpecializedWorkflowPanel.tsx	dashboard/src/features/admin/workflows/SpecializedWorkflowPanel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/ActionIcon.tsx	dashboard/src/features/admin/workspace/ActionIcon.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/AdminDetailHeader.tsx	dashboard/src/features/admin/workspace/AdminDetailHeader.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/AdminDetailSection.tsx	dashboard/src/features/admin/workspace/AdminDetailSection.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/AdminFilterForm.tsx	dashboard/src/features/admin/workspace/AdminFilterForm.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/AdminListPageHeader.tsx	dashboard/src/features/admin/workspace/AdminListPageHeader.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/DecideWorkflowForm.tsx	dashboard/src/features/admin/workspace/DecideWorkflowForm.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/EntityLink.tsx	dashboard/src/features/admin/workspace/EntityLink.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/EnumLabel.tsx	dashboard/src/features/admin/workspace/EnumLabel.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/PaginatedTableShell.tsx	dashboard/src/features/admin/workspace/PaginatedTableShell.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/StaffAssignmentForm.tsx	dashboard/src/features/admin/workspace/StaffAssignmentForm.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/StatusBadge.tsx	dashboard/src/features/admin/workspace/StatusBadge.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/TablePaginationLinks.tsx	dashboard/src/features/admin/workspace/TablePaginationLinks.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/UnifiedRequestLink.tsx	dashboard/src/features/admin/workspace/UnifiedRequestLink.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/WorkflowReviewsTable.tsx	dashboard/src/features/admin/workspace/WorkflowReviewsTable.tsx
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/pagination-range.test.ts	dashboard/src/features/admin/workspace/pagination-range.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/pagination-range.ts	dashboard/src/features/admin/workspace/pagination-range.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/status-variants.test.ts	dashboard/src/features/admin/workspace/status-variants.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/features/admin/workspace/status-variants.ts	dashboard/src/features/admin/workspace/status-variants.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/i18n/messages.ts	dashboard/src/i18n/messages.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/i18n/navigation.ts	dashboard/src/i18n/navigation.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/i18n/request.ts	dashboard/src/i18n/request.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/i18n/routing.ts	dashboard/src/i18n/routing.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/admin-console-path.ts	dashboard/src/lib/admin/admin-console-path.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/assignable-staff.server.ts	dashboard/src/lib/admin/assignable-staff.server.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/console-page.ts	dashboard/src/lib/admin/console-page.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/console-routes.test.ts	dashboard/src/lib/admin/console-routes.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/console-routes.ts	dashboard/src/lib/admin/console-routes.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/cookies.ts	dashboard/src/lib/admin/cookies.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/login-errors.ts	dashboard/src/lib/admin/login-errors.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/refresh-admin-tokens.ts	dashboard/src/lib/admin/refresh-admin-tokens.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/roles.ts	dashboard/src/lib/admin/roles.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/session-cookies.server.ts	dashboard/src/lib/admin/session-cookies.server.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/session-middleware.ts	dashboard/src/lib/admin/session-middleware.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/session-token.test.ts	dashboard/src/lib/admin/session-token.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/session-token.ts	dashboard/src/lib/admin/session-token.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/session.server.ts	dashboard/src/lib/admin/session.server.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/specialized-request-path.test.ts	dashboard/src/lib/admin/specialized-request-path.test.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/specialized-request-path.ts	dashboard/src/lib/admin/specialized-request-path.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/staff-action-session.ts	dashboard/src/lib/admin/staff-action-session.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/staff-api-result.ts	dashboard/src/lib/admin/staff-api-result.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/admin/staff-permissions.ts	dashboard/src/lib/admin/staff-permissions.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/api/config.ts	dashboard/src/lib/api/config.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/api/forward-api.ts	dashboard/src/lib/api/forward-api.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/api/realtime-config.ts	dashboard/src/lib/api/realtime-config.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/api/types/admin-dashboard.ts	dashboard/src/lib/api/types/admin-dashboard.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/api/types/admin-ops.ts	dashboard/src/lib/api/types/admin-ops.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/api/types/staff.ts	dashboard/src/lib/api/types/staff.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/cn.ts	dashboard/src/lib/cn.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/lib/phone.ts	dashboard/src/lib/phone.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/proxy.ts	dashboard/src/proxy.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/styles/batch-one.css	dashboard/src/styles/batch-one.css
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/styles/components.css	dashboard/src/styles/components.css
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/styles/layout.css	dashboard/src/styles/layout.css
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/styles/request-workspace.css	dashboard/src/styles/request-workspace.css
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/src/styles/tokens.css	dashboard/src/styles/tokens.css
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/tests/e2e/admin-shell.spec.ts	dashboard/tests/e2e/admin-shell.spec.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/tests/e2e/admin-workflows.spec.ts	dashboard/tests/e2e/admin-workflows.spec.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/tests/e2e/admin.spec.ts	dashboard/tests/e2e/admin.spec.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/tests/e2e/batch-one-routes.spec.ts	dashboard/tests/e2e/batch-one-routes.spec.ts
R092	FarmExit_dashboard-v2_redesigned/dashboard-v2/tests/e2e/runtime-guards.spec.ts	dashboard/tests/e2e/runtime-guards.spec.ts
R100	FarmExit_dashboard-v2_redesigned/dashboard-v2/tsconfig.json	dashboard/tsconfig.json
M	docs/CROSS_APP_IMPLEMENTATION_ROADMAP.md
M	docs/CROSS_APP_INTEGRATION_GAP_MAP.md
A	docs/FARMEXIT_PRODUCTION_BACKEND_DEPLOYMENT_PLAN.md
M	package.json
```
