import { expect, test, type Page } from '@playwright/test';

// Phase 4: Farm Details. EN and AR on desktop 1440, tablet 1024 and mobile 390 (see playwright.config.ts).
// Sample data: Wadi El Natrun is the designed farm (5 photos, every section, FarmExit Score 4.8);
// Qaha has marketplace data only (one photo, no approved score), so its detail sections collapse.
type TestLocale = 'en' | 'ar';

const DESIGNED = 'wadi-el-natrun';
const LISTING_ONLY = 'qaha';

const L = {
  en: {
    name: 'Wadi El Natrun Vegetable Estate',
    price: 'EGP 54M',
    back: 'Back to results',
    gallery: 'Farm photos',
    viewAll: 'View all photos',
    allTitle: 'All photos',
    showPhoto: (index: number, total: number) => `Show photo ${index} of ${total}`,
    scoreLabel: /^FarmExit Score/,
    scoreNote: "FarmExit's own evaluation — not a customer rating",
    scoreA11y: /not a customer rating/,
    scoreLine: 'FarmExit Score 4.8 /5',
  },
  ar: {
    name: 'مزرعة وادي النطرون للخضار',
    price: '54 مليون ج.م',
    back: 'رجوع للنتائج',
    gallery: 'صور المزرعة',
    viewAll: 'شوف كل الصور',
    allTitle: 'كل الصور',
    showPhoto: (index: number, total: number) => `اعرض الصورة ${index} من ${total}`,
    scoreLabel: /^تقييم FarmExit/,
    scoreNote: 'تقييم FarmExit الداخلي — مش تقييم عملاء',
    scoreA11y: /مش تقييم عملاء/,
    scoreLine: 'تقييم FarmExit 4.8 من 5',
  },
} as const;

const isDesktop = (page: Page) => page.viewportSize()!.width >= 1280;
const isMobile = (page: Page) => page.viewportSize()!.width < 768;

/** Elements labelled as a FarmExit Score: the score card, the gallery chip and the action bar line. */
const SCORE_LABELLED = {
  en: '[aria-label^="FarmExit Score"]',
  ar: '[aria-label^="تقييم FarmExit"]',
} as const;

const galleryCounter = (page: Page) => page.locator('[aria-live="polite"]').filter({ visible: true });

test.describe('farm details', () => {
  let locale: TestLocale;
  let t: (typeof L)[TestLocale];

  test.beforeEach(async ({}, testInfo) => {
    locale = testInfo.project.metadata.locale as TestLocale;
    t = L[locale];
  });

  async function open(page: Page, slug: string) {
    const response = await page.goto(`/${locale}/farms/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('farm-details')).toBeVisible();
  }

  test('renders the designed farm with every section and no overflow', async ({ page }) => {
    await open(page, DESIGNED);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(t.name);
    for (const id of [
      'farm-specs',
      'farm-facilities',
      'farm-location',
      'farm-documents',
      'request-band-title',
      'similar-title',
    ]) {
      await expect(page.locator(`#${id}`)).toBeAttached();
    }
    await expect(page.locator('section[aria-labelledby="similar-title"] article')).toHaveCount(3);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test('owner contact goes through FarmExit only', async ({ page }) => {
    await open(page, DESIGNED);
    await expect(
      page.locator('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me"], a[href*="whatsapp"]'),
    ).toHaveCount(0);
    const request = page.locator(`main a[href*="/sign-in"]`).first();
    await expect(request).toHaveAttribute('href', /next=%2Ffarms%2Fwadi-el-natrun/);
  });

  test('an unknown farm returns 404', async ({ page }) => {
    const response = await page.goto(`/${locale}/farms/not-a-listed-farm`);
    expect(response?.status()).toBe(404);
  });

  test("shows the FarmExit Score as FarmExit's own evaluation, not a customer rating", async ({ page }) => {
    await open(page, DESIGNED);
    // Compact chip on the hero photo.
    const chip = page.getByRole('region', { name: t.gallery }).locator(SCORE_LABELLED[locale]);
    await expect(chip).toBeVisible();
    await expect(chip).toContainText('4.8');
    await expect(chip).toHaveAttribute('aria-label', t.scoreA11y);
    // Score card: the desktop Request Panel, the tablet/mobile Price & Actions card.
    const holder = isDesktop(page) ? page.getByTestId('request-panel') : page.locator('#farm-price-actions');
    const card = holder.getByTestId('farmexit-score');
    await expect(card).toBeVisible();
    await expect(card).toContainText('4.8');
    await expect(card).toContainText(t.scoreNote);
    await expect(card).toHaveAttribute('aria-label', t.scoreA11y);
    // Overline/Score keeps the brand casing in Arabic ("تقييم FarmExit", never "FARMEXIT").
    const label = card.getByText(t.scoreLabel).first();
    await expect(label).toHaveCSS('text-transform', locale === 'ar' ? 'none' : 'uppercase');
  });

  test('a farm without an approved score shows no score anywhere', async ({ page }) => {
    await open(page, LISTING_ONLY);
    await expect(page.getByTestId('farmexit-score')).toHaveCount(0);
    await expect(page.locator(SCORE_LABELLED[locale])).toHaveCount(0);
    await expect(page.getByTestId('sticky-action-bar')).not.toContainText(/FarmExit Score|تقييم FarmExit/);
  });

  test('sections without listing data are hidden', async ({ page }) => {
    await open(page, LISTING_ONLY);
    await expect(page.locator('#farm-specs')).toBeVisible();
    await expect(page.locator('#farm-location')).toBeAttached();
    await expect(page.locator('#farm-facilities')).toHaveCount(0);
    await expect(page.locator('#farm-documents')).toHaveCount(0);
    await expect(page.locator('#similar-title')).toHaveCount(0);
    // One photo: no thumbnails, counter 1 / 1.
    await expect(page.getByRole('button', { name: t.showPhoto(2, 1) })).toHaveCount(0);
    await expect(galleryCounter(page)).toHaveText('1 / 1');
  });

  test('gallery thumbnails switch the main photo', async ({ page }) => {
    await open(page, DESIGNED);
    await expect(galleryCounter(page)).toHaveText('1 / 5');
    const thumb = page.getByRole('button', { name: t.showPhoto(2, 5), exact: true }).filter({ visible: true });
    await thumb.click();
    await expect(galleryCounter(page)).toHaveText('2 / 5');
    await expect(thumb).toHaveAttribute('aria-current', 'true');
  });

  test('View all photos lists every photo and selects one', async ({ page }) => {
    await open(page, DESIGNED);
    const viewAll = page.getByRole('button', { name: t.viewAll, exact: true }).filter({ visible: true });
    await viewAll.click();
    const dialog = page.getByRole('dialog', { name: t.allTitle });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: new RegExp(t.showPhoto(1, 5).replace(/\d+/g, '\\d+')) }),
    ).toHaveCount(5);
    await dialog.getByRole('button', { name: t.showPhoto(3, 5), exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(galleryCounter(page)).toHaveText('3 / 5');

    await viewAll.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('the bottom action bar follows the screen size', async ({ page }) => {
    await open(page, DESIGNED);
    const bar = page.getByTestId('sticky-action-bar');

    if (isDesktop(page)) {
      // Desktop: the sticky Request Panel replaces the bar.
      await expect(page.getByTestId('request-panel')).toBeVisible();
      await page.locator('#farm-location').scrollIntoViewIfNeeded();
      await expect(bar).toBeHidden();
      await expect(page.getByTestId('request-panel')).toBeInViewport();
      return;
    }

    await expect(page.getByTestId('request-panel')).toBeHidden();
    if (isMobile(page)) {
      // Mobile: always visible.
      await expect(bar).toBeVisible();
    } else {
      // Tablet: only once the inline Price & Actions card has scrolled away.
      await page.locator('#farm-price-actions').scrollIntoViewIfNeeded();
      await expect(bar).toBeHidden();
      await page.locator('#farm-location').scrollIntoViewIfNeeded();
      await expect(bar).toBeVisible();
    }
    await expect(bar).toContainText(t.price);
    await expect(bar).toContainText(t.scoreLine);
    await expect(bar.locator('a[href*="/sign-in"]')).toBeVisible();
  });

  test('Back to results returns to the filtered marketplace', async ({ page }) => {
    const filtered = await page.goto(`/${locale}/farms?irrigation=drip&water=well`);
    expect(filtered?.status()).toBe(200);
    const cards = page.locator('main article').filter({ visible: true });
    await expect(cards).toHaveCount(3);
    await cards.first().locator('a[href*="/farms/"]').last().click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/farms/[a-z-]+$`));
    await expect(page.getByTestId('farm-details')).toBeVisible();

    await page.getByRole('link', { name: t.back }).click();
    await expect(page).toHaveURL(/irrigation=drip/);
    await expect(page).toHaveURL(/water=well/);
    await expect(cards).toHaveCount(3);
  });

  test('Back to results opens the default results when the page is opened directly', async ({ page }) => {
    await open(page, DESIGNED);
    await expect(page.getByRole('link', { name: t.back })).toHaveAttribute('href', `/${locale}/farms`);
  });
});
