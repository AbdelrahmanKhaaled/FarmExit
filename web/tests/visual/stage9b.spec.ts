import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.join(process.cwd(), '..', '..', 'docs', 'artifacts', 'phase9b');

test.beforeAll(async () => {
  await fs.mkdir(outDir, { recursive: true });
});

for (const locale of ['en', 'ar'] as const) {
  test(`phase9b desktop inbox+thread ${locale}`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/phase9b?screen=thread`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('conversation-view')).toBeVisible();
    await expect(page.getByTestId('message-staff')).toBeVisible();
    const file = path.join(outDir, `${testInfo.project.name}-${locale}-thread.png`);
    await page.screenshot({ path: file, fullPage: true });
  });

  test(`phase9b mobile thread ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}/phase9b?screen=thread`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId('conversation-view')).toBeVisible();
    const file = path.join(outDir, `mobile-390-${locale}-thread.png`);
    await page.screenshot({ path: file, fullPage: true });
  });
}
