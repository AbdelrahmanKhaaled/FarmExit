// Local-only browser/API verification. Creates and removes only its own synthetic fixtures.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomBytes, randomInt } = require('node:crypto');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
require('./client-demo-safety.cjs').assertLocalDevelopment(process.env, ['--apply', '--confirm-local-development']);
const { PrismaClient } = require('../dist/generated/prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { toMariaDbPoolConfig } = require('../dist/prisma/database-url');
const { chromium } = require('../../dashboard/node_modules/@playwright/test');
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(toMariaDbPoolConfig(process.env.DATABASE_URL)) });
const suffix = randomBytes(6).toString('hex');
const password = `VerifyAa12${randomBytes(18).toString('hex')}`;
const email = `batch2-${suffix}@farmexit.invalid`;
const staffEmail = `batch2-staff-${suffix}@farmexit.invalid`;
const mobile = () => `+2010${String(randomInt(10000000, 99999999))}`;
const out = path.resolve(root, '../dashboard/docs/artifacts/batch2');
const evidence = [];
const userIds = [];
let farm, listing, communication, browser;

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const superAdmin = await prisma.user.create({
    data: {
      fullName: `Batch2 admin ${suffix}`,
      email,
      mobileE164: mobile(),
      staffMemberships: { create: { staffRole: 'superAdmin' } },
      adminCredential: {
        create: { email, passwordHash: await require('argon2').hash(password), mustChangePassword: false },
      },
    },
  });
  userIds.push(superAdmin.id);
  const customer = await prisma.user.create({ data: { fullName: `Batch2 customer ${suffix}`, mobileE164: mobile() } });
  userIds.push(customer.id);
  farm = await prisma.farm.create({
    data: {
      name: `Batch2 farm ${suffix}`,
      farmType: 'mixed',
      areaFeddan: 10,
      governorate: 'Giza',
      createdBy: customer.id,
    },
  });
  listing = await prisma.request.create({
    data: {
      requestNumber: `BATCH2-${suffix}`,
      requestType: 'farmListing',
      farmId: farm.id,
      createdBy: customer.id,
      status: 'approved',
      submittedAt: new Date(),
      listingDetail: { create: { slug: `batch2-${suffix}`, listingType: 'sale', askingPrice: 1000000 } },
    },
  });
  communication = await prisma.communicationCase.create({
    data: {
      requestId: listing.id,
      assignedStaffId: superAdmin.id,
      status: 'closed',
      closedAt: new Date(),
    },
  });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: 'http://localhost:3003',
    viewport: { width: 1440, height: 1000 },
  });
  const login = await context.request.post('/api/admin/auth/login', { data: { email, password } });
  assert.equal(login.status(), 200, `BFF login: ${await login.text()}`);
  const token = (await context.cookies()).find((cookie) => cookie.name === 'fx_admin_at').value;
  async function api(route, options = {}, expected = 200) {
    const response = await fetch(`http://localhost:4001/api/v1${route}`, {
      ...options,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...options.headers },
    });
    assert.equal(response.status, expected, `${route}: ${await response.clone().text()}`);
    return response.json();
  }
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  for (const range of ['7d', '30d', '90d', '12m', 'all']) {
    const report = await api(`/staff/admin/analytics?range=${range}`);
    const sum = (key) => report.timeseries[key].reduce((total, point) => total + point.count, 0);
    for (const [key, value] of [
      ['usersRegistered', report.overview.newUsers],
      ['farmsCreated', report.overview.newFarms],
      ['requestsCreated', report.overview.requestsCreated],
      ['listingsPublished', report.overview.publishedListings],
      ['communicationCasesCreated', report.workflows.communicationCasesCreatedInRange],
    ])
      assert.equal(sum(key), value, `${range} ${key} KPI mismatch`);
    await page.goto(`/en/admin/analytics?range=${range}`);
    await page.getByRole('heading', { name: 'Analytics', exact: true }).waitFor();
    await page.screenshot({ path: path.join(out, `analytics-${range}.png`), fullPage: true });
    evidence.push({ check: `Analytics ${range}: all five series match database KPIs and page renders`, pass: true });
  }
  const today = new Date().toISOString().slice(0, 10);
  const custom = await api(`/staff/admin/analytics?from=${today}&to=${today}`);
  assert.equal(custom.granularity, 'day');
  assert.ok(custom.overview.newUsers >= 2);
  await page.goto(`/en/admin/analytics?from=${today}&to=${today}`);
  await page.getByRole('heading', { name: 'Analytics', exact: true }).waitFor();
  evidence.push({ check: 'Inclusive single-day custom analytics', pass: true });

  await page.goto('/en/admin/listing-pipeline');
  await page.getByRole('link', { name: listing.requestNumber, exact: true }).click();
  await page.getByRole('heading', { name: listing.requestNumber, exact: true }).waitFor();
  assert.ok(page.url().endsWith(`/admin/listings/${listing.id}`));
  await page.screenshot({ path: path.join(out, 'pipeline-detail.png'), fullPage: true });
  evidence.push({ check: 'Approved pipeline row opens listing detail', pass: true });

  await page.goto(`/en/admin/communications/${communication.id}`);
  for (const status of ['open', 'waitingCustomer', 'waitingOwner', 'closed', 'open']) {
    await page.getByLabel('Case status', { exact: true }).selectOption(status);
    await page.getByRole('button', { name: 'Update status', exact: true }).click();
    await page.getByText('Status updated.', { exact: true }).waitFor();
    await page.waitForTimeout(250);
    const stored = await prisma.communicationCase.findUnique({ where: { id: communication.id } });
    assert.equal(stored.status, status);
    assert.equal(stored.closedAt === null, status !== 'closed');
  }
  await page.reload();
  assert.equal(await page.getByLabel('Case status', { exact: true }).inputValue(), 'open');
  await page.screenshot({ path: path.join(out, 'communication-reopened.png'), fullPage: true });
  evidence.push({ check: 'All communication statuses persist; closed case reopens', pass: true });

  await page.goto('/en/admin/requests?requestType=farmListing&status=approved');
  await page.getByRole('columnheader', { name: 'Requester', exact: true }).waitFor();
  const headers = await page.locator('thead th').allTextContents();
  assert.equal(headers[0].trim(), 'Requester');
  assert.ok(!headers.some((header) => header.trim() === 'ID'));
  assert.equal(await page.getByLabel('Status', { exact: true }).inputValue(), 'approved');
  await page.screenshot({ path: path.join(out, 'requests.png'), fullPage: true });
  evidence.push({ check: 'Requests start with requester and status select uses actual values', pass: true });

  await page.goto(`/en/admin/users?search=${suffix}`);
  for (const [button, expected] of [
    ['Suspend user', 'suspended'],
    ['Reactivate user', 'active'],
  ]) {
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.getByText('Account status updated.', { exact: true }).waitFor();
    assert.equal((await prisma.user.findUnique({ where: { id: customer.id } })).accountStatus, expected);
  }
  await page.screenshot({ path: path.join(out, 'users.png'), fullPage: true });
  evidence.push({ check: 'User suspend/reactivate confirms and persists', pass: true });

  await page.goto('/en/admin/administrators');
  await page.getByRole('button', { name: 'Add new admin', exact: true }).click();
  await page.getByLabel('Full name', { exact: true }).fill(`Batch2 reviewer ${suffix}`);
  await page.getByLabel('Email', { exact: true }).fill(staffEmail);
  await page.getByLabel('Egyptian mobile', { exact: true }).fill(mobile());
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('checkbox', { name: /^Reviewer/ }).check();
  await page.getByRole('button', { name: 'Create administrator', exact: true }).click();
  await page.getByText('Administrator created.', { exact: true }).waitFor();
  await page.getByText(staffEmail, { exact: true }).waitFor();
  evidence.push({ check: 'Create administrator UI persists real reviewer scope and refreshes table', pass: true });
  const newStaff = await prisma.user.findUnique({ where: { email: staffEmail } });
  userIds.push(newStaff.id);
  const staffContext = await browser.newContext({ baseURL: 'http://localhost:3003' });
  assert.equal(
    (await staffContext.request.post('/api/admin/auth/login', { data: { email: staffEmail, password } })).status(),
    200,
  );
  const staffToken = (await staffContext.cookies()).find((cookie) => cookie.name === 'fx_admin_at').value;
  await api('/staff/admin/users', { headers: { authorization: `Bearer ${staffToken}` } }, 403);
  const staffPage = await staffContext.newPage();
  await staffPage.goto('/en/admin/requests');
  assert.equal(await staffPage.getByRole('link', { name: 'Administrators', exact: true }).count(), 0);
  evidence.push({
    check: 'New reviewer can sign in but backend denies administrator API and nav hides it',
    pass: true,
  });
  await staffContext.close();
  for (const route of [
    '/ar/admin/requests',
    '/ar/admin/users',
    '/ar/admin/administrators',
    '/ar/admin/analytics',
    `/ar/admin/listings/${listing.id}`,
    `/ar/admin/communications/${communication.id}`,
  ]) {
    const response = await page.goto(route);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl');
  }
  await page.screenshot({ path: path.join(out, 'arabic-communication.png'), fullPage: true });
  assert.deepEqual(pageErrors, []);
  evidence.push({ check: 'All changed pages render in Arabic RTL with no browser exceptions', pass: true });
  await context.close();
}

main()
  .catch((error) => {
    evidence.push({ check: 'Stopped on failure', pass: false, error: error.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    // Resolve the created UI account even if a later assertion failed.
    const created = await prisma.user.findUnique({ where: { email: staffEmail } });
    if (created && !userIds.includes(created.id)) userIds.push(created.id);
    if (userIds.length) await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    if (communication) await prisma.communicationCase.delete({ where: { id: communication.id } });
    if (listing) {
      await prisma.farmListingDetail.delete({ where: { requestId: listing.id } });
      await prisma.request.delete({ where: { id: listing.id } });
    }
    if (farm) await prisma.farm.delete({ where: { id: farm.id } });
    if (userIds.length) {
      const sessions = await prisma.userSession.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
      await prisma.userSessionToken.deleteMany({ where: { sessionId: { in: sessions.map((session) => session.id) } } });
      await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.adminCredential.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.staffMembership.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, 'verification.json'),
      JSON.stringify({ date: new Date().toISOString(), evidence, fixturesCleaned: true }, null, 2),
    );
    console.log(JSON.stringify(evidence, null, 2));
  });
