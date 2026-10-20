import { expect, test } from '@playwright/test';

const api = (process.env.FARMEXIT_API_URL ?? 'http://127.0.0.1:4001/api/v1').replace(/\/$/, '');
type Listing = {
  id: string;
  slug: string;
  farmName: string;
  listingType: string;
  governorate: string;
  farmExitScore: number | null;
};

test.describe('Phase 10 live integration (no fixtures or database writes)', () => {
  test('mobile load more retains previous farms across API pages', async ({ page, request }, info) => {
    test.skip((page.viewportSize()?.width ?? 1440) >= 768, 'Mobile load-more behavior only.');
    const response = await request.get(`${api}/marketplace/farms?listingType=sale&page=1&pageSize=9&sort=newest`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json() as { items: Listing[]; total: number };
    test.skip(data.total <= 9, 'Requires at least ten existing published sale listings; no seeds are run.');
    await page.goto(`/${info.project.metadata.locale}/farms`, { waitUntil: 'networkidle' });
    const cards = page.locator('main article:visible');
    await expect(cards).toHaveCount(3);
    const more = page.getByRole('button', { name: /Load more farms|اعرض مزارع أكتر/ });
    await more.click();
    await expect(cards).toHaveCount(6);
    await more.click();
    await expect(cards).toHaveCount(9);
    await more.click();
    await expect(cards).toHaveCount(Math.min(12, data.total));
    expect(data.items[0]).toBeDefined();
    await expect(page.locator(`main article a[href$="/farms/${data.items[0]!.slug}"]`)).toBeVisible();
  });

  test('price sort renders the server order', async ({ page, request }, info) => {
    const response = await request.get(`${api}/marketplace/farms?listingType=sale&page=1&pageSize=9&sort=priceAsc`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json() as { items: Listing[] };
    await page.goto(`/${info.project.metadata.locale}/farms`, { waitUntil: 'networkidle' });
    await page.getByLabel(info.project.metadata.locale === 'ar' ? 'رتّب حسب' : 'Sort by').selectOption('priceAsc');
    await expect(page.locator('main article h3')).toHaveText(data.items.map((listing) => listing.farmName));
  });

  test('marketplace rental URL renders only API rental results', async ({ page, request }, info) => {
    const response = await request.get(`${api}/marketplace/farms?listingType=rent&page=1&pageSize=9&sort=newest`);
    expect(response.ok()).toBeTruthy();
    const data = (await response.json()) as { items: Listing[] };
    await page.goto(`/${info.project.metadata.locale}/farms?listing=rent`, { waitUntil: 'networkidle' });
    const cards = page.locator('main article');
    await expect(cards).toHaveCount(data.items.length);
    await expect(cards.locator('h3')).toHaveText(data.items.map((listing) => listing.farmName));
    for (const listing of data.items)
      await expect(cards.locator(`a[href$="/farms/${listing.slug}"]`)).toHaveCount(1);
  });

  test('saving a real card requires sign-in', async ({ page, request }, info) => {
    const response = await request.get(`${api}/marketplace/farms?listingType=sale&pageSize=1`);
    expect(response.ok()).toBeTruthy();
    const data = (await response.json()) as { items: Listing[] };
    test.skip(data.items.length === 0, 'No published sale listing available.');
    await page.goto(`/${info.project.metadata.locale}/farms`, { waitUntil: 'networkidle' });
    await page.locator('main article').first().getByRole('button').click();
    await expect(page).toHaveURL(/\/(en|ar)\/sign-in\?returnTo=/);
  });

  test('malformed OTP bodies return validation errors without sending SMS', async ({ request }) => {
    for (const path of ['/api/auth/otp/request', '/api/auth/otp/verify']) {
      expect((await request.post(path, { data: { mobile: 123, code: [] } })).status()).toBe(400);
      expect(
        (await request.post(path, { data: 'invalid json', headers: { 'content-type': 'application/json' } })).status(),
      ).toBe(400);
    }
  });
  test('homepage cards match the real public API', async ({ page, request }, info) => {
    const response = await request.get(`${api}/marketplace/farms?page=1&pageSize=6&sort=newest`);
    expect(response.ok()).toBeTruthy();
    const data = (await response.json()) as { items: Listing[] };
    await page.goto(`/${info.project.metadata.locale}`);
    const section = page.locator('section[aria-labelledby="farms-title"]');
    await expect(section.locator('article')).toHaveCount(data.items.length);
    for (const listing of data.items) {
      await expect(section.getByRole('heading', { name: listing.farmName, exact: true })).toBeVisible();
      await expect(section.locator(`a[href$="/farms/${listing.slug}"]`)).toHaveCount(1);
    }
  });

  test('filters, pagination and public fields match API contracts', async ({ request }) => {
    const first = await request.get(`${api}/marketplace/farms?page=1&pageSize=1&sort=newest`);
    expect(first.ok()).toBeTruthy();
    const data = (await first.json()) as { items: Listing[]; total: number; page: number; pageSize: number };
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(1);
    expect(data.items.length).toBeLessThanOrEqual(1);
    for (const listing of data.items) {
      const fields = Object.keys(listing).join(' ');
      expect(fields).not.toMatch(/latitude|longitude|mobile|email|ownerId|exactLocation|internalNotes/i);
      expect(listing.farmExitScore === null || (listing.farmExitScore >= 0 && listing.farmExitScore <= 5)).toBeTruthy();
      const detail = await request.get(`${api}/marketplace/farms/${encodeURIComponent(listing.slug)}`);
      expect(detail.ok()).toBeTruthy();
      expect((await detail.json()).id).toBe(listing.id);
      const filtered = await request.get(`${api}/marketplace/farms`, {
        params: { listingType: listing.listingType, governorate: listing.governorate, pageSize: '1' },
      });
      expect(filtered.ok()).toBeTruthy();
      const rows = (await filtered.json()).items as Listing[];
      expect(rows.length).toBeGreaterThan(0);
      expect(
        rows.every((row) => row.listingType === listing.listingType && row.governorate === listing.governorate),
      ).toBeTruthy();
    }
    const beyond = await request.get(`${api}/marketplace/farms?page=${data.total + 1}&pageSize=1`);
    expect(beyond.ok()).toBeTruthy();
    expect((await beyond.json()).items).toEqual([]);
    const invalid = await request.get(`${api}/marketplace/farms?minArea=100&maxArea=1`);
    expect(invalid.status()).toBe(400);
  });

  test('private BFF operations reject unauthenticated callers', async ({ request }) => {
    for (const path of [
      '/auth/me',
      '/marketplace/saved',
      '/communication/cases',
      '/purchase-proposals',
      '/partnership-requests',
      '/partnership-applications',
      '/farm-details-requests',
      '/farm-management-requests',
      '/professional-verification-requests',
    ]) {
      const response = await request.get(`/api${path}`);
      expect(response.status(), path).toBe(401);
      expect((await request.get(`${api}${path}`)).status(), `backend ${path}`).toBe(401);
    }
    const farm = await request.post('/api/farms', { data: {} });
    expect(farm.status()).toBe(401);
    const document = await request.get('/api/requests/1/documents/1/download');
    expect(document.status()).toBe(401);
  });

  test('EN/AR metadata, direction and mobile width', async ({ page }, info) => {
    const locale = String(info.project.metadata.locale);
    await page.goto(`/${locale}/farms`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page).toHaveTitle(/FarmExit/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
});
