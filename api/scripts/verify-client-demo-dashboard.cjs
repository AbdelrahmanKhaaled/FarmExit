const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { assertLocalDevelopment } = require('./client-demo-safety.cjs');
const { PEOPLE } = require('./seed-client-demo.cjs');
const root = path.resolve(__dirname, '..');
const load = (module) => require(path.join(root, 'dist', module));

async function main() {
  require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
  console.log('Database target:', assertLocalDevelopment(process.env, ['--apply', '--confirm-local-development']));
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = load('app.module');
  const { PrismaService } = load('prisma/prisma.service');
  const { configureApp } = load('common/app-setup');
  const { FarmExitSocketIoAdapter } = load('common/socket-io.adapter');
  const { ConfigService } = require('@nestjs/config');
  const { chromium } = require(path.join(root, '..', 'web', 'node_modules', '@playwright/test'));
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useWebSocketAdapter(new FarmExitSocketIoAdapter(app, app.get(ConfigService).get('SOCKET_IO_PATH')));
  configureApp(app);
  let browser;
  const evidence = [];
  const out = path.join(root, '..', 'docs', 'artifacts', 'client-demo-browser');
  try {
    const prisma = app.get(PrismaService);
    const [database] = await prisma.$queryRaw`SELECT DATABASE() AS databaseName, @@hostname AS serverHostname`;
    assert.equal(database.databaseName, 'farmexit');
    assert.equal(database.serverHostname.toLowerCase(), require('node:os').hostname().toLowerCase());
    await app.listen(4001, '127.0.0.1');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      baseURL: 'http://localhost:3002',
      viewport: { width: 1440, height: 1000 },
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).port === '4000' ? route.abort() : route.continue(),
    );
    const person = PEOPLE.find(([key]) => key === 'reviewer');
    const staff = await prisma.user.findUniqueOrThrow({ where: { mobileE164: person[1] } });
    assert.equal(staff.fullName, person[2]);
    assert.equal(staff.email, 'client-demo-reviewer@farmexit.invalid');
    const password = randomBytes(32).toString('base64url');
    await prisma.adminCredential.update({
      where: { userId: staff.id },
      data: { passwordHash: await require('argon2').hash(password) },
    });
    await prisma.auditLog.create({
      data: {
        actorUserId: staff.id,
        entityType: 'user',
        entityId: staff.id,
        action: 'client_demo_verification_credential_rotated',
        changes: { synthetic: true },
      },
    });
    const login = await context.request.post('/api/admin/auth/login', {
      data: { email: staff.email, password },
      timeout: 60000,
    });
    assert.equal(login.status(), 200);
    evidence.push({
      scenario: 'Dashboard BFF email/password login with Dashboard JWT cookie',
      status: 'LIVE VERIFIED',
    });
    const mgt = await prisma.request.findUniqueOrThrow({ where: { requestNumber: 'DEMO-MP-MGT-01' } });
    const part = await prisma.request.findUniqueOrThrow({ where: { requestNumber: 'DEMO-MP-PART-01' } });
    const applicant = await prisma.user.findUniqueOrThrow({ where: { mobileE164: PEOPLE[1][1] } });
    const application = await prisma.request.findFirstOrThrow({
      where: { parentRequestId: part.id, createdBy: applicant.id, requestType: 'partnershipApplication' },
    });
    const mgtCase = await prisma.communicationCase.findFirstOrThrow({ where: { requestId: mgt.id } });
    const appCase = await prisma.communicationCase.findFirstOrThrow({ where: { requestId: application.id } });
    const routes = [
      [`/en/admin/farm-management/${mgt.id}`, mgt.requestNumber, 'dashboard-management'],
      [`/ar/admin/farm-management/${mgt.id}`, mgt.requestNumber, 'ar-dashboard-management'],
      [`/en/admin/partnerships/${part.id}`, part.requestNumber, 'dashboard-partnership'],
      [`/en/admin/partnerships/applications/${application.id}`, application.requestNumber, 'dashboard-application'],
      [`/en/admin/communications/${mgtCase.id}`, '[DEMO]', 'dashboard-management-case'],
      [`/en/admin/communications/${appCase.id}`, '[DEMO]', 'dashboard-application-case'],
    ];
    const page = await context.newPage();
    for (const [route, text, screenshot] of routes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 });
      assert.equal(response.status(), 200);
      await page.getByText(text, { exact: false }).first().waitFor({ timeout: 20000 });
      await page.screenshot({ path: path.join(out, screenshot + '.png'), fullPage: true });
      evidence.push({ scenario: route, status: 'LIVE VERIFIED', http: response.status() });
    }
    await context.request.post('/api/admin/auth/logout');
    await context.close();
  } catch (error) {
    evidence.push({ scenario: 'Dashboard browser smoke stopped', status: 'FAILED', cause: error.message });
    throw error;
  } finally {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, 'dashboard-evidence.json'),
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
