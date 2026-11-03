import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const out = new URL('../../docs/evidence/six-fixes/', import.meta.url);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const locale of ['en', 'ar'])
    for (const width of [1440, 390]) {
      const messages = JSON.parse(
        readFileSync(new URL(`../../dashboard/messages/${locale}/admin.json`, import.meta.url)),
      );
      const token =
        'eyJhbGciOiJub25lIn0.' +
        Buffer.from(JSON.stringify({ sub: '900', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url') +
        '.fixture';
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addCookies([{ name: 'fx_admin_at', value: token, url: 'http://127.0.0.1:3599' }]);
      const page = await context.newPage();
      for (const type of [
        'farmListing',
        'farmManagement',
        'partnership',
        'farmDetails',
        'professionalVerification',
        'partnershipApplication',
      ]) {
        await fetch('http://127.0.0.1:4499/api/v1/fixture/reset', {
          method: 'POST',
          body: JSON.stringify({ requestType: type }),
        });
        await page.goto(`http://127.0.0.1:3599/${locale}/admin/requests/901`, { waitUntil: 'networkidle' });
        const button = page.getByRole('button', { name: messages.workflows.submitDecision, exact: true });
        await button.waitFor();
      await button.scrollIntoViewIfNeeded();
      await button.focus();
        await page.screenshot({
          path: fileURLToPath(new URL(`${locale}-${width}-admin-${type}.png`, out)),
          fullPage: true,
        });
        await button.click();
        await button.waitFor({ state: 'hidden' });
        await page.reload({ waitUntil: 'networkidle' });
        const request = await (await fetch('http://127.0.0.1:4499/api/v1/farm-management-requests/901')).json();
        assert.equal(request.status, 'approved');
        assert.equal(request.visibility, 'private');
        results.push({
          locale,
          width,
          type,
          passed: true,
          backend: 'mock API; verifies action wiring, not actual authorization or database',
        });
      }
      await context.close();
    }
} finally {
  await browser.close();
  writeFileSync(new URL('admin-browser-results.json', out), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
