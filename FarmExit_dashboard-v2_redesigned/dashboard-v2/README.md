# FarmExit Admin Dashboard

Independent Next.js app for FarmExit **admin** staff (`staff_role = admin` only).

- Dev: `npm run dev` → http://localhost:3003
- Locale routes: `/en/admin`, `/en/admin/login`, `/ar/admin`, …
- API: set `FARMEXIT_API_URL` (see `.env.example`); backend must allow this origin in `CORS_ORIGINS`.

```bash
npm ci
cp .env.example .env
# From repo root: provision first admin (dev only), then OTP login
npm run admin:bootstrap -- --mobile 01012345678 --name "FarmExit Admin"
npm run dev
```
