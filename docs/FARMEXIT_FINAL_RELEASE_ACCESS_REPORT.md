# FarmExit final GitHub release and production access review

Reviewed 2026-10-31, Africa/Cairo. Status: **NO-GO — no push, deployment or production account changes**. The supplied request ends at “For” in Phase 3; its missing continuation was requested. Existing legitimate source work and environment files were preserved.

## Git/source snapshot

- Local branch main; HEAD 5a8c050. Fetched origin/main af8e5dee810d6600f0e73a82ed72be8269c46589.
- Remote has two newer commits, 59ad85d and af8e5de, both dashboard/.env.example edits. Local edits to that same file differ: local API URLs are active locally; remote production URLs are active. No checkout/reset/clean/stash/merge was used to overwrite either version. Integrate remote ancestry and deliberately reconcile this file before release; never force-push.
- Canonical approved V2 already lives at dashboard/. No relocation or legacy restoration needed.
- Batch 3 API, Website, dashboard farm editor, additive schema migration and reports are present, including untracked implementation files. Newer homepage compatibility/aggregate and request-editor changes are also present; earlier Batch 3 screenshots do not verify those newer changes.
- No source commit or staging was performed by this review. Full changed-file inventory follows below. Generated/private environment files and local browser artifacts must not enter a release commit.

## Automation security

LIVE GITHUB API VERIFIED: repository has one workflow, ID 393263441, .github/workflows/public-farms-demo-seed.yml, state disabled_manually. Source has workflow_dispatch only and one no-op echo step, no checkout/install/seed/migration/restart. Remote repository hooks list is empty. Latest three Actions are historical failed push runs; no queued/in-progress run appeared in that response.

Root deploy:api remains fail-closed. Explicit manual demo seed aliases/wrappers still exist; they were inspected, never executed. API postinstall only generates Prisma client; normal package build scripts do not run schema migrations or seeds. No other tracked GitHub workflows were found. No PM2/systemd deployment automation is tracked; server automation remains unverified without SSH.

Vercel Git integration is independent of GitHub Actions/hooks. Current connected Vercel account returns zero teams and zero farm-named projects; alias lookup returns 404 in that account scope. This is **not proof the live project does not exist**. Owning account/team, project root, production branch, environment and automatic deployment settings cannot be verified or gated. User explicitly requires stopping before pushing incompatible code if automatic deployment cannot be controlled. Accordingly no push was attempted, including to main.

## Live domains and API

| Read-only request | Observed |
| --- | --- |
| https://farm-exit-blond.vercel.app/en | 200, FarmExit Website title, Vercel server |
| https://farm-exit-xcmz.vercel.app/en/admin/login | 200, FarmExit Administration title |
| Dashboard /en/sign-in | 404; this is not the source login route |
| API /health | 200 liveness only; no database/schema proof |
| API /admin-auth/me | 401 Unauthorized: correct auth route is registered; no account existence inferred |
| API /marketplace/home/en | 404 Cannot GET |
| API /marketplace/farms?quickSale=true&pageSize=1 | 400 property quickSale should not exist |
| API /staff/admin/farm-filter-options | 404 Cannot GET |
| API /staff/admin/administrators/role-options | 404 Cannot GET |
| API /staff/admin/farms/1/edit | 404 Cannot GET |
| API /staff/requests/1/applications | 404 Cannot GET |

Four required registrations are still absent at the responding upstream. Those bodies are routing failures, not record-not-found or authorization decisions. No login/password request was submitted. Reachable public domains do not establish Vercel project ownership, current deployment SHA or production settings.

## Feature verification and source findings

CODE VERIFIED: homepage real-record loading, exactly three management cards when available, governorate asking-price averages, Quick Sale tab/query, sale/rent handling, agricultural WHERE filters before pagination, same-group OR via IN / payment OR, bilingual farm/request fields, shared management/partnership redesign, EN/AR messages. Bilingual application support is not claimed solely because request forms have translations.

New homepage compatibility code helps the missing aggregate endpoint but is not a blanket compatibility fix: the deployed API still rejects Quick Sale/new agricultural contracts and lacks dashboard routes. Additional release findings:

1. home-aggregates.ts deduplicates farms by lowercased name alone. Two distinct same-named farms can be merged. Old public DTO has no authoritative farm ID. Current fixture counts do not prove a general exact unique-farm aggregate. Use a stable authorized identity from the compatible API or explicitly label an estimate; do not present name matching as database identity.
2. home-data.ts caps reads at ten pages, accepts missing failed pages and substitutes opportunity totals of zero after endpoint failures. It can present incomplete aggregates as complete. Fail closed or expose explicit partial/unavailable sections; verify full pagination consistency.
3. HomepageAdminController calls Prisma directly, contrary to BACKEND_RULES controller/service layering. Move editorial persistence to a service before considering the new source fully compliant.
4. Existing production SMS/private-storage factory guards remain blockers as documented in FARMEXIT_PRODUCTION_BACKEND_DEPLOYMENT_PLAN.md. Build success does not demonstrate production bootstrap readiness.

These findings are recorded without rewriting the user's newer work during a blocked release. No assertion that all latest features are production verified.

## Pending database/schema

Unapplied proposal 20261028140000_bilingual_public_content adds nullable JSON translations to four detail/farm tables plus homepage_content. Earlier admin credential/session migrations also need actual production history verification. Files on disk do not prove migration status. No migration status command, schema reset, deploy migration or seed was run against an unverified database. No SSH host/user alias or production database access was established. Port 4000 untouched.

## Super Admin access / conditional bootstrap

Target email abdo@farmexit.com. Production existence, active credential, membership, lockout and session audience are **NOT VERIFIED**. Local account existence is not evidence about production. Existing bootstrap/provision commands are explicitly development-only; do not bypass NODE_ENV guards, reuse a local password/hash, or run general seeds in production.

Before executing any narrowly scoped bootstrap, verify through authorized server access: exact database/server identity with redacted credentials; actual migration history and admin_credentials/user_sessions/staff_memberships shape; account identity linkage; active role/credential state; backup and transaction capability; complete production auth routes, password policy and compatible deployment. Read only safe status fields, never output password hashes, tokens or environment contents.

If the exact production account already exists, preserve its password/roles and use the approved recovery flow if needed. If missing and all prerequisites pass, implement/review a dedicated production-only command pinned to this exact email and verified identity, with explicit execution opt-in, transactional unique-key/idempotent behavior, no changes to unrelated accounts or fixtures, Argon2 hashing through the existing password policy, must_change_password, and secure local secret input/output outside chat/logs. A mobile/name identity may be required by schema; do not invent it. No bootstrap script was run or existing guard weakened. Secure initial credential handoff must be arranged without printing it in tools, reports or chat.

## Release gate / resume requirements

1. Provide the missing request continuation.
2. Connect the Vercel owning account/team or authorize the known team ID; verify both projects/domains/roots and disable or safely gate automatic production assignment before a source push.
3. Supply authorized SSH host/user or configured alias, without sending passwords/private keys in chat. Verify schema, source/dist/process and production adapters before any account changes or backend release.
4. Resolve the bounded source findings and isolated persistence/publication acceptance, integrate remote .env.example work without discarding local configuration, then rerun affected gates.
5. Only after these prerequisites: commit reviewed source, push without force, verify no unsafe automation, stage compatible frontend builds, run acceptance, then promote. Rollback must point to verified prior deployments, not guessed IDs.

No deployment ID, production account existence, successful login or GitHub delivery is invented. Existing production state is unchanged by this review.

## Current verification results

Checks running/completed during this review are recorded in the addendum below. Prior reports remain historical evidence, not a substitute for current checks.

## Changed/untracked file inventory
- `api/prisma/migrations/20261028140000_bilingual_public_content/migration.sql`
- `api/prisma/schema.prisma`
- `api/scripts/website-batch3-isolated.cjs`
- `api/src/common/dto/localized-content.dto.ts`
- `api/src/common/localized-content.ts`
- `api/src/modules/farm-management-requests/dto/farm-management-request.dto.ts`
- `api/src/modules/farm-management-requests/farm-management-requests.service.ts`
- `api/src/modules/farms/dto/create-farm.dto.ts`
- `api/src/modules/farms/dto/farm-response.dto.ts`
- `api/src/modules/farms/dto/update-farm.dto.ts`
- `api/src/modules/farms/farms.service.ts`
- `api/src/modules/listing-requests/dto/listing-request.dto.ts`
- `api/src/modules/listing-requests/listing-requests.service.ts`
- `api/src/modules/listing-requests/public-listing-contract.ts`
- `api/src/modules/marketplace/batch-three.spec.ts`
- `api/src/modules/marketplace/dto/marketplace-query.dto.ts`
- `api/src/modules/marketplace/dto/public-listing.dto.ts`
- `api/src/modules/marketplace/dto/public-opportunity.dto.ts`
- `api/src/modules/marketplace/dto/public-opportunity-query.dto.ts`
- `api/src/modules/marketplace/homepage.controller.ts`
- `api/src/modules/marketplace/homepage.service.spec.ts`
- `api/src/modules/marketplace/homepage.service.ts`
- `api/src/modules/marketplace/marketplace.module.ts`
- `api/src/modules/marketplace/marketplace-query.ts`
- `api/src/modules/marketplace/public-localized-content.ts`
- `api/src/modules/marketplace/public-opportunity-map.ts`
- `api/src/modules/marketplace/public-opportunity-query.ts`
- `api/src/modules/partnership-requests/dto/partnership-request.dto.ts`
- `api/src/modules/partnership-requests/partnership-requests.service.ts`
- `dashboard/.env.example`
- `dashboard/src/features/admin/farms/FarmWizard.tsx`
- `dashboard/src/lib/content/localized.ts`
- `docs/FARMEXIT_HOMEPAGE_LIVE_DATA_FIX_REPORT.md`
- `docs/WEBSITE_MARKETPLACES_BILINGUAL_BATCH_3_REPORT.md`
- `web/messages/ar/home.json`
- `web/messages/en/home.json`
- `web/scripts/verify-homepage-live-fixes.mjs`
- `web/scripts/verify-website-batch3.mjs`
- `web/src/app/[locale]/management/page.tsx`
- `web/src/app/[locale]/page.tsx`
- `web/src/app/[locale]/partnerships/opportunities/[id]/page.tsx`
- `web/src/app/[locale]/partnerships/page.tsx`
- `web/src/components/content/BilingualFields.tsx`
- `web/src/features/home/AboutSection.tsx`
- `web/src/features/home/FeaturedFarms.tsx`
- `web/src/features/home/HeroSearch.tsx`
- `web/src/features/home/home-aggregates.test.ts`
- `web/src/features/home/home-aggregates.ts`
- `web/src/features/home/home-data.ts`
- `web/src/features/home/HomeHero.tsx`
- `web/src/features/home/ManagementSection.tsx`
- `web/src/features/home/MarketInsights.tsx`
- `web/src/features/home/Testimonials.tsx`
- `web/src/features/management/RequestCard.tsx`
- `web/src/features/marketplace/batch-three.test.ts`
- `web/src/features/marketplace/FilterPanel.tsx`
- `web/src/features/marketplace/MarketplaceSearch.tsx`
- `web/src/features/marketplace/url-state.ts`
- `web/src/features/my-farms/AddFarmWizard.tsx`
- `web/src/features/my-farms/FarmWorkspace.tsx`
- `web/src/features/my-farms/types.ts`
- `web/src/features/my-management/ManagementRequestDetail.tsx`
- `web/src/features/my-management/ManagementWizard.tsx`
- `web/src/features/opportunity-marketplace/FilterSidebar.tsx`
- `web/src/features/opportunity-marketplace/ManagementDetailDrawer.tsx`
- `web/src/features/opportunity-marketplace/ManagementMarketplace.tsx`
- `web/src/features/opportunity-marketplace/opportunity-marketplace.css`
- `web/src/features/opportunity-marketplace/OpportunityMarketplace.tsx`
- `web/src/features/opportunity-marketplace/option-labels.ts`
- `web/src/features/opportunity-marketplace/PartnershipHeroSearch.tsx`
- `web/src/features/opportunity-marketplace/PartnershipMarketplace.tsx`
- `web/src/features/opportunity-marketplace/shared.tsx`
- `web/src/features/phase8/PartnershipWizard.tsx`
- `web/src/features/search/SearchBar.tsx`
- `web/src/features/search/SearchRange.tsx`
- `web/src/lib/api/public-listing.ts`
- `web/src/lib/content/localized.ts`
- `web/src/lib/data/load-farm-marketplace.ts`
- `web/src/lib/data/marketplace.ts`
- `web/src/lib/data/marketplace-api.ts`
- `web/src/lib/data/public-farm-details.ts`
- `web/src/lib/opportunities/public-opportunity.ts`


### Verified check addendum

- Website typecheck and lint passed; five focused homepage/marketplace tests passed. Production build FAILED at the installed Next.js security checkpoint (details below).
- Dashboard typecheck, lint and all read-only/session/sidebar guards passed; 31 unit tests passed. Production build exited 0, generating 114 pages.
- API production-config typecheck passed; six focused suites / 27 tests passed. Broad NodeNext typecheck/lint are not represented as clean.
- git diff --check passed. Source/package scripts were inspected, no seed/deploy/migration script executed.

- TESTED isolated in-memory reproducer: two listings with the same name but different governorates were aggregated as one farm and one governorate. No database was accessed. This confirms the identity/count finding despite existing happy-path tests passing.
- LIVE GITHUB API VERIFIED: latest main af8e5de has no check-runs returned. Deployments endpoint only showed historical production records for 4b2e64b/e87a26d/6418647; this is not sufficient to rule out independent Vercel Git automation.

- Website prerender logs also show HANGING_PROMISE_REJECTION caught by the broad homepage catch and followed by a compatibility retry. Framework control-flow/prerender cancellation must propagate correctly; do not treat that log as a real production API outage or claim the build log is clean.

- Current Website production build compiled and generated 144 pages, then reported SecurityFatalError for installed Next.js 16.4.0. This is a FAILED release build, not a pass. A reviewed security upgrade is recommended before production; no package/lockfile change or automatic upgrade was made. Earlier successful builds do not override this current result.
