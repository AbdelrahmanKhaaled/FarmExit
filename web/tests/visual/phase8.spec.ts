import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
async function isolate(page: Page, options: { fail?: boolean; malformed?: boolean } = {}) {
  const mutations: { method: string; url: string; body: Record<string, unknown> }[] = [];
  let state: Record<string, unknown> = {
    id: '8001',
    requestNumber: 'FX-VISUAL-8001',
    status: 'draft',
    farmId: '8002',
    farmName: 'Private visual test farm',
    applicantKind: 'individual',
    parentPartnershipRequestId: '8003',
    reviews: [],
  };
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()).pathname,
      method = req.method();
    const body = req.headers()['content-type']?.includes('application/json') ? req.postDataJSON() : {};
    if (method !== 'GET') mutations.push({ method, url, body });
    if (options.fail && method !== 'GET') return route.fulfill({ status: 503, json: { message: 'Isolated failure' } });
    if (url.endsWith('/sale-terms'))
      return route.fulfill({
        json: {
          saleMode: 'quickSale',
          configured: true,
          acceptsCashProposals: true,
          acceptsInstallmentProposals: true,
          acceptsExchangeProposals: true,
          exchangePreferenceScope: 'selected',
          exchangeAssetTypes: ['villa'],
        },
      });
    if (url.endsWith('/documents')) return route.fulfill({ json: [] });
    if (url.endsWith('/submit'))
      return route.fulfill({ json: { ...state, status: options.malformed ? 'draft' : 'underFarmExitReview' } });
    state = { ...state, ...body };
    return route.fulfill({ json: state });
  });
  return mutations;
}
const next = (page: Page) => page.getByTestId('phase7-actions').getByRole('button').last().click();
const nav = (page: Page, name: string) => page.locator('aside nav').getByRole('button', { name, exact: false }).click();
test('owner radio/check types, save-before-submit, disabled unsupported fields and confirmed success', async ({
  page,
}) => {
  const calls = await isolate(page);
  await page.goto('/en/phase8/owner');
  await next(page);
  await next(page);
  await expect(page.locator('p[role=alert]')).toContainText('Complete the required fields');
  await page.getByRole('radio', { name: 'Expand cultivation', exact: true }).check();
  await page.locator('[name=description]').fill('Owner-stated expansion');
  await next(page);
  await page.getByRole('checkbox', { name: 'Individual', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'Agriculture', exact: true })).toBeDisabled();
  await next(page);
  await page.locator('[name=contributionDetails]').fill('Technical expertise');
  await next(page);
  await page.locator('[name=operations]').fill('Current operations');
  await page.locator('[name=salesChannel]').selectOption('Local nurseries and traders');
  await next(page);
  await next(page);
  await next(page);
  await expect(page.locator('[data-complete=true]')).toBeVisible();
  expect(calls.filter((c) => c.method === 'POST' && c.url.includes('/farms/'))).toHaveLength(1);
  expect(calls.at(-2)?.body).toMatchObject({
    description: 'Owner-stated expansion',
    objective: ['Expand cultivation'],
    acceptedPartnerTypes: ['individual'],
    contributionDetails: 'Technical expertise',
    operations: 'Current operations',
    salesChannel: 'Local nurseries and traders',
  });
  expect(JSON.stringify(calls)).not.toMatch(/partnerBackground|currentTeam|published|visibility/);
});
test('company radio type is immutable once saved; all supported company fields are included', async ({ page }) => {
  const calls = await isolate(page);
  await page.goto('/en/phase8/application');
  await page.getByRole('radio', { name: 'Company', exact: true }).check();
  await next(page);
  await page.locator('[name=companyName]').fill('Applicant company');
  await page.locator('[name=companyContactName]').fill('Authorized person');
  await page.locator('[name=companyRegistrationNumber]').fill('REG-12');
  await page.locator('[name=companyContactRole]').selectOption('Authorized representative');
  await page.locator('[name=relevantExperience]').fill('Agricultural operations');
  await next(page);
  await page.locator('[name=whyGoodFit]').fill('Relevant expertise');
  await next(page);
  await next(page);
  await next(page);
  await expect(page.locator('[data-complete=true]')).toBeVisible();
  expect(calls[0]?.body).toMatchObject({ applicantKind: 'company', parentPartnershipRequestId: '8003' });
  expect(calls.at(-2)?.body).toMatchObject({
    companyName: 'Applicant company',
    companyRegistrationNumber: 'REG-12',
    companyContactName: 'Authorized person',
    relevantExperience: 'Agricultural operations',
    whyGoodFit: 'Relevant expertise',
  });
});
test('network failure retains input and a non-review submit response cannot show success', async ({ page }) => {
  await isolate(page, { fail: true });
  await page.goto('/en/phase8/owner-edit');
  await page.locator('[name=description]').fill('Keep this unsaved value');
  await next(page);
  await expect(page.locator('p[role=alert]')).toContainText('Isolated failure');
  await expect(page.locator('[name=description]')).toHaveValue('Keep this unsaved value');
  await page.unroute('**/api/**');
  await isolate(page, { malformed: true });
  await nav(page, 'Review & submit');
  await next(page);
  await expect(page.locator('[data-complete=true]')).toHaveCount(0);
  await expect(page.locator('p[role=alert]')).toBeVisible();
});
test('co-purchase validates share and serializes private nonbinding interest; errors retain values', async ({
  page,
}) => {
  const calls = await isolate(page, { fail: true });
  await page.goto('/en/phase8/proposal');
  await page.locator('[name=proposalKind]').selectOption('coPurchase');
  await page.locator('[name=sharePercent]').fill('100.01');
  await page.getByRole('button', { name: 'Submit proposal', exact: true }).click();
  expect(calls).toHaveLength(0);
  await page.locator('[name=sharePercent]').fill('25.50');
  await page.getByRole('button', { name: 'Submit proposal', exact: true }).click();
  await expect(page.locator('p[role=alert]')).toBeVisible();
  await expect(page.locator('[name=sharePercent]')).toHaveValue('25.50');
  expect(calls[0]?.body).toMatchObject({ proposalKind: 'coPurchase', requestedSharePercent: 25.5, components: [] });
});
for (const locale of ['en', 'ar'])
  for (const width of [1440, 1024, 390])
    test(`${locale} ${width}: all owner/application steps, tracking and proposal layouts`, async ({ page }) => {
      await isolate(page);
      await page.setViewportSize({ width, height: 900 });
      const out = path.resolve(__dirname, '../../artifacts/phase8/visual');
      await fs.mkdir(out, { recursive: true });
      for (const screen of [
        'owner-edit',
        'individual',
        'company',
        'corrections',
        'tracking',
        'list',
        'proposal',
        'proposal-edit',
      ]) {
        await page.goto(`/${locale}/phase8/${screen}`);
        await page.evaluate(() => document.fonts.ready);
        if (['owner-edit', 'individual', 'company', 'corrections'].includes(screen))
          await expect(page.locator('[data-ready=true]')).toBeVisible();
        if (screen === 'proposal') await expect(page.locator('[name=proposalKind]')).toBeVisible();
        if (screen === 'proposal-edit') {
          await page.getByTestId('proposal-detail').getByRole('button').first().click();
          await expect(page.locator('[name=sharePercent]')).toBeVisible();
        }
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
        await page.screenshot({
          path: path.join(out, `${locale}-${width}-${screen}.png`),
          fullPage: true,
          animations: 'disabled',
        });
        if (screen === 'proposal') {
          await page.locator('[name=proposalKind]').selectOption('coPurchase');
          await page.screenshot({ path: path.join(out, `${locale}-${width}-co-purchase.png`), fullPage: true, animations: 'disabled' });
        }
        if (screen === 'owner-edit' || screen === 'individual' || screen === 'company') {
          const max = screen === 'owner-edit' ? 7 : 5;
          for (let step = 2; step < max; step++) {
            await next(page);
            await expect(page.getByTestId('phase7-actions').getByRole('button').last()).toBeEnabled();
            await page.screenshot({
              path: path.join(out, `${locale}-${width}-${screen}-step${step + 1}.png`),
              fullPage: true,
              animations: 'disabled',
            });
          }
          if (width === 1440) {
            const cols = await page
              .getByTestId('phase7-task-grid')
              .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' '));
            expect(cols).toHaveLength(3);
          }
          expect(await page.getByTestId('phase7-actions').evaluate((el) => getComputedStyle(el).position)).toBe(
            'static',
          );
        }
      }
    });
