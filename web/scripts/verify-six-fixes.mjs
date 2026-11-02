import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const base = 'http://127.0.0.1:3499';
const out = new URL('../../docs/evidence/six-fixes/', import.meta.url);
mkdirSync(out, { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ['en', 'ar'])
    for (const width of [1440, 1024, 390]) {
      const messages = JSON.parse(
        readFileSync(new URL(`../messages/${locale}/workspace.json`, import.meta.url), 'utf8'),
      );
      const w = messages.phase7;
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addCookies([
        {
          name: 'fx_web_at',
          value:
            'eyJhbGciOiJub25lIn0.' +
            Buffer.from(JSON.stringify({ sub: '900', exp: Math.floor(Date.now() / 1000) + 3600 })).toString(
              'base64url',
            ) +
            '.fixture',
          url: base,
        },
      ]);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${base}/${locale}/my`, { waitUntil: 'networkidle' });
      for (const [state, y] of [
        ['top', 0],
        ['middle', 600],
        ['bottom', 100000],
      ]) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await page.screenshot({
          path: fileURLToPath(new URL(`${locale}-${width}-sidebar-${state}.png`, out)),
          fullPage: false,
        });
      }
      if (width === 1440)
        assert.equal(await page.getByTestId('account-sidebar').evaluate((e) => getComputedStyle(e).position), 'sticky');
      await page.goto(`${base}/${locale}/my/farm-details-requests/new`, { waitUntil: 'networkidle' });
      assert.equal((await page.locator('main a[href$="/farms"]').count()) > 0, true);
      await page.screenshot({
        path: fileURLToPath(new URL(`${locale}-${width}-details-new.png`, out)),
        fullPage: true,
      });
      await page.goto(`${base}/${locale}/my/management/901`, { waitUntil: 'networkidle' });
      // Desktop step navigation; compact layouts use Continue.
      const next = async () => {
        const heading = await page.locator('h1').last().textContent();
        await page.getByRole('button', { name: w.continue, exact: false }).last().click();
        await page
          .waitForFunction((old) => [...document.querySelectorAll('h1')].at(-1)?.textContent !== old, heading)
          .catch(async (e) => {
            console.log(await page.locator('[role=alert]').allTextContents());
            throw e;
          });
      };
      await next();
      await next();
      await next();
      const responsibility = page.locator('input[name="responsibilities"][value="operations"]');
      await responsibility.check();
      assert.equal(await responsibility.isChecked(), true);
      const editor = page.locator('textarea:visible').first().locator('xpath=ancestor::section[1]');
      await editor.getByRole('button', { name: /English/ }).click();
      await editor.locator('textarea').nth(0).fill('Three seasons');
      await editor.getByRole('button', { name: /العربية/ }).click();
      await editor.locator('textarea').nth(0).fill('ثلاثة مواسم');
      await editor.getByRole('button', { name: /English/ }).click();
      assert.equal(await editor.locator('textarea').nth(0).inputValue(), 'Three seasons');
      await editor.getByRole('button', { name: /العربية/ }).click();
      assert.equal(await editor.locator('textarea').nth(0).inputValue(), 'ثلاثة مواسم');
      await page.screenshot({
        path: fileURLToPath(new URL(`${locale}-${width}-responsibilities.png`, out)),
        fullPage: true,
      });
      await next();
      await page.getByRole('button', { name: w.addTeam, exact: true }).click();
      await page.getByRole('button', { name: w.addFacility, exact: true }).click();
      const visibleEditors = page.locator('textarea:visible');
      await visibleEditors.nth(0).fill(locale === 'ar' ? 'فريق الري' : 'Irrigation team');
      await visibleEditors.nth(1).fill(locale === 'ar' ? 'مخزن متاح' : 'Storage available');
      await page.screenshot({ path: fileURLToPath(new URL(`${locale}-${width}-resources.png`, out)), fullPage: true });
      await next();
      await page.reload({ waitUntil: 'networkidle' });
      const persisted = await (await fetch('http://127.0.0.1:4499/api/v1/farm-management-requests/901')).json();
      assert.ok(persisted.responsibilities.includes('operations'));
      assert.equal(persisted.localizedContent.en.experienceLevel, 'Three seasons');
      assert.equal(persisted.localizedContent.ar.experienceLevel, 'ثلاثة مواسم');
      assert.ok(persisted.currentTeam.length > 0);
      assert.ok(persisted.resourcesAndFacilities.length > 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      results.push({ locale, width, passed: true, backend: 'local mock API; no MySQL or authorization proof' });
      await context.close();
    }
} finally {
  await browser.close();
  writeFileSync(new URL('browser-results.json', out), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
