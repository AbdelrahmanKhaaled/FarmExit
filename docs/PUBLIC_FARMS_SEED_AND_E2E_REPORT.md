# Public farms demo seed and E2E runner repair

Date: 2026-10-22. Local repository only; no production seed or commits.

## 1. Seed files inspected

| Path | Role |
|------|------|
| `api/prisma/seed.ts` | Main Prisma seed (demo users, not marketplace listings) |
| `api/prisma/seed-dashboard-demo.ts` | Dashboard demo (`--apply --confirm`) |
| `api/scripts/seed-client-demo.cjs` | Client demo MP fixtures (private, no publish) |
| `api/scripts/client-demo-safety.cjs` | Loopback `farmexit` + `NODE_ENV=development` guard |
| `api/prisma/schema.prisma` | `Farm`, `FarmListingDetail`, `Request`, publication fields |
| `api/src/modules/listing-requests/listing-publication.service.ts` | Admin publish after `approved` |
| `api/src/modules/listing-requests/staff-listing-reviews.service.ts` | Staff approve/reject |
| `api/src/modules/marketplace/marketplace.service.ts` | `GET /api/v1/marketplace/farms` |
| `docs/BACKEND_RULES.md` | Backend conventions |

Public eligibility (summary): `request_type=farm_listing`, `status=published`, `visibility=public`, `publishedAt` set, farm not deleted, whole-pound sale/rent prices, staff approval then explicit publish. No private coordinates on public DTOs (`public-listing-contract.ts`).

## 2. New seed script

| File | Purpose |
|------|---------|
| `api/scripts/seed-public-farms-demo.cjs` | Plan, dry-run, safety, apply orchestration |
| `api/scripts/seed-public-farms-demo-apply-dist.mjs` | Nest context from compiled `dist/` |
| `api/scripts/register-dist-resolver.mjs` + `dist-import-resolver.mjs` | Resolves extensionless `dist/` ESM imports on Node |

npm script: `npm run seed:public-farms-demo` (in `api/package.json`).

## 3–4. Dataset targets

| Item | Count |
|------|------:|
| Synthetic farms (`[DEMO] PFM …`) | **60** |
| Published **sale** listings | **35** |
| Published **rent** listings | **25** |

Stable refs: `DEMO-PFM-sale-001` … `035`, `DEMO-PFM-rent-001` … `025`. Variety in governorates, areas, feddans, prices, activities, sale terms (cash / installment / exchange), rent availability, crops, facilities. Private pin vs public map set on farm; public API does not expose images (contract) — web uses placeholders.

## 5. Public visibility verification

| Check | Result |
|-------|--------|
| Endpoint | `GET /api/v1/marketplace/farms`, detail `GET /api/v1/marketplace/farms/:slug` |
| In-script `--verify` | Uses `MarketplaceService` (counts `q=[DEMO] PFM`, slug detail, forbidden-field scan, price sort) |
| Local apply run | **Blocked** — `api/dist` was removed by a failed `nest build`; API was not listening on 4001 during this pass |
| E2E (fake Prisma) | **Pass** — filters, pagination, sort, no private fields (`marketplace.e2e-spec.ts`) |

After a successful apply on loopback `farmexit`, re-run with `--verify` or curl:

```bash
curl "http://127.0.0.1:4001/api/v1/marketplace/farms?listingType=sale&q=%5BDEMO%5D%20PFM&pageSize=100"
```

## 6. Idempotency

Designed: second `prepare()` creates zero farms/listings/users; reuses farms by name and listings by `farmId` + `listingType`; refuses non-demo collisions.

**Not executed end-to-end** locally (apply blocked). Logic mirrors `seed-client-demo.cjs` idempotency check.

## 7. Database safety

- `assertLocalDevelopment` from `client-demo-safety.cjs` (loopback MySQL, database `farmexit`, `NODE_ENV=development`).
- `--apply` requires `--confirm-local-development`.
- Hostname + `DATABASE()` must match local machine.
- Only `[DEMO] PFM` farms and matching listing descriptions.
- No truncate/reset; no customer farm updates.
- E2E: `test/setup-env.ts` defaults to `farmexit_test`; fake Prisma (no DB writes).

## 8. Commands

Dry-run (default):

```bash
cd api
npm run seed:public-farms-demo
# or
node scripts/seed-public-farms-demo.cjs --dry-run
```

Apply (local only):

```bash
cd api
npm run build   # must produce api/dist (see blockers)
npm run seed:public-farms-demo -- --apply --confirm-local-development --verify
```

**Never** run apply on `/var/www/farmexit.nodeteam.site` or any non-loopback database.

## 9. E2E failure root cause

1. **ESM:** `@nestjs/testing@12` is `"type": "module"`. Jest 30 must load tests as ESM (`node --experimental-vm-modules`) with `ts-jest` `useESM: true` and `extensionsToTreatAsEsm`.
2. **Globals:** Under ESM, `jest` was undefined in some suites → `test/jest-globals.ts`.
3. **Env:** `test/setup-env.ts` set `NODE_ENV=test` while `.env` had `DEV_FIXED_OTP_ENABLED=true`, which failed `assertDevFixedOtpEnvironment` before tests ran. Fixed by disabling demo OTP flags in setup and allowing `test` in that assertion.

Production error `Must use import to load ES Module: @nestjs/testing/index.js` is the same class of issue: run E2E via `npm run test:e2e` (includes `--experimental-vm-modules`) and the updated `test/jest-e2e.json`.

## 10. Versions (local)

| Tool | Version |
|------|---------|
| Node | v24.21.0 |
| jest | 30.5.2 |
| ts-jest | 29.4.14 |
| @nestjs/core / @nestjs/testing | 12.1.3 |

Engines (`api/package.json`): `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0`.

## 11. Files changed

- `api/scripts/seed-public-farms-demo.cjs` (new)
- `api/scripts/seed-public-farms-demo-apply-dist.mjs` (new)
- `api/scripts/register-dist-resolver.mjs`, `api/scripts/dist-import-resolver.mjs` (new)
- `api/package.json` — `seed:public-farms-demo`
- `api/test/jest-e2e.json` — ESM transform, `jest-globals` setup
- `api/test/jest-globals.ts` (new)
- `api/test/setup-env.ts` — disable fixed OTP flags for tests
- `api/src/modules/auth/dev-fixed-otp.ts` — allow `NODE_ENV=test` when OTP enabled
- `docs/PUBLIC_FARMS_SEED_AND_E2E_REPORT.md` (this file)

## 12. Test results

| Command | Result |
|---------|--------|
| `npm run test:e2e -- test/marketplace.e2e-spec.ts` | **2 passed** |
| `npm run test:e2e -- test/listing-requests.e2e-spec.ts test/listing-reviews.e2e-spec.ts` | **22 passed** |
| `npm run test -- marketplace-query.spec` | **5 passed** |
| `npm run build` / `nest build` | **Failed** (Prisma client / `tsc` errors; `dist/` absent) |
| `npm run typecheck` | **Failed** (pre-existing test/tsconfig issues) |
| Seed `--apply --verify` | **Blocked** (no `dist/`) |

## 13. Remaining blockers

1. **Restore `api/dist`** — run `npm run start:dev` once or fix `nest build` / Prisma generate so apply scripts can load `AppModule` (same blocker affects `seed-client-demo.cjs --apply`).
2. **Apply + HTTP verify** — after dist exists, run apply with `--verify`, then spot-check website marketplace cards.
3. **Production E2E** — use `farmexit_test` (or disposable DB); never production `farmexit`. Ensure server uses Node 24+ and `npm run test:e2e` from `api/`.
4. **Optional:** add `tsx` as devDependency only if you prefer TS apply entry over `apply-dist.mjs`.

## 14. Safe staging deployment

- Do **not** run `seed:public-farms-demo` on staging/production.
- Deploy API/website as usual; marketplace content must be real approved listings or a separately labeled demo environment.
- To test ESM E2E on a server: clone repo, `cd api`, `npm ci`, set `DATABASE_URL` to disposable test DB, `npm run test:e2e` (not against production data).
- Port **4000** not used; local API per project convention is **4001** when configured.
