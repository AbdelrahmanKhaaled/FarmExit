# FarmExit

| Folder  | What                              | Details                                        |
| ------- | --------------------------------- | ---------------------------------------------- |
| `web/`  | Next.js frontend (EN/AR)          | [web/README.md](web/README.md)                 |
| `api/`  | NestJS REST API, MySQL via Prisma | [docs/BACKEND_RULES.md](docs/BACKEND_RULES.md) |
| `docs/` | Backend rules, ERD (`docs/erd/`)  |                                                |

Each app has its own `package.json` and `package-lock.json` (no npm workspaces). Node.js 22.22+ or 24.15+ (LTS). Local MySQL 8.0+ via **Laragon** (or any host on `127.0.0.1:3306`).

## Setup

```bash
npm run setup                       # root tools + web and api dependencies (api also generates the Prisma client)
cp api/.env.example api/.env        # set DATABASE_URL + SHADOW_DATABASE_URL (see below; never commit .env)
```

`api/.env` must exist before `npm --prefix api ci` / `prisma generate` (Prisma 7 reads both URLs from `prisma.config.ts`).

### Laragon Setup (Windows)

1. Start **MySQL** in Laragon (`127.0.0.1:3306`).
2. As MySQL root, create `farmexit` and `farmexit_shadow` databases (`utf8mb4` charset, `utf8mb4_0900_ai_ci` collation) and a dedicated app user with grants on those schemas:
   ```sql
   CREATE DATABASE IF NOT EXISTS farmexit CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE DATABASE IF NOT EXISTS farmexit_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE USER IF NOT EXISTS 'farmexit'@'127.0.0.1' IDENTIFIED BY '<your-password>';
   GRANT ALL PRIVILEGES ON farmexit.* TO 'farmexit'@'127.0.0.1';
   GRANT ALL PRIVILEGES ON farmexit_shadow.* TO 'farmexit'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```
3. Configure `api/.env`:
   - `DATABASE_URL=mysql://<user>:<password>@127.0.0.1:3306/farmexit`
   - `SHADOW_DATABASE_URL=mysql://<user>:<password>@127.0.0.1:3306/farmexit_shadow`
4. Apply migrations and seed development data:
   - `npx --prefix api prisma migrate deploy`
   - `npm run prisma:seed`
5. Verify: `npm --prefix api run prisma:validate` and `RUN_DB_INTEGRATION=1 npm run test:api:integration`.

If `npm ci` fails with TLS/certificate errors on Windows, try once: `set NODE_OPTIONS=--use-system-ca` (cmd) or `$env:NODE_OPTIONS='--use-system-ca'` (PowerShell).

## Run

| Command                                             | What                                                         |
| --------------------------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                                       | web (http://localhost:3000) and api together                 |
| `npm run dev:web` / `npm run dev:api`               | one app                                                      |
| `npm run build` (`build:web`, `build:api`)          | production builds                                            |
| `npm run start:web` / `npm run start:api`           | run the production builds                                    |
| `npm run typecheck` / `lint` / `format:check`       | both apps (`:web` / `:api` variants for one)                 |
| `npm run test:api` / `npm run test:api:e2e`         | API unit / e2e tests (no database needed)                    |
| `RUN_DB_INTEGRATION=1 npm run test:api:integration` | Live MySQL check via Prisma (requires MySQL up and `api/.env`)|
| `npm run test:web`                                  | frontend Playwright tests                                    |
| `npm test`                                          | all of the above                                             |
| `npm run prisma:generate`                           | regenerate the Prisma client                                 |
| `npm run prisma:seed`                               | run development database seed                                |

API: http://localhost:4000/api/v1 · health `GET /api/v1/health` · Swagger http://localhost:4000/api/docs
(development only by default).
