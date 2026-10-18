import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sessionSrc = readFileSync(join(root, 'src/lib/admin/session.server.ts'), 'utf8');

const forbidden = [/cookies\(\)[\s\S]*?\.set\(/, /cookies\(\)[\s\S]*?\.delete\(/, /clearAdminSessionCookies/, /setAdminTokenCookies/];
for (const pattern of forbidden) {
  if (pattern.test(sessionSrc)) {
    console.error('check-session-readonly: session.server.ts must not mutate cookies');
    process.exit(1);
  }
}

console.log('check-session-readonly: OK');
