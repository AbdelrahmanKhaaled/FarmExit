import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const out = new URL('../../docs/evidence/six-fixes/', import.meta.url);
const browser = await chromium.launch({ headless: true });
const results = [];
async function enterBoth(page, suffix) {
  const editor = page.locator('textarea:visible').first().locator('xpath=ancestor::section[1]');
  await editor.getByRole('button', { name: /English/ }).click();
  await editor.locator('textarea').fill('Original English narrative ' + suffix);
  await editor.getByRole('button', { name: /العربية/ }).click();
  await editor.locator('textarea').fill('نص عربي أصلي ' + suffix);
}
try {
  for (const locale of ['en', 'ar']) for (const width of [1440, 390]) {
    const messages = JSON.parse(readFileSync(new URL(`../messages/${locale}/workspace.json`, import.meta.url)));
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const token = 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url') + '.fixture';
    await context.addCookies([{ name: 'fx_web_at', value: token, url: 'http://127.0.0.1:3499' }]);
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:3499/${locale}/my/professional/verification/903`, { waitUntil: 'networkidle' });
    await page.locator('summary').filter({ hasText: messages.professionalVerification.summary }).click();
    await enterBoth(page, `${locale}-${width}`);
    const saved = page.waitForResponse(r => r.url().endsWith('/api/professional-verification-requests/903') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: messages.professionalVerification.save, exact: true }).click();
    assert.equal((await saved).status(), 200);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('summary').filter({ hasText: messages.professionalVerification.summary }).click();
    assert.equal(await page.locator('textarea:visible').inputValue(), (locale === 'ar' ? 'نص عربي أصلي ' : 'Original English narrative ') + `${locale}-${width}`);
    await page.screenshot({ path: fileURLToPath(new URL(`${locale}-${width}-verification-summary.png`, out)), fullPage: true });
    await page.goto(`http://127.0.0.1:3499/${locale}/my/proposals/904`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: messages.proposals.edit, exact: true }).click();
    await enterBoth(page, `${locale}-${width}`);
    const updated = page.waitForResponse(r => r.url().endsWith('/api/purchase-proposals/904') && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: messages.proposals.save, exact: true }).click();
    assert.equal((await updated).status(), 200);
    await page.reload({ waitUntil: 'networkidle' });
    assert.ok((await page.locator('main').innerText()).includes((locale === 'ar' ? 'نص عربي أصلي ' : 'Original English narrative ') + `${locale}-${width}`));
    await page.screenshot({ path: fileURLToPath(new URL(`${locale}-${width}-proposal-notes.png`, out)), fullPage: true });
    results.push({ locale, width, passed: true, backend: 'mock API only; migration and database unverified' });
    await context.close();
  }
} finally { await browser.close(); writeFileSync(new URL('narrative-browser-results.json', out), JSON.stringify(results, null, 2)); }
console.log(JSON.stringify(results, null, 2));
