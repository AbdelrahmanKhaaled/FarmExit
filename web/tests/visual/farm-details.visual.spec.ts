import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(__dirname, '../../artifacts/farm-details-phase4-1');

for (const locale of ['en', 'ar'] as const) {
  for (const width of [1440, 1024, 390]) {
    test(`${locale} populated Farm Details at ${width}`, async ({ page }, info) => {
      await mkdir(output, { recursive: true });
      await page.setViewportSize({ width, height: width === 1024 ? 1366 : width === 390 ? 844 : 900 });
      // Fixture app has no BFF/backend. Block even read attempts from shared save providers.
      await page.route('**/api/**', (route) => route.abort());
      await page.route(/https?:\/\/(?!127\.0\.0\.1:3101\/|localhost:3101\/)/, (route) => route.abort());
      const mutations: string[] = [];
      const runtimeErrors: string[] = [];
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      page.on('request', (request) => {
        if (!['GET', 'HEAD'].includes(request.method())) mutations.push(request.url());
      });
      await page.goto(`/${locale}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByTestId('farm-details')).toBeVisible();
      for (const id of ['farm-specs', 'farm-facilities', 'farm-location', 'farm-documents', 'similar-title']) {
        await expect(page.locator(`#${id}`)).toBeVisible();
      }
      // Load lazy images without changing fixture content or injecting screenshot pixels into the UI.
      await page.evaluate(() => {
        for (const image of document.images) image.loading = 'eager';
      });
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.evaluate(async () => {
        await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
      });
      expect(
        await page
          .locator('img')
          .evaluateAll((images) =>
            images.every((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
          ),
      ).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: resolve(output, `${process.env.VISUAL_CAPTURE ?? 'after'}-${locale}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
      await info.attach('populated-page', {
        path: resolve(output, `${process.env.VISUAL_CAPTURE ?? 'after'}-${locale}-${width}.png`),
        contentType: 'image/png',
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await expect(page.getByTestId('request-panel').locator('[data-testid="farmexit-score"]')).toHaveCount(1);

      if (process.env.VISUAL_CAPTURE !== 'before') {
        expect(runtimeErrors).toEqual([]);
        const label = locale === 'en' ? 'Contact owner via FarmExit' : 'تواصل مع صاحب المزرعة عن طريق FarmExit';
        await expect(page.getByRole('link', { name: label, exact: true }).filter({ visible: true })).toHaveCount(1);
        await expect(page.locator('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me"]')).toHaveCount(0);
        if (width < 1280) {
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          const bar = page.getByTestId('sticky-action-bar');
          await expect(bar).toBeVisible();
          await expect
            .poll(async () => page.evaluate(() => Number.parseFloat(document.body.style.paddingBlockEnd)))
            .toBeGreaterThanOrEqual(89);
          // A tablet bar appears after scrolling; its ResizeObserver can extend the document end.
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          const footer = await page.locator('footer').boundingBox();
          const bounds = await bar.boundingBox();
          expect(footer!.y + footer!.height).toBeLessThanOrEqual(bounds!.y + 1);
          // Scrolling a body action into view must respect the fixed bar's occupied space.
          const cta = page.locator('section[aria-labelledby="request-band-title"] a');
          await cta.scrollIntoViewIfNeeded();
          const ctaBounds = await cta.boundingBox();
          const ctaBarBounds = await bar.boundingBox();
          expect(ctaBounds!.y + ctaBounds!.height).toBeLessThanOrEqual(ctaBarBounds!.y + 1);
        }
      }
      expect(mutations).toEqual([]);
    });
  }
}

test('absent optional fixture data stays omitted', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/en?variant=empty', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('farm-details')).toBeVisible();
  for (const id of ['farm-facilities', 'farm-documents', 'similar-title']) {
    await expect(page.locator(`#${id}`)).toHaveCount(0);
  }
  await expect(page.locator('main img[src*="listing-placeholder"]').filter({ visible: true })).toHaveCount(1);
});
