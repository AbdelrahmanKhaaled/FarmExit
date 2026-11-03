import { chromium, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const state = JSON.parse(readFileSync(path.join(tmpdir(), 'farmexit-publication-language-state.json')));
const base = 'http://127.0.0.1:3501', adminBase = 'http://127.0.0.1:3601';
const out = new URL('../../docs/evidence/publication-language/', import.meta.url);
mkdirSync(out, { recursive: true });
const ar = JSON.parse(readFileSync(new URL('../messages/ar/workspace.json', import.meta.url)));
const en = JSON.parse(readFileSync(new URL('../messages/en/workspace.json', import.meta.url)));
const results = [], errors = [];
const browser = await chromium.launch({ headless: true });
let currentPage;
async function api(endpoint, method = 'GET', body, token = state.owner.accessToken) {
  const res = await fetch('http://127.0.0.1:4501/api/v1' + endpoint, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await res.json(); if (!res.ok) throw Error(`${method} ${endpoint}: ${res.status} ${JSON.stringify(data)}`); return data;
}
async function screenshot(page, name) { await page.screenshot({ path: fileURLToPath(new URL(name + '.png', out)), fullPage: true }); }
const switcher = page => page.locator('[data-testid="wizard-language-switch"]:visible').first();
async function switchTo(page, locale) {
  await expect(switcher(page)).toBeEnabled({ timeout: 120000 });
  await switcher(page).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect.poll(() => new URL(page.url()).pathname.startsWith('/' + locale + '/')).toBe(true);
}
async function openEditor(page, name) {
  if (name === 'verification') await page.locator('summary').filter({ hasText: ar.professionalVerification.summary }).click();
  return page.locator('textarea:visible:enabled').first();
}
try {
  for (const width of [390, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addCookies([{ name: 'fx_web_at', value: state.owner.accessToken, url: base }]);
    const page = currentPage = await context.newPage(); page.setDefaultTimeout(120000);
    page.on('dialog', dialog => dialog.accept());
    page.on('pageerror', error => errors.push(error.message));
    let writes = 0; page.on('request', request => { if (request.url().includes('/api/') && ['PATCH', 'POST', 'PUT'].includes(request.method())) writes++; });
    const management = await api(`/farms/${state.farmId}/management-requests`, 'POST', { professionalNeed: 'farmManager', currentSituation: 'Browser management description', localizedContent: { en: { currentSituation: 'English browser management description' }, ar: { currentSituation: 'وصف إدارة من المتصفح' } } });
    const cases = [
      { name: 'new-farm', route: '/my/farms/new?step=1&returnTo=%2Far%2Fmy%2Ffarms', step: '1' },
      { name: 'listing', route: `/my/farms/${state.wizardFarmId}/list?listingId=${state.listingId}&step=4`, step: '4' },
      { name: 'management', route: `/my/management/${management.id}?step=3`, step: '3' },
      { name: 'partnership', route: `/my/partnerships/${state.wizardPartnershipId}?step=2`, step: '2' },
      { name: 'application', route: `/my/applications/${state.applicationId}?step=2`, step: '2' },
      { name: 'professional', route: '/my/professional?step=2', step: '2' },
      { name: 'verification', route: `/my/professional/verification/${state.verificationId}?step=4`, step: '4' },
    ];
    for (const flow of cases) {
      console.log(`Checking ${flow.name} at ${width}px`);
      await page.goto(base + '/ar' + flow.route, { waitUntil: 'networkidle', timeout: 180000 });
      await expect(switcher(page)).toBeEnabled();
      const field = await openEditor(page, flow.name);
      const value = `اختبار ${flow.name} ${width}`;
      await field.fill(value);
      const originalLanguage = await field.getAttribute('lang');
      const before = new URL(page.url()), beforeWrites = writes;
      await switchTo(page, 'en');
      expect(await field.inputValue()).toBe(value);
      expect(await field.getAttribute('lang')).toBe(originalLanguage);
      expect(new URL(page.url()).searchParams.get('step')).toBe(flow.step);
      expect(new URL(page.url()).pathname.slice(3)).toBe(before.pathname.slice(3));
      expect(new URL(page.url()).searchParams.get('listingId')).toBe(before.searchParams.get('listingId'));
      await screenshot(page, `${flow.name}-en-${width}`);
      await switchTo(page, 'ar');
      expect(await field.inputValue()).toBe(value); expect(writes).toBe(beforeWrites);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await screenshot(page, `${flow.name}-ar-${width}`);
      if (flow.name === 'new-farm') {
        await page.locator('input[name="farmType"][value="fruit"]').check();
        await page.locator('input[name="areaFeddan"]').fill('25');
        await page.getByTestId('wizard-actions').getByRole('button', { name: ar.wizard.continue, exact: false }).click();
        await expect(page.locator('select[name="governorate"]:visible')).toBeVisible();
        await page.locator('select[name="governorate"]:visible').selectOption('Giza');
        await page.getByTestId('wizard-actions').getByRole('button', { name: ar.wizard.continue, exact: false }).click();
        await expect.poll(() => new URL(page.url()).pathname.includes('/list')).toBe(true);
        const id = new URL(page.url()).pathname.split('/')[4];
        const saved = await api(`/farms/${id}`); expect(saved.localizedContent.ar.name).toBe(value);
        await page.reload({ waitUntil: 'networkidle' });
        expect(new URL(page.url()).searchParams.get('step')).toBe('3');
      } else if (flow.name === 'listing') {
        await page.getByTestId('wizard-actions').getByRole('button', { name: ar.wizard.continue, exact: false }).click();
        await expect.poll(() => new URL(page.url()).searchParams.get('step')).toBe('5');
        await page.goto(base + '/ar' + flow.route, { waitUntil: 'networkidle' });
        expect(await (await openEditor(page, flow.name)).inputValue()).toBe(value);
      } else {
        await page.locator('header').getByRole('button', { name: ar.phase7.saveExit, exact: true }).click();
        await page.waitForLoadState('networkidle');
        await page.goto(base + '/ar' + flow.route, { waitUntil: 'networkidle' });
        expect(await (await openEditor(page, flow.name)).inputValue()).toBe(value);
      }
      results.push({ flow: flow.name, width, languages: ['ar', 'en'], preservedStep: flow.step, savedAndReloaded: true, backend: 'Real Nest API + disposable MySQL' });
    }
    // A File object remains in the same mounted input through locale switches; it is never serialized.
    await page.goto(`${base}/ar/my/management/${management.id}?step=6`, { waitUntil: 'networkidle' });
    const file = page.getByTestId('document-file');
    await file.setInputFiles({ name: 'isolated-language-test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nIsolated test\n%%EOF') });
    await switchTo(page, 'en'); expect(await file.evaluate(e => e.files[0].name)).toBe('isolated-language-test.pdf');
    await switchTo(page, 'ar'); expect(await file.evaluate(e => e.files[0].name)).toBe('isolated-language-test.pdf');
    await file.setInputFiles([]);
    results.push({ flow: 'pending-file', width, preserved: true });
    await page.goto(`${base}/ar/my/management/${management.id}?step=7`, { waitUntil: 'networkidle' });
    await page.locator('input[name="publicationConsent"]:visible').check();
    const submit = page.waitForResponse(r => r.url().endsWith(`/farm-management-requests/${management.id}/submit`) && r.request().method() === 'POST');
    await page.getByTestId('phase7-actions').getByRole('button').last().click(); expect((await submit).status()).toBe(201);
    const hidden = await fetch(`http://127.0.0.1:4501/api/v1/public/management/${management.id}`); expect(hidden.status).toBe(404);
    const adminContext = await browser.newContext({ viewport: { width, height: 900 } });
    const login = await adminContext.request.post(adminBase + '/api/admin/auth/login', { data: { email: state.identities.superAdmin.email, password: state.password } }); expect(login.status()).toBe(200);
    const admin = currentPage = await adminContext.newPage(); admin.setDefaultTimeout(120000);
    const locale = width === 390 || width === 1024 ? 'ar' : 'en';
    const adminMessages = JSON.parse(readFileSync(new URL(`../../dashboard/messages/${locale}/admin.json`, import.meta.url)));
    await admin.goto(`${adminBase}/${locale}/admin/requests/${management.id}`, { waitUntil: 'networkidle', timeout: 180000 });
    const decide = admin.getByRole('button', { name: adminMessages.workflows.submitDecision, exact: true });
    await decide.scrollIntoViewIfNeeded(); await screenshot(admin, `approve-publish-${locale}-${width}`);
    await decide.click(); await expect(admin.getByText(adminMessages.workflows.approvedPublished, { exact: true }).first()).toBeVisible();
    const published = await api(`/public/management/${management.id}`); expect(published.id).toBe(management.id);
    await admin.reload({ waitUntil: 'networkidle' }); await expect(admin.getByText(adminMessages.workflows.approvedPublished, { exact: true }).first()).toBeVisible();
    for (const publicLocale of ['ar', 'en']) {
      await page.goto(`${base}/${publicLocale}/management?id=${management.id}&q=${encodeURIComponent(state.farmName)}`, { waitUntil: 'networkidle', timeout: 180000 });
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('dir', publicLocale === 'ar' ? 'rtl' : 'ltr');
      await screenshot(page, `published-marketplace-${publicLocale}-${width}`);
    }
    results.push({ flow: 'browser-approval-to-marketplace', width, requestId: management.id, realDatabase: true, bothLocales: true });
    await adminContext.close(); await context.close();
  }
} catch (error) {
  if (currentPage && !currentPage.isClosed()) { await screenshot(currentPage, 'failure'); console.log((await currentPage.locator('[role="alert"]').allTextContents()).join('\n')); }
  throw error;
} finally {
  await browser.close(); writeFileSync(new URL('real-browser-results.json', out), JSON.stringify({ results, errors }, null, 2));
}
console.log(JSON.stringify({ passed: results.length, errors }, null, 2));
