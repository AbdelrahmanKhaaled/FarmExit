import { expect, test, type Page } from '@playwright/test';

type TestLocale = 'en' | 'ar';

const L = {
  en: { rent: 'For rent', sort: 'Sort by', empty: 'No published listings' },
  ar: { rent: 'للإيجار', sort: 'رتّب حسب', empty: 'لا إعلانات منشورة' },
} as const;

const isMobile = (page: Page) => page.viewportSize()!.width < 768;

test.describe('farm marketplace', () => {
  let t: (typeof L)[TestLocale];

  test.beforeEach(async ({ page }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    t = L[locale];
    const response = await page.goto(`/${locale}/farms`);
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('marketplace')).toBeVisible();
  });

  test('loads live marketplace results toolbar', async ({ page }) => {
    await expect(page.getByRole('status').first()).toBeVisible();
    await expect(page.getByLabel(t.sort)).toBeVisible();
    const cards = page.locator('main article');
    const count = await cards.count();
    if (count === 0) {
      await expect(page.getByRole('status').first()).toBeVisible();
    } else {
      await expect(cards.first().locator('[data-testid="farmexit-score"], [data-testid="farmexit-score-pending"]')).toHaveCount(1);
    }
  });

  test('no horizontal overflow on the page', async ({ page }) => {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    const pagination = page.getByRole('navigation', { name: /Pagination|الصفحات/ });
    if ((await pagination.count()) > 0 && !isMobile(page)) {
      await expect(pagination).toBeVisible();
    }
  });
});
