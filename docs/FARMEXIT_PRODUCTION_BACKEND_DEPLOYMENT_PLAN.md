# FarmExit production backend deployment plan

Reviewed: 2026-10-28, Africa/Cairo. **Verdict: NO-GO for production restart or deployment.** This is a plan only; no server deployment, database operation, service restart, migration, seed, or upload modification was executed. No commit or push was made for this review.

> Relocation update (2026-10-28): the current canonical Dashboard and Vercel root are `dashboard/`. Paths and main SHA below describe the pre-flight snapshot. Safety commit `a79c33b` subsequently disabled the seed workflow remotely, replaced it with a manual no-op notice, and blocked `deploy:api`. The automation prerequisite is resolved for this delivery; production provider/runtime NO-GO conditions remain.

## 1. Evidence and limits

GitHub main was read directly and resolves to `fe05a357b1150031634d6a2df580b3bc811240ed`, including adoption commit `4b2e64b1e4a3ea59a72db4416cac72ead9bc092a`. Local source matches it at review time. Canonical Dashboard: `FarmExit_dashboard-v2_redesigned/dashboard-v2`. Server application path supplied by owner: `/var/www/farmexit.nodeteam.site/api`.

Live HTTPS checks on 2026-10-28 at approximately 09:48 UTC / 12:48 Cairo:

| Request under https://farmexit.nodeteam.site | Actual result |
| --- | --- |
| GET /api/v1/health | 200, status ok; liveness only, no database query |
| GET /api/v1/staff/me | 401 Unauthorized |
| GET /api/v1/staff/admin/farm-filter-options | 404: Cannot GET /api/v1/staff/admin/farm-filter-options |
| GET /api/v1/staff/requests/1/applications | 404: Cannot GET /api/v1/staff/requests/1/applications |
| GET /api/v1/staff/admin/administrators/role-options | 404: Cannot GET /api/v1/staff/admin/administrators/role-options |
| GET /api/v1/staff/admin/farms/1/edit | 404: Cannot GET /api/v1/staff/admin/farms/1/edit |

These four response bodies establish missing route registrations at the public upstream, rather than a matched handler rejecting authorization or reporting a missing record. No successful login is inferred. IDs in paths are required: the request's double-slash examples mean `:id`, not literal empty IDs. ID 1 was used only to test route matching without credentials; actual acceptance needs existing authorized IDs.

**Confirmed mismatch:** main registers all four routes; the responding upstream does not. **Not established:** deployed Git SHA, deployed source, dist freshness, process command/cwd, process manager, Node version, database history/drift, effective environment, TLS virtual host, or storage location. Read-only SSH connection details were requested but were not available when this plan was written. Do not describe an old dist build as confirmed: stale source, stale dist, wrong working directory, wrong service, or wrong proxy upstream can all explain this result.

The response Server header is Apache/2.4.58 (Ubuntu). The repository's `farmexit.nodeteam.site.conf` is Apache, not Nginx: its HTTP vhost proxies to `127.0.0.1:9321` and redirects to HTTPS. This does not prove the live TLS vhost/upstream or exclude another proxy. No Nginx or PM2/systemd configuration is tracked.

## 2. Source route registrations and RBAC

Global prefix `api`, URI version default `1`: `api/src/common/app-setup.ts`.

| Method / v1 suffix | Controller and module registration | Required access |
| --- | --- | --- |
| GET staff/admin/farm-filter-options | AdminDashboardController; AdminOperationsModule; AppModule | Dashboard audience, completed profile, active staff, admin or superAdmin |
| GET staff/requests/:id/applications | StaffLinkedApplicationsController; RequestsModule; AppModule | StaffOnly + requests.read; parent access checked; admin scope or assigned caseAgent; children scoped separately; only submitted, non-draft applications |
| GET staff/admin/administrators/role-options | AdminDashboardController; AdminOperationsModule; AppModule | Admin/superAdmin dashboard session plus staff.manage; admin role creation available only to superAdmin |
| GET staff/admin/farms/:id/edit | AdminFarmManagementController; FarmsModule; AppModule | Dashboard audience and superAdmin; service authorization retained |
| PATCH staff/admin/farms/:id | Same farm controller | superAdmin; validated update and service authorization |
| POST staff/admin/farms | Same farm controller | superAdmin; validated create |

The needed endpoint source is already in main. Adoption did not change package.json, package-lock.json, schema, migrations, environment validation, or provider factories relative to pre-adoption `e87a26d`. Deploy all compatible backend source together, including account actions, farm management/filtering, linked applications, communication status handling, and listing authorization; do not cherry-pick controller files without modules/services/DTOs.

## 3. Runtime blockers and required source work

### Hard blocker: production provider construction

`EnvironmentVariables` accepts only `SMS_PROVIDER=development` and `MEDIA_STORAGE_PROVIDER=local`. Their factories explicitly throw under `NODE_ENV=production`. AuthModule and MediaModule eagerly register these providers in AppModule. Thus this revision cannot bootstrap with a properly configured production environment, even when only dashboard features are desired.

This was reproduced locally against compiled factory functions, without starting a server or contacting a database:

- SMS: `SMS_PROVIDER=development is not allowed in production: configure a real SMS provider`.
- Storage: `MEDIA_STORAGE_PROVIDER=local is not allowed in production: configure private object storage`.

The restriction already existed before adoption. It is not a new dashboard regression. The running public API does not prove current main starts in production; its configuration and revision are unknown.

**Required before GO:** implement approved real SMS and private storage adapters, add their validated configuration and tests, preserve private authorization and existing storage-key compatibility, and demonstrate full staging bootstrap with NODE_ENV=production. Determine how existing uploads will remain readable; a new bucket cannot silently replace existing local content. Do not bypass the guards, switch production to development/test, or invent provider names in .env. Provider selection and storage transition require a separate reviewed change; none was made here.

### Automation blocker

`.github/workflows/public-farms-demo-seed.yml` triggers on API/root-package changes on main and develop, builds the API, then calls the demo seed wrapper. It defaults production seed opt-ins to true. Root `npm run deploy:api` also builds and invokes a seed wrapper. Neither is a safe no-data-change deployment entrypoint.

Before any prerequisite fix is pushed or released, the owner must disable this workflow or change its reviewed job gate so production seeding cannot occur. Explicit false repository variables alone are insufficient proof of safety without checking wrapper behavior and effective settings. Inspect prior action runs for the adoption push separately; this review did not access action history and does not claim whether it wrote data. Do not run any seed wrapper, bootstrap, or demo verification script that creates sessions/fixtures during this deployment.

## 4. Quality gates: configuration versus regression

Prior adoption verification: production build passed; focused compatibility suite passed 9 suites / 58 tests. Broad typecheck failed and broad lint reported 15,433 errors / one warning. Those broad failures are not clean gates.

Root causes established by source and a targeted diagnostic:

- api/package.json declares type=module; broad tsconfig uses NodeNext and includes src, test and prisma. Existing source uses extensionless imports. NodeNext requires explicit extensions for relative ESM paths, producing TS2835/TS2307 and cascading unresolved/implicit-any types.
- Production tsconfig.build.json deliberately overrides module=CommonJS, moduleResolution=node, resolvePackageJsonExports=false, and compiles src without tests. Prisma generator also emits cjs with js import extensions. build/start write dist/package.json with type=commonjs; this marker and the run-dist-cjs.cjs entry wrapper must be preserved.
- ESLint's typed projectService uses the broad tsconfig, so unresolved types amplify no-unsafe-* diagnostics in both existing and new code. A temporary in-memory lint override using tsconfig.build.json (no source/config writes) changed PrismaService from 4 errors to 0 and new LinkedRequestApplicationsService from 93 errors to 0.
- `npm exec -- tsc --noEmit --incremental false -p tsconfig.build.json` passed in this review. Local Node v24.21.0, npm 11.19.0; these are not server versions.
- The NodeNext/build split and provider guards are unchanged from e87a26d. Do not attribute all broad errors to new source. Conversely, no-unsafe cascades do not explain every finding: prior output also had unused variables, test typing issues, promise-rejection rules, and scripts outside the TypeScript project.

Follow-up: align a dedicated check/lint TypeScript project with the actual CommonJS runtime, explicitly include scripts/tests where appropriate, then inspect residual errors. This is a bounded follow-up, not blanket rule suppression or mass import rewrites. No quality configuration was changed here. A release owner must explicitly resolve/waive the broad-gate gap with documented residual-risk review; startup blockers cannot be waived by citing passing builds.

## 5. Dependency, schema, environment, and persistence prerequisites

Lockfile resolutions inspected: Nest core/platform-express 12.1.3; platform-socket.io 12.2.0; Prisma CLI/client/MariaDB adapter 7.10.0; TypeScript 6.0.3; ESLint 10.12.0; typescript-eslint 8.71.1; Socket.IO 4.8.4; argon2 0.43.1. Respect lockfile rather than updating dependencies on-server. Node engine: ^22.22.3 or ^24.15.0 or >=26.0.0; prefer an approved supported Node 24 matching staging. Confirm the service's actual binary as well as the interactive shell.

Prisma outputs to src/generated/prisma (ignored), then Nest compiles it into dist/generated/prisma. Generate on the Linux host/release, not by copying Windows node_modules or compiled native packages. Verify argon2/native dependencies load on that host. `npm ci` invokes postinstall Prisma generation; the explicit generation below repeats it intentionally for a visible gate.

Seven migrations are tracked, ending in 20261017143000_add_admin_credentials_superadmin_auth. The prior migration creates dashboard_admin_credentials and adds super_admin; the final one renames it to admin_credentials and adds user_sessions.auth_audience. They are sequential, not alternatives. Adoption added no migrations, but the server may lag earlier changes. Migration status does not establish schema equality; run both status and read-only diff. Pending/failed migrations, edited applied checksums, or nonempty schema diff mean STOP for separately approved investigation. Do not migrate deploy, migrate dev, migrate reset, db push, db execute, or seed.

Preserve effective process-manager environment precedence, existing production .env, DATABASE_URL, JWT_ACCESS_SECRET, OTP_HASH_SECRET, JWT_ISSUER, session TTLs, and credentials; no secret rotation in this release. Validate required distinct secrets without printing them. Preserve NODE_ENV=production; demo/fixed OTP flags must be false. New provider configuration remains unresolved. The Prisma config eagerly reads SHADOW_DATABASE_URL even for CLI commands that do not use a shadow database: arrange an approved distinct value privately if absent, without creating/resetting/accessing a shadow DB. Never point it at the live database.

Confirm the actual listener port from process/environment/proxy. 9321 is a repository clue only. The application/example defaults to 4000, which must never be used for this task: an absent or 4000 effective PORT is a STOP condition, not permission to try the default. Do not enumerate, connect to, restart, or bind port 4000.

Preserve absolute MEDIA_STORAGE_DIR, all uploaded image/document keys, ownership, ACLs, symlinks, and any externally mounted storage. Relative ./storage/uploads changes meaning when cwd changes; resolve it against the old cwd before staging. Existing private files must remain behind authorized endpoints, never a static proxy alias. Keep database and storage backups access-controlled. Back up effective external storage as well as api/storage; tar of a symlink alone does not back up its target. Coordinate consistent database/object snapshots with the owner if concurrent writes matter.

CORS_ORIGINS must include exact actual Website/Dashboard HTTPS origins. SOCKET_IO_PATH defaults /socket.io; namespace /communication uses short-lived one-use in-memory tickets. Do not use /api/v1 as the socket origin/path. Multi-process PM2 cluster requires explicit ticket/room/session affinity and cross-worker broadcast design; default to the confirmed existing topology, not a new cluster. Confirm polling and WebSocket Upgrade proxying, TLS, timeouts and reconnect behavior.

## 6. Server read-only discovery — required before release commands are executable

The following are operator commands, not executed in this review. Use the existing approved SSH account/alias; no guessed login. Capture private outputs in an access-controlled incident/release record, not this repository. Do not dump /proc/PID/environ, pm2 jlist, service Environment values, or .env into shared logs.

```bash
set -euo pipefail
APP=/var/www/farmexit.nodeteam.site/api
test -d "$APP"
cd "$APP"
git rev-parse --show-toplevel
git rev-parse HEAD
git status --porcelain=v1 --untracked-files=normal
node --version
npm --version
# Identify only the already-approved FarmExit service, then fill these values.
# systemctl show "$UNIT" -p MainPID -p WorkingDirectory -p FragmentPath -p ExecStart
# pm2 describe "$PM2_NAME"    # review privately; may include sensitive arguments
# readlink -f "/proc/$PID/cwd"
# readlink -f "/proc/$PID/exe"
# sha256sum "$APP/dist/main.js" "$APP/dist/package.json"
# stat "$APP/dist/main.js" "$APP/package-lock.json"
# sudo apache2ctl -S         # actual TLS vhost and upstream
# sudo nginx -T             # only if discovery confirms Nginx is involved; output private
```

Inspect selected compiled controller/module files for all four route strings, compare server source SHA to main, and compare process start time to build timestamps. A source SHA alone is not a build identity. Check process command and cwd before assuming dist/main.js is used. If an external load balancer selects multiple nodes, inspect each upstream and repeat route probes. Record the service name/user, service definition, absolute Node path, effective non-4000 port, environment sources, storage paths and source root. No restart command can be called verified until this mapping is complete.

## 7. Future deployment commands — gated runbook, NOT authorized execution

**Do not execute this section at the current NO-GO revision.** First resolve sections 3–6, approve a specific corrected release SHA, demonstrate staging production-mode startup, approve backup credentials/locations and the exact process-manager change, and schedule a restart window. Commands below preserve the current live checkout/dist and stage a separate release, avoiding npm ci or Nest deleteOutDir against a running application.

### A. Private production backup

Run as the deployment owner with sufficient read access. Fill required variables from discovery; no guessed database credentials. MYSQL_CNF must be an existing mode-600 MySQL client option file, not .env. Use the operator's approved database backup mechanism instead where GTID/replication/large tables require it.

```bash
set -euo pipefail
umask 077
APP=/var/www/farmexit.nodeteam.site/api
REPO=$(git -C "$APP" rev-parse --show-toplevel)
: "${BACKUP_PARENT:?Set an approved private directory outside the Git repository}"
: "${UPLOAD_ROOT:?Set the confirmed absolute persistent upload directory}"
: "${MYSQL_CNF:?Set an existing private MySQL client option file}"
: "${DB_NAME:?Set confirmed production database name}"
: "${SERVICE_CONFIG:?Set the confirmed service definition file path}"
test -d "$UPLOAD_ROOT" && test -f "$MYSQL_CNF" && test -f "$SERVICE_CONFIG"
BACKUP="$BACKUP_PARENT/farmexit-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$BACKUP"
case "$(realpath "$BACKUP")/" in "$(realpath "$REPO")/"*) echo 'Backup inside repo: STOP' >&2; exit 1;; esac
git -C "$REPO" rev-parse HEAD > "$BACKUP/source-sha.txt"
git -C "$REPO" status --porcelain=v1 > "$BACKUP/git-status.txt"
tar --acls --xattrs -cpf "$BACKUP/api-runtime.tar" -C "$APP" .
# api-runtime includes .env, source, current dist, dependencies and any api-local files.
tar --acls --xattrs -cpf "$BACKUP/uploads.tar" -C "$UPLOAD_ROOT" .
cp -p -- "$SERVICE_CONFIG" "$BACKUP/service-config"
# Also privately snapshot all referenced environment files and actual TLS proxy configuration.
mysqldump --defaults-extra-file="$MYSQL_CNF" --single-transaction --quick \
  --routines --triggers --events --hex-blob --no-tablespaces \
  --databases "$DB_NAME" | gzip > "$BACKUP/database.sql.gz"
gzip -t "$BACKUP/database.sql.gz"
(cd "$BACKUP" && sha256sum api-runtime.tar uploads.tar service-config database.sql.gz > SHA256SUMS)
(cd "$BACKUP" && sha256sum -c SHA256SUMS)
# Verify database backup restore on a separately authorized isolated host, never the live DB.
```

Abort on dirty/untracked server source, changed applied migration files, insufficient disk, unresolved external mounts, or incomplete backup. Do not git reset/clean/stash or delete user work. A hot upload archive is not automatically transactionally consistent with the DB dump; coordinate an approved snapshot/write pause if necessary. Backup restore testing and any write pause need separate authorization.

### B. Git update and isolated dependency/client build

```bash
: "${RELEASE_SHA:?Set the FULL approved corrected SHA; fe05a35 is currently NO-GO}"
: "${RELEASE_PARENT:?Set an approved absolute release directory outside the live checkout}"
git -C "$REPO" fetch origin main
# Require target to be present in fetched main; do not silently deploy a moving branch.
git -C "$REPO" merge-base --is-ancestor "$RELEASE_SHA" origin/main
RELEASE="$RELEASE_PARENT/$RELEASE_SHA"
test ! -e "$RELEASE"
mkdir -p "$RELEASE"
case "$(realpath "$RELEASE")/" in "$(realpath "$REPO")/"*) echo 'Release inside live repo: STOP' >&2; exit 1;; esac
git -C "$REPO" archive "$RELEASE_SHA" | tar -x -C "$RELEASE"
NEXT_APP="$RELEASE/api"
test -f "$NEXT_APP/package-lock.json"
test -f "$APP/.env"
# Only if discovery proves .env is the actual environment source; retain manager overrides.
ln -s "$APP/.env" "$NEXT_APP/.env"
cd "$NEXT_APP"
# Environment/provider/port/storage prerequisite checks must already have passed.
npm ci --include=dev
npm run prisma:generate
npm run prisma:validate
```

The live repository branch is intentionally not pulled over the running application; the fetched approved SHA is exported to a release. This preserves server edits and the old dist for rollback. If the service currently lacks a .env file, stop and use its discovered environment mechanism; do not create one from .env.example. Do not copy Windows dependencies. npm ci needs build devDependencies; `--omit=dev` would remove Nest CLI/TypeScript/Prisma CLI. No root deploy:api command is used.

### C. Read-only database gates and backend build

Flags below were checked against the installed Prisma 7.10 CLI help. The diff compares datasource directly to schema and does not need a migration shadow DB. No SQL output is piped to an execution tool.

```bash
cd "$NEXT_APP"
npx --no-install prisma migrate status
# Nonzero: STOP. Inspect migration history; do not automatically apply anything.
npx --no-install prisma migrate diff \
  --from-config-datasource --to-schema prisma/schema.prisma --exit-code
# 0 = no schema diff; 2 = differences, STOP; 1 = command error, STOP.
npm run build
npm exec -- tsc --noEmit --incremental false -p tsconfig.build.json
npm run test -- --config jest-dashboard-v2.json --runInBand
node -e "const fs=require('node:fs'); if(JSON.parse(fs.readFileSync('dist/package.json')).type!=='commonjs') process.exit(1); require('argon2'); require('./dist/generated/prisma/client.js'); console.log('CJS marker, native module and generated client load OK')"
sha256sum dist/main.js package-lock.json > "$BACKUP/new-build-sha256.txt"
```

Before switching traffic, use a separately authorized staging environment with equivalent provider configuration to verify full application DI/bootstrap and authenticated DB queries. The original 58 mocked tests do not prove production bootstrap, native ABI, database schema, or real integrations. No staging service should accidentally bind port 4000 or use a production DB for test writes. Preserve old binary/dependencies rather than rebuilding them during rollback.

### D. Safe service switch/restart — conditional on actual manager

There is **no verified service name or unit** yet. Choose exactly one discovered manager. The service-change artifact must explicitly record old and new cwd, Node binary, entrypoint, user, env source, persistent storage path and port, and be reviewed before use. Keep the current upstream port and proxy configuration. Bind no second process to that port while the old process runs.

Expected application entrypoint is the absolute Node executable plus `scripts/run-dist-cjs.cjs` with cwd=$NEXT_APP; `dist/main.js` is valid only with the CJS marker. Review any existing wrapper for hidden migration/seed hooks before restarting.

Systemd, only after the approved release-specific unit/drop-in has been installed and backed up:

```bash
: "${UNIT:?Set verified FarmExit systemd unit name}"
# Approved unit/drop-in points WorkingDirectory/ExecStart at NEXT_APP, preserves env and uploads.
sudo systemctl daemon-reload
sudo systemctl restart "$UNIT"
sudo systemctl is-active --quiet "$UNIT"
# Review narrowly scoped service logs privately for bootstrap, adapter and schema errors.
```

PM2, only if this is the established manager and a reviewed release ecosystem file exists:

```bash
: "${PM2_NAME:?Set verified existing FarmExit PM2 application name}"
: "${APPROVED_ECOSYSTEM:?Set reviewed absolute release ecosystem file path}"
pm2 startOrReload "$APPROVED_ECOSYSTEM" --only "$PM2_NAME" --env production
# Verify exactly one intended FarmExit app, correct cwd/entrypoint/port; keep old config.
# Run pm2 save only after full acceptance and after confirming no unrelated app changes.
```

Do not run both branches, create a guessed PM2 app, restart all services, reload the proxy unnecessarily, or claim zero downtime. WebSockets disconnect during a restart; clients must reconnect and resync. No restart commands were executed in this review.

### E. Health and route-registration checks

```bash
: "${API_PORT:?Set the verified existing API upstream port}"
case "$API_PORT" in ''|*[!0-9]*|4000) echo 'Unsafe/unverified port: STOP' >&2; exit 1;; esac
curl --fail-with-body --connect-timeout 5 --max-time 15 "http://127.0.0.1:$API_PORT/api/v1/health"
curl --fail-with-body --connect-timeout 5 --max-time 15 https://farmexit.nodeteam.site/api/v1/health
BASE=https://farmexit.nodeteam.site/api/v1
for route in staff/me staff/admin/farm-filter-options staff/requests/1/applications \
  staff/admin/administrators/role-options staff/admin/farms/1/edit; do
  curl --silent --show-error --connect-timeout 5 --max-time 15 \
    --write-out '\nHTTP %{http_code}\n' "$BASE/$route"
done
curl --silent --show-error --connect-timeout 5 --max-time 15 \
  --write-out '\nHTTP %{http_code}\n' \
  'https://farmexit.nodeteam.site/socket.io/?EIO=4&transport=polling'
```

For these unauthenticated protected routes expect 401, not Cannot GET. A matched authorization 403 has a different meaning and requires investigation, not route recreation. A handler-level 404 after authentication may be correct for an inaccessible/nonexistent ID or ineligible parent. Engine.IO 200 alone does not prove /communication authentication, Upgrade support, allowed origins, or delivery. Check the configured socket path if different. Compare direct upstream and public responses to isolate a proxy mismatch.

## 8. Rollback

Rollback trigger: bootstrap/provider error, unhealthy service, route absence, repeated 5xx, schema/client mismatch, broken RBAC/privacy, or failed critical acceptance. Retain the old process configuration, old release directory, Node/dependencies, .env and uploads throughout the window.

Because the plan applies no DB migrations, rollback should switch the service back to its exact old cwd/entrypoint/config and restart only that verified service. Do not reset the checkout or replay old migrations. Do not restore a database or uploads over post-release user writes as an ordinary application rollback.

Systemd branch, with BACKUP/service-config holding the exact original modified file and SERVICE_CONFIG revalidated as that same file:

```bash
# Verify path/content correspondence and ownership before restoring the one changed definition.
sudo cp -p -- "$BACKUP/service-config" "$SERVICE_CONFIG"
# Remove/restore only the specific release drop-in if one was introduced; use its reviewed path.
sudo systemctl daemon-reload
sudo systemctl restart "$UNIT"
sudo systemctl is-active --quiet "$UNIT"
```

PM2 branch, using an original reviewed ecosystem file preserved before deployment:

```bash
: "${OLD_ECOSYSTEM:?Set the preserved original PM2 ecosystem file}"
pm2 startOrReload "$OLD_ECOSYSTEM" --only "$PM2_NAME" --env production
```

Repeat direct/public health, route baseline, login, authorized existing upload read and realtime checks. Keep failed release/logs privately for analysis. Database or object restore requires separate incident approval, a consistent backup and a plan to preserve new user writes; no restore SQL is authorized here. Switching to the old binary does not undo valid business actions completed during acceptance.

## 9. Real authenticated acceptance — required for GO completion

Use existing authorized staff credentials through the canonical Dashboard, with approved existing record IDs. Keep credentials/tokens out of terminal commands, screenshots and this document. If API probes are needed, use a private mode-600 curl config containing Authorization, not a token in command history or process arguments. Do not reset credentials or manufacture sessions.

- Super Admin: email/password login, /staff/me roles and dashboard audience, navigation, refresh rotation, logout and expired-session behavior; retain Website OTP behavior.
- Farm filter options: 200 for Super Admin and appropriate admin; labels/options match real authorized data and filters affect counts before pagination.
- Farm editing: GET existing accessible farm edit data; perform only an explicitly approved reversible edit on an owner-approved record, confirm audit and reload. Normal admin/reviewer must not gain superAdmin write privileges.
- Linked applications: use an existing partnership parent; correct counts, filtering, pagination, no drafts; parent access must not imply access to all children; assigned caseAgent sees only permitted submitted applications. Ineligible/nonexistent parent may return a deliberate 404.
- Administrator role options: permitted roles and permissions match actor; ordinary admin cannot assign admin/superAdmin beyond its rules. Do not create staff accounts merely to test deployment.
- Listing review/publication: correct existing review detail and allowed transitions, authorization, farm visibility/status and public Website consistency. Publishing is a business-data write and requires explicit record/action approval before testing.
- Communications: authorized case and document access, staff/customer separation, no disclosure of counterpart direct contacts or private coordinates; permitted closed/reopen behavior with audit. Sending messages requires explicit approval on the chosen case.
- Realtime: real dashboard ticket, allowed exact origin, /communication connection, polling and WebSocket Upgrade, receive approved event once, reconnect/resync without duplicates, revoked/expired session and foreign-case denial. Confirm routing across workers if more than one is used.
- Existing authorized uploads remain readable; anonymous/private document requests remain denied; Website public routes retain private-location/contact restrictions. Do not expose object storage directly.

No production write acceptance is authorized by this pre-flight. Read-only acceptance can be prepared, while edit/publish/message checks await specific deployment-phase authorization. Do not mark fixture checks as live acceptance.

## 10. Go / No-Go decision

**NO-GO now.** The route mismatch is confirmed, but a safe release requires more than restarting main:

1. Approved real production SMS and private storage adapters plus full production-mode staging bootstrap.
2. SSH evidence identifying actual live SHA/dist/process/Node/env/proxy/port/persistence and resolving any upstream mismatch.
3. Production migration status plus schema diff; separately approved remediation if not clean.
4. Seed automation disabled/reviewed, private backups verified, immutable corrected SHA approved, exact service switch and rollback artifacts reviewed.
5. Broad-quality-gate root-cause remediation or explicit owner-reviewed residual-risk disposition; no blanket suppression.
6. Existing credentials/record IDs and permission for the post-deployment acceptance actions.

All nine Bash command blocks passed bash -n syntax validation; none was executed. Prisma migrate status/diff flags were verified using local CLI help. Server-specific values remain deliberately unresolved until discovery, so syntax validation is not server execution validation.

No source/configuration changes were made beyond this plan. The earlier report's passing build and 58 tests remain valid evidence of their limited scope, not a production readiness verdict.
