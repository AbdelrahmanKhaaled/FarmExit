import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isolatePhase7 } from './phase7-fixtures';
const output = resolve(__dirname, '../../artifacts/phase7/screenshots');
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390])
    test(`${locale} Management and Professional at ${width}`, async ({ page }) => {
      await mkdir(output, { recursive: true });
      await page.setViewportSize({ width, height: width === 1024 ? 1366 : width === 390 ? 844 : 900 });
      await isolatePhase7(page);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const geometry: Record<string, unknown> = {};
      async function capture(name: string) {
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(async () => {
          for (const image of document.images) image.loading = 'eager';
          await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => undefined)));
          window.scrollTo(0, 0);
        });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          name + ' overflow',
        ).toBeTruthy();
        await expect(page.locator('body')).not.toContainText('workspace.phase7.');
        const grid = page.getByTestId('phase7-task-grid');
        if ((await grid.count()) && !(await page.locator('[data-complete=true]').count())) {
          const measured = await grid.evaluate((e) => ({
            columns: getComputedStyle(e).gridTemplateColumns,
            children: Array.from(e.children)
              .filter((c) => getComputedStyle(c).display !== 'none')
              .map((c) => ({ x: c.getBoundingClientRect().x, y: c.getBoundingClientRect().y })),
          }));
          geometry[name] = measured;
          if (width === 1440) {
            expect(measured.columns).toBe('296px 656px 264px');
            expect(measured.children).toHaveLength(3);
            expect(new Set(measured.children.map((c) => Math.round(c.y))).size).toBe(1);
            expect(measured.children[0]!.x < measured.children[1]!.x).toBe(locale === 'en');
          }
          const actions = page.getByTestId('phase7-actions');
          if (await actions.count()) expect(await actions.evaluate((e) => getComputedStyle(e).position)).toBe('static');
        }
        await page.screenshot({
          path: resolve(output, `${locale}-${width}-${name}.png`),
          fullPage: true,
          animations: 'disabled',
        });
      }
      for (let step = 1; step <= 7; step++) {
        await page.goto(`/${locale}/phase7/management-wizard?step=${step}`, { waitUntil: 'networkidle' });
        await capture(`management-${step}`);
      }
      await page.getByTestId('phase7-actions').getByRole('button').last().click();
      await expect(page.locator('[data-complete=true]')).toBeVisible();
      await capture('management-success');
      for (let step = 1; step <= 3; step++) {
        await page.goto(`/${locale}/phase7/professional-wizard?step=${step}`, { waitUntil: 'networkidle' });
        await capture(`professional-${step}`);
      }
      for (let step = 4; step <= 5; step++) {
        await page.goto(`/${locale}/phase7/verification-wizard?step=${step}`, { waitUntil: 'networkidle' });
        await capture(`professional-${step}`);
      }
      await page.getByTestId('phase7-actions').getByRole('button').last().click();
      await expect(page.locator('[data-complete=true]')).toBeVisible();
      await capture('verification-success');
      for (const screen of [
        'management-new',
        'management-changes',
        'management-underReview',
        'management-approved',
        'management-rejected',
        'management-list',
        'management-empty',
        'professional-new',
        'professional-profile',
        'professional-verified',
        'professional-notApproved',
        'verification-changes',
        'verification-underReview',
        'verification-approved',
        'verification-rejected',
        'verification-list',
        'verification-empty',
      ]) {
        await page.goto(`/${locale}/phase7/${screen}`, { waitUntil: 'networkidle' });
        await capture(screen);
        if (screen.includes('underReview') || screen === 'professional-verified')
          await expect(page.locator('input[type=file]')).toHaveCount(0);
      }
      expect(errors).toEqual([]);
      await writeFile(resolve(output, `${locale}-${width}-geometry.json`), JSON.stringify(geometry, null, 2));
    });
