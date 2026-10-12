import { expect, test, type Page } from '@playwright/test';

// Phase 3: Farm Marketplace. EN and AR on desktop 1440, tablet 1024 and mobile 390 (see playwright.config.ts).
// Sample data: 9 sale listings (5 with drip irrigation; 3 of those on a well), 3 rentals.
type TestLocale = 'en' | 'ar';

const L = {
  en: {
    drip: 'Drip irrigation',
    well: 'Well',
    diesel: 'Diesel',
    rent: 'Rent',
    sort: 'Sort by',
    clearAll: 'Clear all',
    loadMore: 'Load more farms',
    forRent: 'For rent',
    empty: 'No farms match these filters yet',
    cheapest: 'Qaha Strawberry Farm',
    priciest: 'Nubaria Potato & Peanut Farm',
  },
  ar: {
    drip: 'الري بالتنقيط',
    well: 'بئر',
    diesel: 'سولار',
    rent: 'إيجار',
    sort: 'رتّب حسب',
    clearAll: 'امسح الكل',
    loadMore: 'اعرض مزارع أكتر',
    forRent: 'للإيجار',
    empty: 'مفيش مزارع مطابقة للفلاتر دي لسه',
    cheapest: 'مزرعة قها للفراولة',
    priciest: 'مزرعة النوبارية للبطاطس والفول السوداني',
  },
} as const;

const isDesktop = (page: Page) => page.viewportSize()!.width >= 1280;
const isMobile = (page: Page) => page.viewportSize()!.width < 768;

/** Cards on screen: mobile shows 3 at a time (Load more), desktop/tablet show the page. */
const visibleCards = (page: Page) => page.locator('main article').filter({ visible: true });
const expectedVisible = (page: Page, total: number) => (isMobile(page) ? Math.min(3, total) : total);

/** Applies checkbox filters: live in the desktop sidebar, through the drawer ("Show N") on tablet and mobile. */
async function applyFilters(page: Page, labels: string[]) {
  if (isDesktop(page)) {
    const sidebar = page.getByRole('complementary');
    for (const label of labels) await sidebar.getByText(label, { exact: true }).click();
    return;
  }
  await page.locator('main button[aria-haspopup="dialog"]').click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  for (const label of labels) await drawer.getByText(label, { exact: true }).click();
  // Footer primary action: "Show N sample listings".
  await drawer.locator('button.grow').click();
  await expect(drawer).toBeHidden();
}

test.describe('farm marketplace', () => {
  let t: (typeof L)[TestLocale];

  test.beforeEach(async ({ page }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    t = L[locale];
    const response = await page.goto(`/${locale}/farms`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('shows the sample sale listings with a matching count and no overflow', async ({ page }) => {
    await expect(visibleCards(page)).toHaveCount(expectedVisible(page, 9));
    await expect(page.getByRole('status').first()).toContainText(String(expectedVisible(page, 9)));
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    // Desktop/tablet pagination vs mobile Load more.
    await expect(page.getByRole('navigation', { name: /Pagination|الصفحات/ })).toBeVisible({
      visible: !isMobile(page),
    });
  });

  test('filters combine and are reflected in the URL', async ({ page }) => {
    await applyFilters(page, [t.drip]);
    await expect(visibleCards(page)).toHaveCount(expectedVisible(page, 5));
    await expect(page).toHaveURL(/irrigation=drip/);

    await applyFilters(page, [t.well]);
    await expect(visibleCards(page)).toHaveCount(expectedVisible(page, 3));
    await expect(page).toHaveURL(/water=well/);
  });

  test('an unmatched filter shows the empty state and Clear all resets', async ({ page }) => {
    await applyFilters(page, [t.diesel]);
    await expect(page.getByText(t.empty)).toBeVisible();
    await page
      .getByRole('button', { name: new RegExp(t.clearAll) })
      .filter({ visible: true })
      .first()
      .click();
    await expect(visibleCards(page)).toHaveCount(expectedVisible(page, 9));
    await expect(page).not.toHaveURL(/energy=/);
  });

  test('sort changes the order', async ({ page }) => {
    const sort = page.getByLabel(t.sort);
    await sort.selectOption('priceAsc');
    await expect(visibleCards(page).first()).toContainText(t.cheapest);
    await sort.selectOption('priceDesc');
    await expect(visibleCards(page).first()).toContainText(t.priciest);
    await expect(page).toHaveURL(/sort=priceDesc/);
  });

  test('Buy / Rent switches the listing purpose', async ({ page }) => {
    await page.getByRole('search').getByRole('button', { name: t.rent, exact: true }).click();
    await expect(visibleCards(page)).toHaveCount(3);
    await expect(visibleCards(page).first()).toContainText(t.forRent);
    await expect(page).toHaveURL(/listing=rent/);
  });

  test('filter state is restored from the URL', async ({ page }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    await page.goto(`/${locale}/farms?irrigation=drip&water=well`);
    await expect(visibleCards(page)).toHaveCount(expectedVisible(page, 3));
  });

  test('mobile loads more listings instead of paginating', async ({ page }) => {
    test.skip(!isMobile(page), 'Load more is the mobile pattern.');
    const more = page.getByRole('button', { name: t.loadMore });
    await expect(visibleCards(page)).toHaveCount(3);
    await more.click();
    await expect(visibleCards(page)).toHaveCount(6);
    await more.click();
    await expect(visibleCards(page)).toHaveCount(9);
    await expect(more).toBeHidden();
  });
});
