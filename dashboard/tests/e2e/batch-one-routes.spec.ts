import { expect, test } from '@playwright/test';

const routes = ['', '/analytics', '/farms', '/farms/662', '/farms/new', '/farms/662/edit', '/evaluations/new?farmId=662', '/listings', '/listings/760', '/requests/756', '/communications?requestId=756', '/listing-pipeline'];
for (const width of [1440, 1024, 390]) {
  for (const route of routes) {
    test(`${width}px ${route || 'overview'} preserves authentication`, async ({ page }, info) => {
      const locale = info.project.metadata.locale === 'ar' ? 'ar' : 'en';
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/${locale}/admin${route}`);
      await expect(page).toHaveURL(new RegExp(`/${locale}/admin/login`));
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      expect(errors).toEqual([]);
    });
  }
}
