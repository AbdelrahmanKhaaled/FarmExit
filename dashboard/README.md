# FarmExit approved Admin Dashboard V2

The sole maintained dashboard is now at root `dashboard/`. Run `npm run dev:dashboard` from the repository root or `npm run dev` here; the local port is 3003.

Staff sign in with existing email/password credentials at `/en/admin/login` or `/ar/admin/login`. Existing role and permission checks govern each console route.

Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:unit`, and `npm run build` here. Copy `.env.example` to a private local environment file if needed; never commit secrets. The default API is `https://farmexit.nodeteam.site/api/v1`; realtime origin is `https://farmexit.nodeteam.site`.

Vercel Root Directory: `dashboard`; framework: Next.js; install: `npm ci`; build: `npm run build`. Website remains rooted at `web`. See `../docs/FARMEXIT_PRODUCTION_BACKEND_DEPLOYMENT_PLAN.md` for the backend NO-GO and `../docs/FARMEXIT_CANONICAL_DASHBOARD_GITHUB_REPORT.md` for relocation evidence. Historical reports retain the paths used when written.
