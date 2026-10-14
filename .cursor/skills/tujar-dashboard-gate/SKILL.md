---
name: tujar-dashboard-gate
description: Exact commands to verify the Tujar-misr admin dashboard (tests, typecheck, lint, format, build) with minimal runs. Use when finishing or verifying admin-dashboard work.
---

# Tujar dashboard verification

Directory: `admin-dashboard/`. Shell is PowerShell.

## While working (targeted only)
```powershell
cd "D:\work native\Tujar-misr\admin-dashboard"; $env:NODE_EXTRA_CA_CERTS='D:\work native\Tujar-misr\docker\certs\local-intercept-ca.crt'; npx vitest run src/features/<feature>
```

## Final gate (run once, single command)
```powershell
cd "D:\work native\Tujar-misr\admin-dashboard"; $env:NODE_EXTRA_CA_CERTS='D:\work native\Tujar-misr\docker\certs\local-intercept-ca.crt'; npx prettier --write <changed paths>; npm test; if ($?) { npm run typecheck }; if ($?) { npm run lint }; if ($?) { npm run format:check }; if ($?) { npm run build }; "BUILD_EXIT=$LASTEXITCODE"
```
- If it is backgrounded, wait for `BUILD_EXIT=` once; do not poll.
- On failure, fix and re-run only the failed step, then the gate once more.

## Project constraints
- Do not modify the backend unless asked. Never alter old migrations.
- Never print `DEMO_ADMIN_PASSWORD` or any secret; never hardcode credentials.
- `i18n/messages/ar.ts` is the source; `en.ts` must have identical keys.
- Don't report success unless every step passes.
