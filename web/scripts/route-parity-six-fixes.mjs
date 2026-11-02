import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
function routes(dir, parts = []) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? routes(path.join(dir, entry.name), [...parts, entry.name])
      : entry.name === 'page.tsx'
        ? ['/' + parts.filter((p) => !p.startsWith('(')).join('/')]
        : [],
  );
}
const results = [];
for (const [app, base, prefix] of [
  ['web', 'http://127.0.0.1:3499', '/my'],
  ['dashboard', 'http://127.0.0.1:3599', '/admin'],
]) {
  for (const route of routes(path.join(root, app, 'src/app/[locale]'))) {
    const protectedRoute = route.startsWith(prefix) && !['/admin/login', '/admin/forbidden'].includes(route);
    const entry = { app, route, sharedLocaleSource: true, protectedRoute, en: null, ar: null };
    // Only exercise protected URLs as guests. Public content needs representative data and is inventoried, not marked passed.
    if (protectedRoute)
      for (const locale of ['en', 'ar']) {
        const url = `${base}/${locale}${route.replace(/\[.*?\]/g, '901')}`;
        try {
          const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
          const body = await response.text();
          const login = response.headers.get('location') || body.match(/(?:sign-in|admin\/login)/)?.[0];
          entry[locale] = { status: response.status, loginGuardObserved: Boolean(login), guestOnly: true };
        } catch (error) {
          entry[locale] = { error: error.message };
        }
      }
    results.push(entry);
  }
}
const out = path.join(root, 'docs/evidence/six-fixes');
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'route-parity.json'), JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    {
      total: results.length,
      protected: results.filter((r) => r.protectedRoute).length,
      failures: results
        .filter((r) => r.protectedRoute && [r.en, r.ar].some((l) => l?.error || !l?.loginGuardObserved))
        .map((r) => `${r.app}:${r.route}`),
      limitation: 'Guest guards and shared source inventory only; authenticated parity is not proven for all routes.',
    },
    null,
    2,
  ),
);
