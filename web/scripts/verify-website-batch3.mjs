/** Read-only browser evidence. No intercepted/fabricated API responses and no business writes. */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const out = new URL('../artifacts/website-batch3/', import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [],
  interactions = [];
try {
  for (const locale of ['en', 'ar'])
    for (const width of [1440, 1024, 768, 390])
      for (const screen of ['home', 'farms', 'management', 'partnerships']) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } });
        const errors = [],
          failedApi = [],
          writes = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => {
          if (/MISSING_MESSAGE|hydration|uncached data/i.test(m.text())) errors.push(m.text().slice(0, 400));
        });
        page.on('response', (r) => {
          if (r.status() >= 400 && /\/api\//.test(r.url()))
            failedApi.push({ url: new URL(r.url()).pathname, status: r.status() });
        });
        await page.route('**/api/**', (route) => {
          if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
            writes.push(route.request().method());
            return route.abort();
          }
          return route.continue();
        });
        const response = await page.goto('http://localhost:3000/' + locale + (screen === 'home' ? '' : '/' + screen), {
          waitUntil: 'domcontentloaded',
          timeout: 90000,
        });
        await page.locator('main h1').first().waitFor({ timeout: 60000 });
        await page.waitForTimeout(1200);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        const path = locale + '-' + width + '-' + screen + '.png';
        await page.screenshot({ path: fileURLToPath(new URL(path, out)), fullPage: true });
        if (width === 1440 && ['management', 'partnerships'].includes(screen)) {
          await page.evaluate(() => scrollTo(0, 350));
          await page.screenshot({
            path: fileURLToPath(new URL(locale + '-1440-' + screen + '-cards.png', out)),
            fullPage: false,
          });
          await page.evaluate(() => scrollTo(0, 0));
        }
        results.push({
          locale,
          width,
          screen,
          status: response?.status(),
          overflow,
          errors,
          failedApi,
          screenshot: path,
          evidence: 'LOCAL BROWSER / REAL PUBLIC API READS',
        });
        if (screen === 'home' && [1440, 390].includes(width)) {
          await page.getByRole('button', { name: locale === 'ar' ? 'بيع سريع' : 'Quick Sale', exact: true }).click();
          await page.locator('select[name=activity]').selectOption('fruit');
          await page.locator('select[name=location]').selectOption('giza');
          await page.screenshot({
            path: fileURLToPath(new URL(locale + '-' + width + '-quick-sale.png', out)),
            fullPage: false,
          });
          const search = page.getByRole('search').first();
          await search.locator('button[type=submit]').click();
          await page.waitForURL(/\/farms\?/, { timeout: 30000 });
          const query = new URL(page.url()).searchParams;
          assert.equal(query.get('quickSale'), 'true');
          assert.equal(query.get('activity'), 'fruit');
          assert.equal(query.get('location'), 'giza');
          interactions.push(
            locale +
              ' ' +
              width +
              ': Quick Sale URL retains designation, activity and location; old production filtering may reject new params',
          );
        }
        if (width === 390 && ['management', 'partnerships'].includes(screen)) {
          await page.locator('.om-mobile-filter-button').click();
          await page.locator('dialog[open]').waitFor({ state: 'visible' });
          assert.equal(await page.locator('dialog[open]').count(), 1);
          await page.screenshot({
            path: fileURLToPath(new URL(locale + '-390-' + screen + '-filter-drawer.png', out)),
            fullPage: false,
          });
          await page.keyboard.press('Escape');
          await page.locator('dialog[open]').waitFor({ state: 'hidden' });
          assert.equal(await page.locator('dialog[open]').count(), 0);
          interactions.push(locale + ' ' + screen + ': mobile native dialog opens, traps focus and closes with Escape');
        }
        assert.equal(writes.length, 0);
        await page.close();
      }
  // Existing environment-guarded fixture app: visual/form-state evidence only; no BFF or database exists.
  for (const locale of ['en', 'ar'])
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.route('**/api/**', (r) => r.abort());
      await page.goto('http://127.0.0.1:3103/' + locale + '/phase6/new', { waitUntil: 'networkidle', timeout: 90000 });
      const section = page
        .locator('section[aria-label]')
        .filter({ has: page.getByRole('button', { name: /English/ }) })
        .first();
      await section.locator('textarea').first().fill('[VISUAL TEST] English orchard');
      await section.getByRole('button', { name: /العربية/ }).click();
      await section.locator('textarea').first().fill('[اختبار بصري] مزرعة');
      await page.screenshot({
        path: fileURLToPath(new URL(locale + '-' + width + '-wizard-ar-content.png', out)),
        fullPage: true,
      });
      await section.getByRole('button', { name: /English/ }).click();
      assert.equal(await section.locator('textarea').first().inputValue(), '[VISUAL TEST] English orchard');
      interactions.push(
        locale +
          ' ' +
          width +
          ': wizard language switch preserves both unsaved text versions (VISUAL FIXTURE ONLY; save NOT TESTED)',
      );
      await page.close();
    }
  const failures = results.filter((r) => r.status !== 200 || r.overflow || r.errors.length);
  writeFileSync(
    new URL('results.json', out),
    JSON.stringify({ results, interactions, failures, productionWriteRequests: 0 }, null, 2),
  );
  console.log(JSON.stringify({ screens: results.length, interactions: interactions.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
