import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390]) {
    test(`real MySQL production UI and BFF ${locale} ${width}`, async ({ page, context }) => {
      test.skip(
        !process.env.GEO_OWNER_TOKEN || !process.env.GEO_FARM_ID,
        'Only run with dedicated integration-test credentials',
      );
      const output = resolve(__dirname, '../../artifacts/stage1b/production');
      await mkdir(output, { recursive: true });
      await page.setViewportSize({ width, height: width === 1024 ? 1366 : width === 390 ? 844 : 900 });
      await context.addCookies([
        {
          name: 'fx_web_at',
          value: process.env.GEO_OWNER_TOKEN!,
          url: 'http://127.0.0.1:3104',
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
      const url = `/${locale}/my/farms/${process.env.GEO_FARM_ID}/list?step=2`;
      await page.goto(url);
      await expect(page.getByTestId('add-farm-wizard')).toBeVisible();
      const map = page.getByRole('region', {
        name: locale === 'en' ? 'Farm location on the map' : 'موقع المزرعة على الخريطة',
      });
      await expect(map).toHaveClass(/leaflet-container/);
      await map.click({ position: { x: 150, y: 150 } });
      const coordinates = await page.getByTestId('selected-coordinates').textContent();
      await page.locator('[name=nearestMainRoad]').fill('Browser test road');
      await page.locator('[name=roadDistanceKm]').fill('4.25');
      const saved = page.waitForResponse(
        (response) => response.url().endsWith('/private-location') && response.request().method() === 'PATCH',
      );
      await page.getByRole('button', { name: locale === 'ar' ? 'متابعة' : 'Continue', exact: true }).click();
      expect((await saved).status()).toBe(200);
      await expect(page.locator('[name=waterSource]')).toBeVisible();
      await page.goto(url);
      await page.reload();
      await expect(page.getByTestId('selected-coordinates')).toHaveText(coordinates!);
      await expect(page.locator('[name=nearestMainRoad]')).toHaveValue('Browser test road');
      await expect(page.locator('[name=roadDistanceKm]')).toHaveValue('4.25');
      await expect(map).toHaveClass(/leaflet-container/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (width === 1440)
        expect(
          await page
            .getByTestId('wizard-actions')
            .evaluate((actions) => getComputedStyle(actions.parentElement!.parentElement!).gridTemplateColumns),
        ).toBe('296px 656px 264px');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: resolve(output, `${locale}-${width}-reload.png`), fullPage: true });
      const read = await context.request.get(`/api/farms/${process.env.GEO_FARM_ID}/private-location`);
      expect(read.status()).toBe(200);
      expect(read.headers()['cache-control']).toContain('no-store');
    });
  }
