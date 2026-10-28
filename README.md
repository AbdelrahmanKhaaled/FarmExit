# FarmExit

| Folder        | Application              | Purpose |
| ------------- | ------------------------ | ------- |
| `api/`        | NestJS REST API          | Auth, Prisma/MySQL, all business logic (`/api/v1`) |
| `dashboard/`  | Next.js admin dashboard  | FarmExit **admin** staff only — operations, overview, future admin modules |
| `web/`        | Next.js public website   | Marketplace, EN/AR site, user-facing flows (not admin) |
| `docs/`       | Documentation            | [BACKEND_RULES.md](docs/BACKEND_RULES.md), ERD |

Each app has its own `package.json` and `package-lock.json` (no npm workspaces). Node.js 22.22+ or 24.15+ (LTS). Local MySQL 8.0+ via **Laragon** (or any host on `127.0.0.1:3306`).

## Folder structure

```
FarmExit/
├── api/           # NestJS backend
├── dashboard/     # Admin Next.js app (port 3003)
├── web/           # Public Next.js app (port 3000)
├── docs/
├── package.json   # Root orchestration scripts
└── README.md
```

## Setup

```bash
npm run setup
cp api/.env.example api/.env          # DATABASE_URL, secrets, CORS (see below)
cp dashboard/.env.example dashboard/.env   # optional; FARMEXIT_API_URL
```

`api/.env` must exist before `npm --prefix api ci` / `prisma generate`.

### Laragon (Windows)

1. Start **MySQL** (`127.0.0.1:3306`).
2. Create `farmexit` and `farmexit_shadow` databases and an app user (see previous README SQL).
3. Configure `api/.env` with `DATABASE_URL` and `SHADOW_DATABASE_URL`.
4. `npx --prefix api prisma migrate deploy` and `npm run prisma:seed`.

## Local ports

| Service            | URL |
| ------------------ | --- |
| Public website     | http://localhost:3000 |
| Admin dashboard    | http://localhost:3003 (`/en/admin/login`) |
| API                | http://localhost:4001/api/v1 |
| API Swagger (dev)  | http://localhost:4001/api/docs |

The API keeps the existing local **port 4001** (see `api/.env` `PORT`). Frontends call the API via `FARMEXIT_API_URL` (dashboard) or server integrations in `web` — never MySQL from the browser.

### CORS

Browser requests from the dashboard run on a separate origin. Include both frontends in `api/.env`:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3003
```

## Development

| Command | What |
| ------- | ---- |
| `npm run dev:api` | NestJS watch mode |
| `npm run dev:web` | Public site |
| `npm run dev:dashboard` | Admin dashboard |
| `npm run dev` | **web + api** together (dashboard separate) |
| `npm run admin:bootstrap -- --mobile … --name "…"` | Provision first dev admin (CLI, not production) |
| `npm run dev:fix-mobiles` | Audit Egyptian mobiles (dry-run); `-- --apply --confirm` to fix synthetic dev users only |

## Build

```bash
npm run build:api
npm run build:web
npm run build:dashboard
# or
npm run build
```

## Quality checks

```bash
npm run typecheck      # web + dashboard + api
npm run lint
npm run test:api
npm run test:web
npm run test:dashboard
```

## API access

- **Dashboard**: Email/password JWT via Next.js BFF routes under `dashboard/src/app/api/admin/auth/*`; approved staff roles enter permission-scoped routes.
- **Website**: public and user flows only; no admin console routes in `web/`.

Health: `GET http://localhost:4001/api/v1/health`

### First local admin (development)

The seed creates demo users and a **case agent**, not an admin. Provision the first admin explicitly (refused when `NODE_ENV=production`):

```bash
npm run admin:bootstrap -- --mobile 01012345678 --name "FarmExit Admin"
```

Then start `npm run dev:api` and `npm run dev:dashboard`, open http://localhost:3003/en/admin/login, request an OTP for that mobile.

**OTP in development:** either read the code from the API console (`DEV ONLY: OTP for …` with `SMS_PROVIDER=development`), or enable fixed OTP in `api/.env` only:

```env
DEV_FIXED_OTP_ENABLED=true
DEV_FIXED_OTP_CODE=123456
DEV_FIXED_OTP_ALLOWED_MOBILES=+201012345678
```

Fixed OTP still requires `POST /auth/otp/request` first; it is allowlisted-mobile only and is **blocked when `NODE_ENV=production`**.

## Approved dashboard and deployment

The only maintained admin app is `dashboard` (port 3003). Root dashboard commands target this directory. The approved V2 was relocated into this root directory; legacy implementations remain retired. Historical reports retain their original paths.

For the dashboard Vercel project, set Root Directory to `dashboard`, use its package-lock with `npm ci`, and build with `npm run build`. Set `FARMEXIT_API_URL` and `NEXT_PUBLIC_FARMEXIT_API_URL` to `https://farmexit.nodeteam.site/api/v1`, and `NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN` to `https://farmexit.nodeteam.site`. Redeploy after changing public environment variables. Keep the Website project rooted at `web`. No hosted project settings were changed by this repository consolidation.
