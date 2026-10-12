// RTL foundation check for hand-written CSS: physical properties are rejected where a logical
// equivalent exists. Generated tokens.css is skipped. Part of `npm run lint`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const SKIP = new Set(['src/styles/tokens.css']);
const RULES = [
  [/\b(margin|padding|border|scroll-margin|scroll-padding)-(left|right)\b/, 'use *-inline-start / *-inline-end'],
  [/(^|[\s;{])(left|right)\s*:/, 'use inset-inline-start / inset-inline-end'],
  [/\btext-align\s*:\s*(left|right)\b/, 'use text-align: start / end'],
  [/\bfloat\s*:\s*(left|right)\b/, 'use float: inline-start / inline-end'],
  [/\bborder-(top|bottom)-(left|right)-radius\b/, 'use border-start-start-radius etc.'],
];

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.css')) files.push(p);
  }
};
walk(join(root, 'src'));

const problems = [];
for (const file of files) {
  const rel = relative(root, file).replaceAll('\\', '/');
  if (SKIP.has(rel)) continue;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const [re, hint] of RULES) if (re.test(line)) problems.push(`${rel}:${i + 1}  ${line.trim()}  → ${hint}`);
    });
}

if (problems.length) {
  console.error(`Physical-direction CSS found (${problems.length}):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`check-direction: ${files.length} CSS file(s) OK`);
