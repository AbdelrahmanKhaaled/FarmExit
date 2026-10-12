// Generates src/styles/tokens.css from tokens/figma-variables.json.
// The JSON is a verbatim extract of the FarmExit Figma variables and styles, so the
// app never depends on Figma at build time or runtime. Run: `npm run tokens`.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(root, 'tokens/figma-variables.json'), 'utf8'));
const { collections, textStyles, effectStyles } = src;

// ---------- naming ----------
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[\/\s]+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '');
const primVar = (name) => `--fx-${slug(name)}`;
const resolveColor = (v) => (typeof v === 'string' && v.startsWith('@') ? `var(${primVar(v.slice(1))})` : v);
const px = (n) => (n === 0 ? '0' : `${n}px`);

// Technical mapping (not a Figma value): Figma style names → CSS weights.
const WEIGHT = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800 };
// Technical mapping: Figma BACKGROUND_BLUR radius → CSS blur(). Figma's radius is
// twice the CSS standard deviation; verify against Figma in the visual comparison.
const cssBlur = (radius) => radius / 2;

const out = [];
const push = (s = '') => out.push(s);

push('/*');
push(' * FarmExit design tokens — GENERATED FILE, do not edit by hand.');
push(` * Source: Figma file ${src.$source.fileKey}, extracted ${src.$source.extractedAt}.`);
push(' * Regenerate with `npm run tokens` (scripts/build-tokens.mjs).');
push(' */');
push();

// ---------- 1. Primitives + responsive + language (plain custom properties) ----------
push(':root {');
push('  /* Primitives (Figma collection "Primitives") */');
for (const [name, value] of Object.entries(collections.Primitives.vars)) push(`  ${primVar(name)}: ${value};`);

push();
push('  /* Language = English (Figma collection "Language", mode English) */');
const lang = collections.Language.vars;
push(`  --fx-font-family: var(--font-manrope), system-ui, sans-serif;`);
push(`  --fx-font-weight-extrabold: ${WEIGHT[lang['font/style-extrabold'][0]]};`);
for (const [name, [en]] of Object.entries(lang)) {
  if (name.startsWith('tracking/')) push(`  --fx-${slug(name)}: ${px(en)};`);
}

push();
push('  /* Responsive = Mobile 390 (Figma collection "Responsive"); larger modes below */');
const responsive = collections.Responsive.vars;
const modeIndex = { desktop: 0, tablet: 1, mobile: 2 };
const unitless = new Set(['layout/columns', 'layout/card-columns']);
const respValue = (name, i) => (unitless.has(name) ? String(responsive[name][i]) : px(responsive[name][i]));
for (const name of Object.keys(responsive)) push(`  --fx-${slug(name)}: ${respValue(name, modeIndex.mobile)};`);
push('}');
push();

// Breakpoint thresholds are a technical decision: Figma only defines the 390 / 1024 / 1440 frames.
const BREAKPOINTS = { tablet: 768, desktop: 1280 };
for (const mode of ['tablet', 'desktop']) {
  push(`@media (width >= ${BREAKPOINTS[mode]}px) {`);
  push('  :root {');
  for (const name of Object.keys(responsive)) push(`    --fx-${slug(name)}: ${respValue(name, modeIndex[mode])};`);
  push('  }');
  push('}');
  push();
}

push('/* Language = Arabic (Figma collection "Language", mode Arabic) */');
push(':root:lang(ar) {');
push(`  --fx-font-family: var(--font-plex-arabic), system-ui, sans-serif;`);
push(`  --fx-font-weight-extrabold: ${WEIGHT[lang['font/style-extrabold'][1]]};`);
for (const [name, [, ar]] of Object.entries(lang)) {
  if (name.startsWith('tracking/')) push(`  --fx-${slug(name)}: ${px(ar)};`);
}
push('}');
push();

// ---------- 2. Tailwind theme (utilities) ----------
push('@theme {');
push('  /* Only Figma tokens are available as Tailwind theme values. */');
push('  --color-*: initial;');
push('  --radius-*: initial;');
push('  --shadow-*: initial;');
push('  --blur-*: initial;');
push('  --text-*: initial;');
push('  --font-serif: initial;');
push('  --font-mono: initial;');
push('  --breakpoint-*: initial;');
push();
push('  /* 1 spacing unit = 1px, so `p-24` equals Figma space/24 (technical mapping). */');
push('  --spacing: 1px;');
push();
push(`  --breakpoint-tablet: ${BREAKPOINTS.tablet}px;`);
push(`  --breakpoint-desktop: ${BREAKPOINTS.desktop}px;`);
push();
push('  --font-sans: var(--fx-font-family);');
push('  --font-quote: var(--font-playfair), serif;');
push('  --font-weight-extrabold: var(--fx-font-weight-extrabold);');
push();
push('  /* Colors (Figma collection "Color", mode Light) */');
push('  --color-white: var(--fx-white);');
push('  --color-black: var(--fx-black);');
for (const [name, value] of Object.entries(collections.Color.vars))
  push(`  --color-${slug(name)}: ${resolveColor(value)};`);
push();
push('  /* Radius (Figma collection "Radius") */');
for (const [name, value] of Object.entries(collections.Radius.vars))
  push(`  --radius-${slug(name.replace('radius/', ''))}: ${px(value)};`);
push();
push('  /* Spacing — named layout values (Figma collection "Spacing") */');
for (const [name, value] of Object.entries(collections.Spacing.vars)) {
  if (name.startsWith('layout/')) push(`  --spacing-${slug(name.replace('layout/', ''))}: ${px(value)};`);
}
push('  /* Spacing — responsive layout values (Figma collection "Responsive") */');
for (const name of Object.keys(responsive)) {
  if (name.startsWith('layout/') && !unitless.has(name)) {
    push(`  --spacing-r-${slug(name.replace('layout/', ''))}: var(--fx-${slug(name)});`);
  }
}
push();

// Effects
const parseEffect = (e) => {
  const p = e.split(' ');
  if (p[0] === 'BACKGROUND_BLUR') return { type: 'blur', radius: Number(p[1]) };
  const [, x, y, blur, spread, color] = p;
  return { type: 'shadow', css: `${px(+x)} ${px(+y)} ${px(+blur)} ${px(+spread)} ${color}` };
};
const effects = Object.entries(effectStyles)
  .filter(([k]) => !k.startsWith('$'))
  .map(([name, list]) => {
    const parsed = list.map(parseEffect);
    return {
      name: slug(name.split('/').pop()),
      group: name,
      shadow: parsed
        .filter((e) => e.type === 'shadow')
        .map((e) => e.css)
        .join(', '),
      blur: parsed.find((e) => e.type === 'blur')?.radius,
    };
  });
push('  /* Effects (Figma effect styles) */');
for (const e of effects) {
  if (e.shadow) push(`  --shadow-${e.name}: ${e.shadow};`);
  if (e.blur !== undefined) push(`  --blur-${e.name}: ${cssBlur(e.blur)}px; /* Figma radius ${e.blur} */`);
}
push('}');
push();

// Combined effect utilities (shadow + background blur in one Figma style)
push('/* Figma effect styles as single utilities: effect-<name> */');
for (const e of effects) {
  push(`@utility effect-${e.name} {`);
  if (e.shadow) push(`  box-shadow: var(--shadow-${e.name});`);
  if (e.blur !== undefined) {
    push(`  -webkit-backdrop-filter: blur(var(--blur-${e.name}));`);
    push(`  backdrop-filter: blur(var(--blur-${e.name}));`);
  }
  push('}');
}
push();

// ---------- 3. Text styles → type-* utilities ----------
const manifestText = [];
push('/* Figma text styles as utilities: type-<group>-<name> */');
for (const [name, def] of Object.entries(textStyles)) {
  if (name.startsWith('$')) continue;
  const [family, style, size, lineHeight, letterSpacing, textCase, boundRaw] = def.split('|');
  const bound = Object.fromEntries(
    boundRaw
      .split(',')
      .filter(Boolean)
      .map((b) => b.split('=')),
  );
  let fontFamily;
  if (bound.fontFamily) fontFamily = 'var(--fx-font-family)';
  else if (family === 'IBM Plex Sans Arabic') fontFamily = 'var(--font-plex-arabic), system-ui, sans-serif';
  else if (family === 'Playfair Display') fontFamily = 'var(--font-quote)';
  else fontFamily = 'var(--fx-font-family)';

  const fontSize = bound.fontSize ? `var(--fx-${slug(bound.fontSize)})` : px(Number(size));
  const fontWeight = bound.fontStyle ? 'var(--fx-font-weight-extrabold)' : WEIGHT[style];
  const lh =
    lineHeight === 'auto' ? 'normal' : lineHeight.endsWith('%') ? String(parseFloat(lineHeight) / 100) : lineHeight;
  let ls;
  if (bound.letterSpacing) ls = `var(--fx-${slug(bound.letterSpacing)})`;
  else if (letterSpacing.endsWith('%')) {
    const v = parseFloat(letterSpacing) / 100;
    ls = v === 0 ? '0' : `${v}em`;
  } else ls = letterSpacing;

  push(`@utility type-${slug(name)} {`);
  push(`  font-family: ${fontFamily};`);
  push(`  font-size: ${fontSize};`);
  push(`  font-weight: ${fontWeight};`);
  push(`  line-height: ${lh};`);
  push(`  letter-spacing: ${ls};`);
  if (textCase === 'UPPER') push('  text-transform: uppercase;');
  push('}');
  manifestText.push({
    figma: name,
    className: `type-${slug(name)}`,
    spec: `${family} ${style} ${size}${bound.fontSize ? ` (responsive: ${bound.fontSize})` : ''} · line ${lineHeight} · tracking ${letterSpacing}${bound.letterSpacing ? ` (${bound.letterSpacing})` : ''}${textCase === 'UPPER' ? ' · uppercase' : ''}`,
  });
}
push();

writeFileSync(join(root, 'src/styles/tokens.css'), out.join('\n'));

// ---------- 4. Manifest for the dev-only Token Preview ----------
// Class names are written as string literals so Tailwind's source scanner generates them.
const hexOf = (v) => (typeof v === 'string' && v.startsWith('@') ? collections.Primitives.vars[v.slice(1)] : v);
const manifest = {
  primitives: Object.entries(collections.Primitives.vars).map(([name, value]) => ({
    figma: name,
    cssVar: primVar(name),
    value,
  })),
  colors: Object.entries(collections.Color.vars).map(([name, value]) => ({
    figma: name,
    cssVar: `--color-${slug(name)}`,
    value: hexOf(value),
    alias: typeof value === 'string' && value.startsWith('@') ? value.slice(1) : null,
  })),
  spacing: Object.entries(collections.Spacing.vars)
    .filter(([name]) => name.startsWith('space/'))
    .map(([name, value]) => ({ figma: name, value }))
    .sort((a, b) => a.value - b.value),
  layout: Object.entries(collections.Spacing.vars)
    .filter(([name]) => name.startsWith('layout/'))
    .map(([name, value]) => ({ figma: name, value })),
  responsive: Object.entries(responsive).map(([name, [desktop, tablet, mobile]]) => ({
    figma: name,
    cssVar: `--fx-${slug(name)}`,
    desktop,
    tablet,
    mobile,
  })),
  radius: Object.entries(collections.Radius.vars).map(([name, value]) => ({
    figma: name,
    className: `rounded-${slug(name.replace('radius/', ''))}`,
    value,
  })),
  text: manifestText,
  effects: effects.map((e) => ({ figma: e.group, className: `effect-${e.name}`, hasBlur: e.blur !== undefined })),
  language: Object.entries(lang).map(([name, [en, ar]]) => ({ figma: name, en, ar })),
};
writeFileSync(
  join(root, 'src/styles/token-manifest.generated.ts'),
  `// GENERATED by scripts/build-tokens.mjs from tokens/figma-variables.json. Do not edit.\n` +
    `export const tokenManifest = ${JSON.stringify(manifest, null, 2)} as const;\n`,
);
console.log(
  `tokens.css written: ${Object.keys(collections.Primitives.vars).length} primitives, ` +
    `${Object.keys(collections.Color.vars).length} colors, ${Object.keys(textStyles).length - 1} text styles, ` +
    `${effects.length} effects`,
);
