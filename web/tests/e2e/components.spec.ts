import { expect, test } from '@playwright/test';

// Phase 1: shared components on the dev-only Component Preview (built with FX_DEV_PREVIEW=1, see playwright.config.ts).
// Each project declares its locale in `metadata.locale`; viewports are 1440 / 1024 / 390.
type TestLocale = 'en' | 'ar';

const LABELS = {
  en: { menu: 'Open menu', close: 'Close', farms: 'Farms', listFarm: 'List your farm', toggle: 'العربية' },
  ar: { menu: 'افتح القائمة', close: 'إغلاق', farms: 'المزارع', listFarm: 'اعرض مزرعتك', toggle: 'English' },
} as const;

test.describe('shared components', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    const response = await page.goto(`/${locale}/dev/components`);
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('component-preview')).toBeVisible();
  });

  test('has no horizontal overflow', async ({ page }) => {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test('navbar follows the Figma breakpoint variants', async ({ page }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    const t = LABELS[locale];
    const header = page.locator('header').first();
    const width = page.viewportSize()!.width;

    const navLink = header.getByRole('link', { name: t.farms, exact: true });
    const menuButton = header.getByRole('button', { name: t.menu });
    const listFarm = header.getByRole('link', { name: t.listFarm });

    if (width >= 1280) {
      await expect(navLink).toBeVisible();
      await expect(menuButton).toBeHidden();
      await expect(listFarm).toBeVisible();
    } else if (width >= 768) {
      await expect(navLink).toBeHidden();
      await expect(menuButton).toBeVisible();
      await expect(listFarm).toBeVisible();
    } else {
      await expect(navLink).toBeHidden();
      await expect(menuButton).toBeVisible();
      await expect(listFarm).toBeHidden();
    }
  });

  test('language toggle links to the same page in the other locale', async ({ page }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    const other = locale === 'en' ? 'ar' : 'en';
    const toggle = page.getByTestId('component-preview').getByRole('link', { name: /Arabic|الإنجليزية/ });
    await expect(toggle.first()).toHaveAttribute('href', `/${other}/dev/components`);
    await expect(toggle.first()).toContainText(LABELS[locale].toggle);
  });

  test('dialog opens as a modal, traps focus and closes with Escape', async ({ page }) => {
    await page.getByTestId('open-dialog').click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-labelledby', /.+/);
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  test('end sheet opens from the inline end and closes with its close button', async ({ page }, testInfo) => {
    const locale = testInfo.project.metadata.locale as TestLocale;
    await page.getByTestId('open-side-sheet').click();
    const panel = page.locator('dialog[open] > div');
    await expect(panel).toBeVisible();
    // Wait for the 300 ms slide to settle before measuring.
    await expect
      .poll(async () => {
        const box = await panel.boundingBox();
        const width = page.viewportSize()!.width;
        return locale === 'ar' ? Math.round(box!.x) : Math.round(box!.x + box!.width - width);
      })
      .toBe(0);
    await page.locator('dialog[open]').getByRole('button', { name: LABELS[locale].close }).click();
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  test('filter chips toggle and an applied chip can be removed', async ({ page }) => {
    const chips = page.getByTestId('chip-demo');
    const pressed = chips.locator('button[aria-pressed="true"]');
    await expect(pressed).toHaveCount(1);
    await chips.locator('button[aria-pressed="false"]').first().click();
    await expect(pressed).toHaveCount(1);
    const applied = chips.locator('button:not([aria-pressed])');
    await expect(applied).toHaveCount(1);
    await applied.click();
    await expect(applied).toHaveCount(0);
  });
});
