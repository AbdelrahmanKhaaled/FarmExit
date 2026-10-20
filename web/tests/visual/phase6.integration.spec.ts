import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { isolatePhase6 } from './phase6-fixtures';
test('seven-step flow retains data, saves one farm, uses rent units and submits only after confirmation', async ({
  page,
}) => {
  const requests = await isolatePhase6(page);
  await page.goto('/en/phase6/new');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByTestId('add-farm-wizard').getByRole('alert')).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.locator('input[name=name]:visible').fill('Owner-stated test farm');
  await page.locator('input[name=farmType][value=fruit]').check();
  await page.locator('input[name=areaFeddan]:visible').fill('12.5');
  await page.locator('input[name=mainActivity]:visible').fill('Citrus');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  expect(requests).toHaveLength(0);
  await page.locator('select[name=governorate]:visible').selectOption('Beni Suef');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Agriculture & facilities', exact: true })).toBeVisible();
  await page.locator('select[name=waterSource]').selectOption('well');
  expect(requests.filter((r) => r.url === '/api/farms' && r.method === 'POST')).toHaveLength(1);
  await page.locator('details').filter({ hasText: 'Production & current crops' }).locator('summary').click();
  await page.locator('input[name=currentProduction]:visible').fill('Owner-stated citrus production');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('input[name=name]:visible')).toHaveValue('Owner-stated test farm');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('input[name=currentProduction]:visible')).toHaveValue('Owner-stated citrus production');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[name=listingType]:visible').nth(1).check();
  await page.locator('input[name=annualRentPerFeddan]:visible').fill('18000');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Show FarmExit your farm', exact: true })).toBeVisible();
  const listing = requests.find((r) => r.url === '/api/farms/1001/listing-requests');
  expect(listing?.body).toMatchObject({
    listingType: 'rent',
    annualRentPerFeddan: 18000,
    askingPrice: null,
    statedSalePricePerFeddan: null,
  });
  expect(JSON.stringify(requests)).not.toMatch(/preciseLatitude|preciseLongitude|ownerId|publishedAt|farmExitScore/);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByTestId('request-documents-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Submit for FarmExit review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your farm was submitted' })).toBeVisible();
  expect(requests.filter((r) => r.url === '/api/farms' && r.method === 'POST')).toHaveLength(1);
  expect(requests.filter((r) => r.url === '/api/farms/1001/listing-requests' && r.method === 'POST')).toHaveLength(1);
});
test('failed save keeps values and does not claim a saved draft', async ({ page }) => {
  await isolatePhase6(page, 'en', { saveError: true });
  await page.goto('/en/phase6/wizard');
  await page.locator('input[name=name]:visible').fill('Unsaved correction');
  await page.getByRole('button', { name: 'Save & exit', exact: true }).click();
  await expect(page.getByTestId('add-farm-wizard').getByRole('alert')).toBeVisible();
  await expect(page.locator('input[name=name]:visible')).toHaveValue('Unsaved correction');
  await expect(page.locator('span[role=status]').filter({ hasText: 'Unsaved changes' })).toBeVisible();
  await expect(page).toHaveURL(/phase6\/wizard/);
});
test('failed photo and document uploads remain errors and can be retried; no false uploaded state', async ({
  page,
}) => {
  await isolatePhase6(page, 'en', { uploadError: true });
  await page.goto('/en/phase6/wizard?step=5');
  const media = page.getByTestId('farm-media-panel');
  await media
    .locator('input[type=file]')
    .setInputFiles(resolve(__dirname, '../../public/images/home/farm-wadi-el-natrun.jpg'));
  await media.locator('button[type=submit]').click();
  await expect(media.getByRole('alert')).toBeVisible();
  await expect(media.locator('input[type=file]')).not.toHaveValue('');
  await page.goto('/en/phase6/wizard?step=6');
  const docs = page.getByTestId('request-documents-panel');
  await docs.locator('summary').filter({ hasText: 'Additional documents' }).click();
  await docs.getByTestId('document-file').setInputFiles({
    name: 'visual-only.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nvisual fixture'),
  });
  await docs.getByRole('button', { name: 'Upload document', exact: true }).click();
  await expect(docs.getByRole('alert')).toBeVisible();
  await expect(docs.getByRole('status')).toHaveCount(0);
});
test('authorized replacement appends a same-slot copy and preserves prior document metadata', async ({ page }) => {
  const requests = await isolatePhase6(page);
  await page.goto('/en/phase6/changes');
  const panel = page.getByTestId('request-documents-panel');
  await panel.getByRole('button', { name: 'Upload new copy', exact: true }).click();
  await expect(panel.locator('input[name=slotKey]')).toHaveCount(0);
  await expect(panel.getByText('Uploading a new copy of the selected document')).toBeVisible();
  await panel.getByTestId('document-file').setInputFiles({
    name: 'new-copy.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nvisual fixture'),
  });
  await panel.getByRole('button', { name: 'Upload document', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('Uploaded');
  await panel.getByText('Earlier copies', { exact: true }).click();
  await expect(panel.getByText(/visual-reference.pdf/)).toBeVisible();
  expect(requests.filter((r) => r.url === '/api/requests/2001/documents' && r.method === 'POST')).toHaveLength(1);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Resubmit for FarmExit review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your farm was submitted' })).toBeVisible();
});
test('review status is read-only and submit failure cannot become a success screen', async ({ page }) => {
  const state = { submitError: true };
  const requests = await isolatePhase6(page, 'en', state);
  await page.goto('/en/phase6/readonly');
  await expect(page.getByTestId('document-file')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Submit for FarmExit review', exact: true })).toBeDisabled();
  expect(requests).toHaveLength(0);
  await page.goto('/en/phase6/wizard?step=7');
  await page.getByRole('button', { name: 'Submit for FarmExit review', exact: true }).click();
  await expect(page.getByTestId('add-farm-wizard').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your farm was submitted' })).toHaveCount(0);
  state.submitError = false;
  await page.getByRole('button', { name: 'Submit for FarmExit review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your farm was submitted' })).toBeVisible();
  expect(requests.filter((r) => r.url === '/api/farms/1001/listing-requests')).toHaveLength(0);
});
