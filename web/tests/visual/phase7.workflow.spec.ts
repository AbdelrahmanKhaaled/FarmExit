import { test, expect } from '@playwright/test';
import { isolatePhase7 } from './phase7-fixtures';
const next = (page: import('@playwright/test').Page) =>
  page.getByTestId('phase7-actions').getByRole('button').last().click();
test('management saves a single private draft, retains values, and submits only after confirmed review', async ({
  page,
}) => {
  const calls = await isolatePhase7(page);
  await page.goto('/en/phase7/management-new');
  await next(page);
  expect(calls).toHaveLength(0);
  await next(page);
  await expect(page.locator('[data-phase7-task]').getByRole('alert')).toContainText('Choose a farm and professional');
  expect(calls).toHaveLength(0);
  await page.getByRole('radio', { name: 'Both', exact: true }).check();
  await page.getByRole('radio', { name: 'Production supervision', exact: true }).check();
  await page.locator('select[name=term]').selectOption('custom');
  await page.locator('[name=customTerm]').fill('One season');
  await next(page);
  await page.locator('[name=currentSituation]').fill('Owner-stated irrigation needs');
  await page.locator('[name=goals]').fill('Organise irrigation\nImprove harvest planning');
  await next(page);
  await page.getByTestId('phase7-actions').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('[name=currentSituation]')).toHaveValue('Owner-stated irrigation needs');
  for (let step = 3; step <= 6; step++) await next(page);
  await next(page);
  await expect(page.locator('[data-complete=true]')).toBeVisible();
  expect(calls.filter((c) => c.method === 'POST' && c.url.endsWith('/management-requests'))).toHaveLength(1);
  expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({
    professionalNeed: 'both',
    term: 'One season',
    currentSituation: 'Owner-stated irrigation needs',
    goals: ['Organise irrigation', 'Improve harvest planning'],
  });
  expect(JSON.stringify(calls)).not.toMatch(/ownerId|published|appointment|responsibilities|resources/);
});
test('professional profile, capability expertise, private upload and verification use existing contracts', async ({
  page,
}) => {
  const calls = await isolatePhase7(page);
  await page.goto('/en/phase7/professional-new');
  await page.getByRole('radio', { name: 'Agricultural engineer', exact: true }).check();
  await next(page);
  await page.locator('[name=headline]').fill('Agricultural engineer');
  await page.locator('[name=yearsExperience]').fill('7');
  await page.locator('select[name=baseGovernorate]').selectOption('Beheira');
  await page.locator('[name=bio]').fill('User-stated introduction');
  await next(page);
  await page.getByRole('checkbox', { name: 'Fruits', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Drip irrigation', exact: true }).check();
  await page
    .locator('details')
    .filter({ has: page.locator('input[name=otherServiceArea]') })
    .locator('summary')
    .click();
  await page.getByRole('checkbox', { name: 'Beheira', exact: true }).check();
  await page.locator('[name=otherServiceArea]').fill('Matrouh');
  await page.getByRole('button', { name: 'Add governorate', exact: true }).click();
  await next(page);
  await expect(page.getByTestId('request-documents-panel')).toBeVisible();
  const docs = page.getByTestId('request-documents-panel');
  await docs.locator('summary').click();
  await docs
    .getByTestId('document-file')
    .setInputFiles({ name: 'private.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nfixture') });
  await next(page);
  await expect(page.locator('[data-phase7-task]').getByRole('alert')).toContainText('Upload or clear');
  await docs.locator('button[type=submit]').click();
  await expect(docs.getByRole('status')).toBeVisible();
  await next(page);
  await next(page);
  await expect(page.locator('[data-complete=true]')).toBeVisible();
  expect(calls.filter((c) => c.url === '/api/professional-profile/capabilities' && c.method === 'POST')).toHaveLength(
    1,
  );
  expect(calls.find((c) => c.url === '/api/professional-profile' && c.method === 'PUT' && (c.body as { yearsExperience?: number })?.yearsExperience === 7)?.body).toMatchObject({
    yearsExperience: 7,
    baseGovernorate: 'Beheira',
  });
  expect(calls.find((c) => c.url.includes('/capabilities/') && c.method === 'PATCH')?.body).toMatchObject({
    serviceAreas: ['Beheira', 'Matrouh'],
    expertise: expect.arrayContaining([
      { expertiseType: 'farmActivity', expertiseValue: 'fruit' },
      { expertiseType: 'areaOfExpertise', expertiseValue: 'dripIrrigation' },
    ]),
  });
  expect(JSON.stringify(calls)).not.toMatch(/verificationStatus|verifiedAt|rating|phone/);
});
for (const kind of ['management', 'verification'])
  test(`${kind}: failed or malformed submission never claims success`, async ({ page }) => {
    const options = { fail: false, malformedSubmit: true };
    await isolatePhase7(page, options);
    await page.goto(`/en/phase7/${kind}-wizard?step=${kind === 'management' ? 7 : 5}`);
    await next(page);
    await expect(page.locator('[data-phase7-task]').getByRole('alert')).toBeVisible();
    await expect(page.locator('[data-complete=true]')).toHaveCount(0);
    options.malformedSubmit = false;
    await next(page);
    await expect(page.locator('[data-complete=true]')).toBeVisible();
  });
test('failed management save retains unsaved values; review status prevents edits and mutations', async ({ page }) => {
  const calls = await isolatePhase7(page, { fail: true });
  await page.goto('/en/phase7/management-wizard?step=3');
  await page.locator('[name=currentSituation]').fill('Unsaved owner correction');
  await next(page);
  await expect(page.locator('[data-phase7-task]').getByRole('alert')).toBeVisible();
  await expect(page.locator('[name=currentSituation]')).toHaveValue('Unsaved owner correction');
  await page.goto('/en/phase7/management-underReview');
  await expect(page.getByTestId('phase7-tracking')).toBeVisible();
  await expect(page.getByTestId('phase7-tracking').locator('input,textarea,button[type=submit]')).toHaveCount(0);
  expect(calls.filter((c) => c.url.endsWith('/submit'))).toHaveLength(0);
});
