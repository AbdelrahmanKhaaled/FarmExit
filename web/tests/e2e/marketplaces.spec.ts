import { test, expect } from '@playwright/test';

const cases = [
  { prefix: '/en', farms: 'Farms', management: 'Management', partnerships: 'Partnerships' },
  { prefix: '/ar', farms: 'المزارع', management: 'الإدارة', partnerships: 'الشراكات' },
] as const;

for (const { prefix, farms, management, partnerships } of cases) {
  test.describe(`marketplaces ${prefix}`, () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('primary nav reaches three marketplaces', async ({ page }) => {
      const nav = () => page.getByRole('navigation', { name: /^(Main|الرئيسية)$/ });
      await page.goto(`${prefix}/`);
      await nav().getByRole('link', { name: farms, exact: true }).click();
      await expect(page.getByTestId('marketplace')).toBeVisible();

      await page.goto(`${prefix}/`);
      await nav().getByRole('link', { name: management, exact: true }).click();
      await expect(page.getByTestId('management-marketplace')).toBeVisible();

      await page.goto(`${prefix}/`);
      await nav().getByRole('link', { name: partnerships, exact: true }).click();
      await expect(page.getByTestId('partnership-marketplace')).toBeVisible();
    });

    test('farm cards always show FarmExit Score block', async ({ page }) => {
      await page.goto(`${prefix}/farms`, { waitUntil: 'networkidle' });
      const cards = page.getByTestId('marketplace').locator('article');
      try {
        await cards.first().waitFor({ state: 'visible', timeout: 20_000 });
      } catch {
        test.skip(true, 'No published listings in API for this environment');
      }
      await expect(
        cards.first().locator('[data-testid="farmexit-score"], [data-testid="farmexit-score-pending"]'),
      ).toHaveCount(1);
    });
  });
}
