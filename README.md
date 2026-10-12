# FarmExit

| Folder  | What                              | Details                                        |
| ------- | --------------------------------- | ---------------------------------------------- |
| `web/`  | Next.js frontend (EN/AR)          | [web/README.md](web/README.md)                 |
| `api/`  | NestJS REST API, MySQL via Prisma | [docs/BACKEND_RULES.md](docs/BACKEND_RULES.md) |
| `docs/` | Backend rules, ERD (`docs/erd/`)  |                                                |

Each app has its own `package.json` and `package-lock.json` (no npm workspaces). Node.js 22.22+ or 24.15+ (LTS); Docker for the local database.

## Setup

```bash
npm run setup                       # root tools + web and api dependencies (api also generates the Prisma client)
cp .env.example .env                # MySQL settings for docker-compose (choose your own passwords)
cp api/.env.example api/.env        # API settings; DATABASE_URL must match .env
npm run db:up                       # start local MySQL 8.4
```

## Run

| Command                                       | What                                         |
| --------------------------------------------- | -------------------------------------------- |
| `npm run dev`                                 | web (http://localhost:3000) and api together |
| `npm run dev:web` / `npm run dev:api`         | one app                                      |
| `npm run build` (`build:web`, `build:api`)    | production builds                            |
| `npm run start:web` / `npm run start:api`     | run the production builds                    |
| `npm run typecheck` / `lint` / `format:check` | both apps (`:web` / `:api` variants for one) |
| `npm run test:api` / `npm run test:api:e2e`   | API unit / e2e tests (no database needed)    |
| `npm run test:web`                            | frontend Playwright tests                    |
| `npm test`                                    | all of the above                             |
| `npm run db:up` / `db:down` / `db:logs`       | local MySQL (docker compose)                 |
| `npm run prisma:generate`                     | regenerate the Prisma client                 |

API: http://localhost:4000/api/v1 · health `GET /api/v1/health` · Swagger http://localhost:4000/api/docs
(development only by default).
