import { expect, test } from '@playwright/test';

// Phase 2: homepage. English on desktop 1440, tablet 1024 and mobile 390; Arabic on desktop 1440.
type TestLocale = 'en' | 'ar';

const T = {
  en: {
    h1: /Reviewed farms\./,
    sections: [
      'Farmland is a long-term decision. We make every opportunity clear.',
      'One marketplace, three ways in',
      'Farms for sale and rent',
    ],
    searchFarms: 'Search farms',
    findRequests: 'Find requests',
    management: 'Management',
    forRent: 'For rent',
    next: 'Next testimonial',
    owners: 'Farm owners',
    ownerStep: 'List your farm',
  },
  ar: {
    h1: /مــــــزارع/,
    sections: [
      'الأرض الزراعية قرار طويل المدى. وإحنا بنخلّي كل فرصة واضحة.',
      'سوق واحد وتلات طرق تبدأ بيها',
      'مزارع للبيع والإيجار',
    ],
    searchFarms: 'دوّر على مزرعة',
    findRequests: 'دوّر على طلبات',
    management: 'الإدارة',
    forRent: 'للإيجار',
    next: 'الرأي التالي',
    owners: 'أصحاب المزارع',
    ownerStep: 'اعرض مزرعتك',
  },
} as const;

test.describe('homepage', () => {
  let locale: TestLocale;

  test.beforeEach(async ({ page }, testInfo) => {
    locale = testInfo.project.metadata.locale as TestLocale;
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);
  });

  test('renders the approved section order with one h1', async ({ page }) => {
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText(T[locale].h1);
    const main = page.locator('main');
    await expect(main.locator(':scope > section')).toHaveCount(9);
    for (const name of T[locale].sections) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeAttached();
    }
    await expect(page.locator('#how-it-works')).toBeAttached();
    await expect(page.locator('#market-insights')).toBeAttached();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('has no horizontal overflow and every image loads', async ({ page }) => {
    // Scroll through the page so lazy images load.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    await expect
      .poll(() =>
        page.evaluate(() => [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length),
      )
      .toBe(0);
  });

  test('search switches mode and CTA', async ({ page }) => {
    const search = page.getByRole('search');
    await expect(search.getByRole('button', { name: T[locale].searchFarms })).toBeVisible();
    await search.getByRole('button', { name: T[locale].management, exact: true }).click();
    await expect(search.getByRole('button', { name: T[locale].findRequests })).toBeVisible();
  });

  test('featured farms filter by listing type (desktop and tablet toolbar)', async ({ page, request }) => {
    test.skip(page.viewportSize()!.width < 768, 'The toolbar is hidden on mobile, as in the Mobile 390 frame.');
    const section = page.locator('section[aria-labelledby="farms-title"]');
    const response = await request.get('/api/marketplace/farms?page=1&pageSize=6&sort=newest');
    expect(response.ok()).toBeTruthy();
    await expect(section.locator('article')).toHaveCount((await response.json()).items.length);
    const rent = await request.get('/api/marketplace/farms?listingType=rent&page=1&pageSize=6&sort=newest');
    expect(rent.ok()).toBeTruthy();
    await section.getByRole('button', { name: new RegExp(T[locale].forRent) }).click();
    await expect(section.locator('article')).toHaveCount((await rent.json()).items.length);
  });

  test('testimonial arrows move the highlighted card', async ({ page }) => {
    const cards = page.locator('section[aria-labelledby="testimonials-title"] figure');
    await expect(cards).toHaveCount(3);
    const darkIndex = () =>
      cards.evaluateAll((els) => els.findIndex((el) => el.classList.contains('bg-brand-primary')));
    expect(await darkIndex()).toBe(1);
    await page.getByRole('button', { name: T[locale].next }).click();
    expect(await darkIndex()).toBe(2);
  });

  test('how it works tabs switch the journey', async ({ page }) => {
    const section = page.locator('#how-it-works');
    await section.getByRole('tab', { name: T[locale].owners }).click();
    await expect(section.getByRole('tabpanel')).toContainText(T[locale].ownerStep);
  });

  test('proof figures keep their numeric order', async ({ page }) => {
    // "340+" must not be bidi-reordered to "+340" in Arabic.
    const figure = page.locator('bdi', { hasText: '340+' }).first();
    await expect(figure).toHaveAttribute('dir', 'ltr');
    await expect(figure).toHaveText('340+');
  });
});
