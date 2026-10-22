/* Live BFF/browser smoke using isolated fixtures and the normal OTP session flow. No stored tokens. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { assertLocalDevelopment } = require('./client-demo-safety.cjs');
const { PEOPLE } = require('./seed-client-demo.cjs');
const root = path.resolve(__dirname, '..');
const load = (module) => require(path.join(root, 'dist', module));

async function main() {
  require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
  console.log('Database target:', assertLocalDevelopment(process.env, ['--apply', '--confirm-local-development']));
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = load('app.module');
  const { configureApp } = load('common/app-setup');
  const { FarmExitSocketIoAdapter } = load('common/socket-io.adapter');
  const { ConfigService } = require('@nestjs/config');
  const { SMS_PROVIDER } = load('modules/auth/sms/sms-provider');
  const { PrismaService } = load('prisma/prisma.service');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useWebSocketAdapter(new FarmExitSocketIoAdapter(app, app.get(ConfigService).get('SOCKET_IO_PATH')));
  configureApp(app);
  const { chromium } = require(path.join(root, '..', 'web', 'node_modules', '@playwright/test'));
  const evidence = [];
  const outDir = path.join(root, '..', 'docs', 'artifacts', 'client-demo-browser');
  fs.mkdirSync(outDir, { recursive: true });
  let browser;
  try {
    await app.listen(4001, '127.0.0.1');
    const prisma = app.get(PrismaService);
    const owner = await prisma.user.findUniqueOrThrow({ where: { mobileE164: PEOPLE[0][1] } });
    const applicant = await prisma.user.findUniqueOrThrow({ where: { mobileE164: PEOPLE[1][1] } });
    assert.equal(owner.fullName, PEOPLE[0][2]);
    assert.equal(applicant.fullName, PEOPLE[1][2]);
    const mgt = await prisma.request.findUniqueOrThrow({ where: { requestNumber: 'DEMO-MP-MGT-01' } });
    const part = await prisma.request.findUniqueOrThrow({ where: { requestNumber: 'DEMO-MP-PART-01' } });
    const application = await prisma.request.findFirstOrThrow({
      where: { parentRequestId: part.id, createdBy: applicant.id, requestType: 'partnershipApplication' },
    });
    const mgtCase = await prisma.communicationCase.findFirstOrThrow({ where: { requestId: mgt.id } });
    const appCase = await prisma.communicationCase.findFirstOrThrow({ where: { requestId: application.id } });
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      baseURL: 'http://localhost:3000',
      viewport: { width: 1440, height: 1000 },
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).port === '4000' ? route.abort() : route.continue(),
    );
    const page = await context.newPage();
    async function view(route, expectedText, screenshot) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 });
      assert.equal(response.status(), 200);
      if (expectedText) await page.getByText(expectedText, { exact: false }).first().waitFor({ timeout: 20000 });
      if (screenshot) await page.screenshot({ path: path.join(outDir, screenshot + '.png'), fullPage: true });
      evidence.push({ scenario: route, status: 'LIVE VERIFIED', http: response.status() });
    }
    for (const locale of ['en', 'ar']) {
      for (const kind of ['management', 'partnerships']) {
        await view(
          `/${locale}/${kind}`,
          locale === 'en' ? 'No published opportunities available yet.' : 'لا توجد فرص منشورة حالياً.',
          `${locale}-${kind}`,
        );
        assert.equal(await page.getByText('[DEMO] Citrus Orchard Management').count(), 0);
      }
    }
    await page.goto(`/en/my/applications/new?parentPartnershipRequestId=${part.id}`, { waitUntil: 'networkidle' });
    await page.waitForURL(/\/sign-in/, { timeout: 60000 });
    evidence.push({
      scenario: 'Logged-out application form redirects to sign-in with return path',
      status: 'LIVE VERIFIED',
    });
    async function login(key) {
      const person = PEOPLE.find(([name]) => name === key);
      let result = await context.request.post('/api/auth/otp/request', { data: { mobile: person[1] } });
      if (result.status() === 429) {
        const data = await result.json();
        assert(data.retryAfterSeconds > 0 && data.retryAfterSeconds <= 60);
        await new Promise((resolve) => setTimeout(resolve, (data.retryAfterSeconds + 0.1) * 1000));
        result = await context.request.post('/api/auth/otp/request', { data: { mobile: person[1] } });
      }
      assert.equal(result.status(), 200);
      const code = app.get(SMS_PROVIDER).lastCodeFor(person[1]);
      assert(code);
      const verified = await context.request.post('/api/auth/otp/verify', { data: { mobile: person[1], code } });
      assert.equal(verified.status(), 200);
      const me = await context.request.get('/api/auth/me');
      assert.equal(me.status(), 200);
      evidence.push({ scenario: `${key}: real Website BFF OTP and HttpOnly cookie session`, status: 'LIVE VERIFIED' });
    }
    await login('owner');
    await view(`/en/my/management/${mgt.id}`, 'DEMO-MP-MGT-01', 'owner-management-detail');
    await view(`/ar/my/management/${mgt.id}`, 'DEMO-MP-MGT-01', 'ar-owner-management-detail');
    await view('/en/my/requests', 'DEMO-MP-MGT-01');
    await view(`/en/my/messages/${mgtCase.id}`, '[DEMO]', 'owner-communication');
    assert.equal((await context.request.get(`/api/partnership-applications/${application.id}`)).status(), 404);
    await context.request.post('/api/auth/logout');
    assert.equal((await context.request.get('/api/auth/me')).status(), 401);
    await login('applicant');
    await view(`/en/my/applications/${application.id}`, /approved/i, 'applicant-detail');
    await view(`/ar/my/applications/${application.id}`, null, 'ar-applicant-detail');
    await view('/en/my/applications', null);
    await view(`/en/my/messages/${appCase.id}`, '[DEMO]', 'applicant-communication');
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('[DEMO]', { exact: false }).first().waitFor();
    evidence.push({ scenario: 'Applicant conversation refresh preserves persisted messages', status: 'LIVE VERIFIED' });
    await context.request.post('/api/auth/logout');
    assert.equal((await context.request.get(`/api/partnership-applications/${application.id}`)).status(), 401);
    await page.goto(`/en/my/applications/${application.id}`, { waitUntil: 'networkidle' });
    assert(page.url().includes('/sign-in'));
    evidence.push({ scenario: 'Logout blocks protected API and refreshed customer page', status: 'LIVE VERIFIED' });
    await context.close();
  } catch (error) {
    evidence.push({ scenario: 'Browser verification stopped', status: 'FAILED', cause: error.message });
    throw error;
  } finally {
    fs.writeFileSync(
      path.join(outDir, 'evidence.json'),
      JSON.stringify({ date: new Date().toISOString(), evidence }, null, 2),
    );
    console.log(JSON.stringify(evidence));
    if (browser) await browser.close();
    await app.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
