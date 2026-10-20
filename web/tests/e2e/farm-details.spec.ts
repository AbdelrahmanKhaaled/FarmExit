import { expect, test } from '@playwright/test';

type TestLocale = 'en' | 'ar';

test.describe('farm details (public API)', () => {
  test('unknown slug does not render a public farm details page', async ({ page }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    await page.goto(`/${locale}/farms/not-a-real-published-slug-000`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('request-panel')).toHaveCount(0);
  });

  test('published listing opens details with score block', async ({ page }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    await page.goto(`/${locale}/farms`, { waitUntil: 'networkidle' });
    const card = page.locator('main article').first();
    try {
      await card.waitFor({ state: 'visible', timeout: 20_000 });
    } catch {
      test.skip(true, 'No published listings in API for this environment');
    }
    await card.getByRole('link').first().click();
    await expect(page.getByTestId('farm-details')).toBeVisible();
    await expect(
      page
        .getByTestId('request-panel')
        .locator('[data-testid="farmexit-score"], [data-testid="farmexit-score-pending"]'),
    ).toHaveCount(1);
  });

  test('details remain usable across viewports with gallery and gated actions', async ({ page, request }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    const response = await request.get('/api/marketplace/farms?pageSize=1');
    expect(response.ok()).toBeTruthy();
    const data = (await response.json()) as { items: { slug: string }[] };
    test.skip(data.items.length === 0, 'Requires an existing published listing; no test data is created.');
    await page.goto(`/${locale}/farms/${data.items[0]!.slug}`, { waitUntil: 'networkidle' });

    const main = page.getByTestId('farm-details');
    await expect(main).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    // The photo counter opens the existing lightbox, including for a placeholder-only listing.
    await main
      .locator('section')
      .first()
      .getByRole('button', { name: /\(1 \/ \d+\)/ })
      .filter({ visible: true })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await page.locator('#request-band-title').scrollIntoViewIfNeeded();
    if (page.viewportSize()!.width < 1280) {
      await expect(page.getByTestId('sticky-action-bar')).toBeVisible();
    }
    await main.locator('a[href*="sign-in"]').filter({ visible: true }).last().click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/sign-in\\?returnTo=`));
  });
});
