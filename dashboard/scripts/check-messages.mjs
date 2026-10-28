// Verifies that every locale has every namespace and the same keys as English (the reference).
// Part of `npm run lint`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'messages');
const REFERENCE = 'en';
const locales = readdirSync(dir);

const keys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const load = (locale) =>
  Object.fromEntries(
    readdirSync(join(dir, locale))
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(join(dir, locale, f), 'utf8'))]),
  );

const ref = load(REFERENCE);
const problems = [];
for (const locale of locales.filter((l) => l !== REFERENCE)) {
  const msgs = load(locale);
  for (const ns of Object.keys(ref)) {
    if (!msgs[ns]) {
      problems.push(`${locale}: missing namespace "${ns}"`);
      continue;
    }
    const have = new Set(keys(msgs[ns]));
    for (const k of keys(ref[ns])) if (!have.has(k)) problems.push(`${locale}: missing key ${ns}.${k}`);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`check-messages: ${Object.keys(ref).length} namespaces × ${locales.length} locales OK`);
