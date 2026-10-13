# FarmExit

| Folder  | What                              | Details                                        |
| ------- | --------------------------------- | ---------------------------------------------- |
| `web/`  | Next.js frontend (EN/AR)          | [web/README.md](web/README.md)                 |
| `api/`  | NestJS REST API, MySQL via Prisma | [docs/BACKEND_RULES.md](docs/BACKEND_RULES.md) |
| `docs/` | Backend rules, ERD (`docs/erd/`)  |                                                |

Each app has its own `package.json` and `package-lock.json` (no npm workspaces). Node.js 22.22+ or 24.15+ (LTS). Local MySQL 8.4 via **Docker** or **Laragon** (or any host on `127.0.0.1:3306`).

## Setup

```bash
npm run setup                       # root tools + web and api dependencies (api also generates the Prisma client)
cp api/.env.example api/.env        # set DATABASE_URL + SHADOW_DATABASE_URL (see below; never commit .env)
```

`api/.env` must exist before `npm --prefix api ci` / `prisma generate` (Prisma 7 reads both URLs from `prisma.config.ts`).

### Laragon (Windows, no Docker)

1. Start **MySQL 8.4** in Laragon (`127.0.0.1:3306`).
2. As MySQL root, create `farmexit` and `farmexit_shadow` (`utf8mb4`) and a dedicated app user with grants on those schemas only — SQL in `docker/mysql/init/01-shadow-database.sql` (adjust the user name/password to match `api/.env`).
3. Point Prisma at Laragon (not Docker), for example:
   - `DATABASE_URL=mysql://<user>:<password>@127.0.0.1:3306/farmexit`
   - `SHADOW_DATABASE_URL=mysql://<user>:<password>@127.0.0.1:3306/farmexit_shadow`
4. Verify: `npm --prefix api run prisma:validate` and `RUN_DB_INTEGRATION=1 npm run test:api:integration`.

If `npm ci` fails with TLS/certificate errors on Windows, try once: `set NODE_OPTIONS=--use-system-ca` (cmd) or `$env:NODE_OPTIONS='--use-system-ca'` (PowerShell).

### Docker (optional)

```bash
cp .env.example .env                # MySQL settings for docker-compose (choose your own passwords)
# align api/.env DATABASE_URL / SHADOW_DATABASE_URL with the same user and password
npm run db:up                       # MySQL 8.4; farmexit_shadow on first volume init
```

If MySQL already had a data volume from before the shadow init script, create `farmexit_shadow` once (as root) instead of resetting the volume — see `docker/mysql/init/01-shadow-database.sql`.

## Run

| Command                                       | What                                         |
| --------------------------------------------- | -------------------------------------------- |
| `npm run dev`                                 | web (http://localhost:3000) and api together |
| `npm run dev:web` / `npm run dev:api`         | one app                                      |
| `npm run build` (`build:web`, `build:api`)    | production builds                            |
| `npm run start:web` / `npm run start:api`     | run the production builds                    |
| `npm run typecheck` / `lint` / `format:check` | both apps (`:web` / `:api` variants for one) |
| `npm run test:api` / `npm run test:api:e2e`   | API unit / e2e tests (no database needed)    |
| `RUN_DB_INTEGRATION=1 npm run test:api:integration` | Live MySQL check via Prisma (requires MySQL up and `api/.env`) |
| `npm run test:web`                            | frontend Playwright tests                    |
| `npm test`                                    | all of the above                             |
| `npm run db:up` / `db:down` / `db:logs`       | local MySQL (docker compose)                 |
| `npm run prisma:generate`                     | regenerate the Prisma client                 |

API: http://localhost:4000/api/v1 · health `GET /api/v1/health` · Swagger http://localhost:4000/api/docs
(development only by default).
