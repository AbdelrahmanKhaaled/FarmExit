import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../../', import.meta.url);
const output = new URL('artifacts/farm-details-phase4-1/', root);
const metrics = [];
const views = [
  [1440, 'Desktop 1440'],
  [1024, 'Tablet 1024'],
  [390, 'Mobile 390'],
];
for (const [width, name] of views) {
  const reference = await readFile(new URL(`figma-baselines/farm-details/${name}.png`, root));
  const actual = await readFile(new URL(`after-en-${width}.png`, output));
  const before = await sharp(fileURLToPath(new URL(`before-en-${width}.png`, output))).metadata();
  const ref = await sharp(reference).metadata();
  const rendered = await sharp(actual).metadata();
  if (ref.width !== width || rendered.width !== width) throw new Error(`Wrong capture width for ${width}`);
  const height = Math.max(ref.height, rendered.height);
  const raw = async (input, h) =>
    sharp(input)
      .flatten({ background: 'white' })
      .extend({ bottom: height - h, background: 'white' })
      .removeAlpha()
      .raw()
      .toBuffer();
  const a = await raw(reference, ref.height);
  const b = await raw(actual, rendered.height);
  const diff = Buffer.alloc(a.length);
  const overlay = Buffer.alloc(a.length);
  let changed = 0;
  for (let pixel = 0; pixel < a.length; pixel += 3) {
    const differs = Math.max(...[0, 1, 2].map((channel) => Math.abs(a[pixel + channel] - b[pixel + channel]))) > 32;
    if (differs) changed++;
    for (let channel = 0; channel < 3; channel++) {
      diff[pixel + channel] = differs ? (channel === 0 ? 220 : 30) : Math.round(a[pixel + channel] * 0.25 + 190);
      overlay[pixel + channel] = Math.round((a[pixel + channel] + b[pixel + channel]) / 2);
    }
  }
  await sharp(diff, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(fileURLToPath(new URL(`diff-${width}.png`, output)));
  await sharp(overlay, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(fileURLToPath(new URL(`overlay-${width}.png`, output)));
  metrics.push({
    width,
    referenceHeight: ref.height,
    beforeHeight: before.height,
    renderedHeight: rendered.height,
    topAlignedPixelsOver32Difference: changed,
    comparedPixels: width * height,
    changedPercent: Number(((100 * changed) / (width * height)).toFixed(2)),
  });
}
await writeFile(
  new URL('comparison-metrics.json', output),
  JSON.stringify(
    {
      method:
        'Unscaled, top-aligned RGB comparison; shorter image padded white. Any channel difference >32 marks a pixel red. Known asset, Score, content and clipping differences are included. This is not a passing visual threshold.',
      metrics,
    },
    null,
    2,
  ),
);
await writeFile(
  new URL('comparison.html', output),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phase 4.1 populated Farm Details</title>
<style>body{font:16px system-ui;margin:24px;color:#17211b;background:#eee}section{margin:32px 0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}figure{margin:0;background:white}figcaption{padding:12px}img{display:block;width:100%;height:auto}a{color:#166534}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style>
<h1>Phase 4.1 — populated fixture comparisons</h1><p>Local test-only samples; no database or production fixture insertion. Score and offer actions remain enabled. Two existing local images differ from Figma. The clipped mobile facilities reference is not recreated.</p>
${views
  .map(
    ([
      w,
      name,
    ]) => `<section><h2>${name}</h2><p><a href="overlay-${w}.png">50% overlay</a> · <a href="diff-${w}.png">Raw difference map</a> · <a href="after-ar-${w}.png">Arabic responsive capture</a></p><div class="grid">
<figure><figcaption>Figma reference</figcaption><img src="../../figma-baselines/farm-details/${name}.png" alt="${name} Figma"></figure>
<figure><figcaption>Populated before</figcaption><img src="before-en-${w}.png" alt="${name} before"></figure>
<figure><figcaption>Populated after</figcaption><img src="after-en-${w}.png" alt="${name} after"></figure></div></section>`,
  )
  .join('')}
<p><a href="comparison-metrics.json">Comparison method and metrics</a></p></html>`,
);
console.log(JSON.stringify(metrics));
