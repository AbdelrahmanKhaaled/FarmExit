import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
async function buyerTerms(page: Page, installment = true, exchange = true) {
  await page.route('**/api/marketplace/farms/*/sale-terms', (route) =>
    route.fulfill({
      json: {
        saleMode: 'quickSale',
        acceptsCashProposals: false,
        acceptsInstallmentProposals: installment,
        acceptsExchangeProposals: exchange,
        exchangePreferenceScope: exchange ? 'selected' : 'any',
        exchangeAssetTypes: exchange ? ['factory', 'car'] : [],
        configured: true,
      },
    }),
  );
}
test('buyer independently selects permitted types, preserves estimated EGP and rejects invalid values', async ({
  page,
}) => {
  await buyerTerms(page);
  const calls: unknown[] = [];
  await page.route('**/api/marketplace/farms/*/purchase-proposals', (route) => {
    calls.push(route.request().postDataJSON());
    return route.fulfill({ status: 503, json: { message: 'Isolated failure' } });
  });
  await page.goto('/en/stage1e?screen=buyer');
  await expect(page.locator('[name=proposalKind] option')).toHaveCount(2);
  await page.locator('[name=proposalKind]').selectOption('exchange');
  await expect(page.locator('[name=assetType] option')).toHaveText(['Factory', 'Car']);
  await page.locator('[name=assetType]').selectOption('car');
  await page.locator('[name=assetValue]').fill('0');
  await page.locator('button[type=submit]').click();
  expect(calls).toHaveLength(0);
  await page.locator('[name=assetValue]').fill('250000');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('p[role=alert]')).toBeVisible();
  await expect(page.locator('[name=assetValue]')).toHaveValue('250000');
  expect(calls[0]).toMatchObject({
    proposalKind: 'exchange',
    proposedTotalValue: 250000,
    components: [{ componentType: 'exchangeAsset', proposedValue: 250000, assetType: 'car' }],
  });
  await page.goto('/en/stage1e?screen=buyer-detail');
  await expect(page.getByTestId('proposal-detail')).toContainText('250,000');
  await page.reload();
  await expect(page.getByTestId('proposal-detail')).toContainText('Car');
  await page.getByTestId('proposal-detail').getByRole('button').first().click();
  await expect(page.locator('[name=assetType] option')).toHaveText(['Factory', 'Car']);
  await expect(page.locator('[name=assetValue]')).toHaveValue('250000');
});
async function isolate(page: Page, legacy = false) {
  let terms: Record<string, unknown> | null = legacy
    ? {
        saleMode: 'quickSale',
        acceptsCashProposals: true,
        acceptsInstallmentProposals: true,
        acceptsExchangeProposals: true,
        exchangePreferenceScope: 'any',
        exchangeAssetTypes: [],
        configured: true,
      }
    : null;
  const calls: Record<string, unknown>[] = [];
  await page.route('**/api/listing-requests/*/sale-terms', async (route) => {
    if (route.request().method() === 'PUT') {
      terms = { ...route.request().postDataJSON(), configured: true };
      calls.push(terms!);
    }
    return terms ? route.fulfill({ json: terms }) : route.fulfill({ status: 404, json: { message: 'Not configured' } });
  });
  return calls;
}
test('all quick modes persist/reload, exchange multiselect is required, and disabling exchange clears active assets', async ({
  page,
}) => {
  const calls = await isolate(page);
  await page.goto('/en/stage1e');
  await page.locator('[name=saleMode][value=quickSale]').check();
  await page.locator('[name=quickSaleChoice][value=exchange]').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('sale-terms-editor').getByRole('alert')).toBeVisible();
  expect(calls).toHaveLength(0);
  for (const a of ['factory', 'villa', 'apartment', 'car'])
    await page.locator(`[name=acceptedExchangeAsset][value=${a}]`).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
  expect(calls.at(-1)).toMatchObject({
    acceptsCashProposals: false,
    acceptsInstallmentProposals: false,
    acceptsExchangeProposals: true,
    exchangeAssetTypes: ['factory', 'villa', 'apartment', 'car'],
  });
  await page.reload();
  await expect(page.locator('[name=acceptedExchangeAsset][value=villa]')).toBeChecked();
  await page.locator('[name=quickSaleChoice][value=both]').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => calls.length).toBe(2);
  expect(calls.at(-1)).toMatchObject({ acceptsInstallmentProposals: true, acceptsExchangeProposals: true });
  await page.locator('[name=quickSaleChoice][value=installment]').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => calls.length).toBe(3);
  expect(calls.at(-1)).toMatchObject({ acceptsExchangeProposals: false, exchangeAssetTypes: [] });
  await page.reload();
  await expect(page.locator('[name=quickSaleChoice][value=installment]')).toBeChecked();
  await page.locator('[name=saleMode][value=standardCash]').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => calls.length).toBe(4);
  expect(calls.at(-1)).toMatchObject({
    acceptsCashProposals: true,
    acceptsInstallmentProposals: false,
    acceptsExchangeProposals: false,
    exchangeAssetTypes: [],
  });
});
test('unchanged legacy cash and any-asset terms are never rewritten', async ({ page }) => {
  const calls = await isolate(page, true);
  await page.goto('/en/stage1e');
  await expect(page.getByText(/Existing sale terms/)).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
  expect(calls).toHaveLength(0);
  await page.getByRole('button', { name: 'Edit Quick Sale terms without cash', exact: true }).click();
  await page.locator('[name=acceptedExchangeAsset][value=car]').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => calls.length).toBe(1);
  expect(calls[0]).toMatchObject({
    acceptsCashProposals: false,
    acceptsInstallmentProposals: true,
    acceptsExchangeProposals: true,
    exchangePreferenceScope: 'selected',
    exchangeAssetTypes: ['car'],
  });
});
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390])
    test(`${locale} ${width} owner and real API query controls`, async ({ page }) => {
      await isolate(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/stage1e`);
      await page.locator('[name=saleMode][value=quickSale]').check();
      await page.locator('[name=quickSaleChoice][value=both]').check();
      await page.locator('[name=acceptedExchangeAsset][value=factory]').check();
      await page.locator('[name=acceptedExchangeAsset][value=villa]').check();
      await page
        .getByRole('checkbox', { name: locale === 'en' ? 'Installments' : 'تقسيط', exact: true })
        .locator('..')
        .click();
      await page
        .getByRole('checkbox', { name: locale === 'en' ? 'Exchange' : 'استبدال', exact: true })
        .locator('..')
        .click();
      await page
        .getByRole('checkbox', { name: locale === 'en' ? 'Car' : 'سيارة', exact: true })
        .last()
        .locator('..')
        .click();
      const query = JSON.parse((await page.getByTestId('query').textContent()) || '{}');
      expect(query.api).toMatchObject({ saleMethods: 'installment,exchange', exchangeAssetTypes: 'car' });
      expect(query.url).toMatchObject({ saleMethods: 'installment,exchange', exchangeAssetTypes: 'car' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const out = path.resolve(__dirname, '../../artifacts/stage1e/screenshots');
      await fs.mkdir(out, { recursive: true });
      await page.screenshot({ path: path.join(out, `${locale}-${width}.png`), fullPage: true, animations: 'disabled' });
      await buyerTerms(page);
      await page.goto(`/${locale}/stage1e?screen=buyer`);
      await page.locator('[name=proposalKind]').selectOption('exchange');
      await page.locator('[name=assetType]').selectOption('car');
      await page.locator('[name=assetValue]').fill('250000');
      await page.screenshot({
        path: path.join(out, `${locale}-${width}-buyer.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
