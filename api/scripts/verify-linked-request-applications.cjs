// Local, read-only integration/browser checks. No business, credential or session writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
require('./client-demo-safety.cjs').assertLocalDevelopment(process.env);
const { ConfigService } = require('@nestjs/config');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { TokenService } = require('../dist/modules/auth/token.service');
const { chromium } = require('../../FarmExit_dashboard-v2_redesigned/dashboard-v2/node_modules/@playwright/test');
const prisma = new PrismaService(new ConfigService(process.env));
const frontend = path.resolve(root, '../FarmExit_dashboard-v2_redesigned/dashboard-v2');
const out = path.join(frontend, 'docs/artifacts/linked-request-applications');
const evidence = [];
let browser;

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const session = await prisma.userSession.findFirst({
    where: {
      authAudience: 'dashboard',
      revokedAt: null,
      expiresAt: { gt: new Date() },
      user: {
        accountStatus: 'active',
        staffMemberships: { some: { status: 'active', staffRole: { in: ['admin', 'superAdmin'] } } },
      },
    },
    orderBy: { expiresAt: 'desc' },
  });
  assert.ok(session, 'An existing authorized local dashboard session is required; this check never creates one');
  const tokens = new TokenService({
    get: (key) => {
      const value =
        process.env[key] ??
        { JWT_ISSUER: 'farmexit-api', ACCESS_TOKEN_TTL_SECONDS: 900, REFRESH_TOKEN_TTL_DAYS: 30 }[key];
      return ['ACCESS_TOKEN_TTL_SECONDS', 'REFRESH_TOKEN_TTL_DAYS'].includes(key) ? Number(value) : value;
    },
  });
  const token = tokens.signAccessToken(session.userId, session.id);
  const all = await prisma.request.findMany({
    where: {
      requestType: {
        in: ['partnership', 'partnershipApplication', 'farmManagement', 'farmDetails', 'farmPurchaseProposal'],
      },
    },
    select: {
      id: true,
      parentRequestId: true,
      requestType: true,
      status: true,
      requestNumber: true,
      submittedAt: true,
      farmId: true,
      creator: { select: { fullName: true } },
      applicationDetail: { select: { requestId: true } },
    },
  });
  const eligible = (row) =>
    row.requestType === 'partnershipApplication' && row.status !== 'draft' && row.submittedAt && row.applicationDetail;
  const parents = all.filter((row) => row.requestType === 'partnership');
  const submittedChildren = all.filter(eligible);
  const parent =
    parents.find((row) => submittedChildren.filter((child) => child.parentRequestId === row.id).length >= 2) ??
    parents.find((row) => submittedChildren.some((child) => child.parentRequestId === row.id));
  assert.ok(parent, 'Existing partnership applications needed for live coverage');
  const expectedFor = (id) =>
    submittedChildren
      .filter((child) => child.parentRequestId === id)
      .sort((a, b) => b.submittedAt - a.submittedAt || (a.id > b.id ? -1 : 1));
  const expected = expectedFor(parent.id);
  async function api(parentId, query = '', expectedStatus = 200) {
    const response = await fetch(`http://localhost:4001/api/v1/staff/requests/${parentId}/applications?${query}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, expectedStatus, await response.clone().text());
    return response.json();
  }
  for (const opportunity of parents
    .filter((row) => submittedChildren.some((child) => child.parentRequestId === row.id))
    .slice(0, 6)) {
    const children = expectedFor(opportunity.id);
    const actual = await api(opportunity.id);
    assert.equal(actual.total, children.length);
    assert.equal(actual.summary.total, children.length);
    assert.equal(
      actual.summary.pending,
      children.filter((row) => ['submitted', 'underFarmExitReview'].includes(row.status)).length,
    );
    assert.equal(actual.summary.approved, children.filter((row) => row.status === 'approved').length);
    assert.equal(actual.summary.rejected, children.filter((row) => row.status === 'rejected').length);
    assert.deepEqual(
      actual.items.map((row) => row.id),
      children.map((row) => String(row.id)),
    );
    assert.ok(actual.items.every((row) => row.parentRequestId === String(opportunity.id)));
    assert.ok(
      actual.items.every((row) => !('email' in row) && !('mobile' in row) && !('companyRegistrationNumber' in row)),
    );
  }
  evidence.push({
    check:
      'Six real opportunities: exact parent FK and application type, submission-only scope, independent status totals, no contact fields',
    pass: true,
  });
  const pages = [];
  for (let page = 1; page <= expected.length; page++) {
    const result = await api(parent.id, `pageSize=1&page=${page}`);
    assert.equal(result.total, expected.length);
    pages.push(...result.items.map((row) => row.id));
  }
  assert.deepEqual(
    pages,
    expected.map((row) => String(row.id)),
  );
  const oldest = await api(parent.id, 'sort=oldest');
  assert.deepEqual(
    oldest.items.map((row) => row.id),
    [...expected].reverse().map((row) => String(row.id)),
  );
  const selectedStatus = expected[0].status;
  const statusFiltered = await api(parent.id, `status=${selectedStatus}`);
  assert.equal(statusFiltered.total, expected.filter((row) => row.status === selectedStatus).length);
  assert.equal(statusFiltered.summary.total, expected.length);
  assert.equal((await api(parent.id, `search=${encodeURIComponent(expected[0].requestNumber)}`)).total, 1);
  const named = expected.find((row) => row.creator.fullName);
  if (named)
    assert.equal(
      (await api(parent.id, `search=${encodeURIComponent(named.creator.fullName)}`)).total,
      expected.filter((row) => row.creator.fullName === named.creator.fullName).length,
    );
  assert.equal((await api(parent.id, 'search=NO-MATCH-APPLICATION-999999')).total, 0);
  evidence.push({
    check:
      'Real backend pages (pageSize=1), stable sort, status, name/reference search, filtered list versus unfiltered authorized summary',
    pass: true,
    applications: expected.length,
  });
  const noApplications = parents.find((row) => !submittedChildren.some((child) => child.parentRequestId === row.id));
  assert.ok(noApplications);
  assert.equal((await api(noApplications.id)).total, 0);
  const management = all.find((row) => row.requestType === 'farmManagement');
  assert.ok(management);
  await api(management.id, '', 404);
  await api(parent.id, 'status=shortlisted', 400);
  const unauthorized = await fetch(`http://localhost:4001/api/v1/staff/requests/${parent.id}/applications`);
  assert.equal(unauthorized.status, 401);
  evidence.push({
    check: 'Empty parent, unsupported management request (404), invalid status (400), unauthenticated (401)',
    pass: true,
  });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: 'http://localhost:3003',
    viewport: { width: 1440, height: 1050 },
  });
  await context.addCookies([
    { name: 'fx_admin_at', value: token, url: 'http://localhost:3003', httpOnly: true, sameSite: 'Lax' },
  ]);
  const blockedRequests = [];
  await context.route('**/*', (route) => {
    if (!['GET', 'HEAD'].includes(route.request().method())) {
      blockedRequests.push(new URL(route.request().url()).pathname);
      return route.abort();
    }
    assert.notEqual(new URL(route.request().url()).port, '4000');
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const locale of ['en', 'ar']) {
    const messages = JSON.parse(
      fs.readFileSync(path.join(frontend, `messages/${locale}/admin.json`), 'utf8'),
    ).requestWorkspace;
    await page.goto(`/${locale}/admin/requests/${parent.id}`);
    await page.getByRole('heading', { name: messages.applicationsReceived, exact: true }).waitFor();
    assert.equal(await page.locator('[data-application-id]').count(), expected.length);
    assert.equal(await page.locator('html').getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr');
    await page.screenshot({ path: path.join(out, `parent-${locale}.png`), fullPage: true });
    await page.locator('#applications').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `applications-${locale}.png`), fullPage: true });
    await page.getByLabel(messages.applicationStatus, { exact: true }).selectOption(selectedStatus);
    await page.getByRole('button', { name: messages.apply, exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get('applicationStatus') === selectedStatus);
    await page.locator('#applications h2').waitFor();
    assert.equal(await page.locator('[data-application-id]').count(), statusFiltered.total);
    await page.getByRole('link', { name: messages.clear, exact: true }).click();
    await page.waitForURL((url) => !url.searchParams.has('applicationStatus'));
    await page.getByLabel(messages.searchApplications, { exact: true }).fill('NO-MATCH-APPLICATION-999999');
    await page.getByRole('button', { name: messages.apply, exact: true }).click();
    await page.getByRole('heading', { name: messages.noMatchingApplications, exact: true }).waitFor();
    await page.getByRole('link', { name: messages.clear, exact: true }).click();
    await page.getByRole('link', { name: messages.viewApplication, exact: true }).first().click();
    await page.getByRole('heading', { name: messages.submittedAnswers, exact: true }).waitFor();
    const childId = page.url().split('/').pop().split('?')[0];
    assert.ok(expected.some((row) => String(row.id) === childId));
    await page.getByRole('heading', { name: messages.documents, exact: true }).waitFor();
    await page.getByRole('heading', { name: messages.history, exact: true }).waitFor();
    await page.screenshot({ path: path.join(out, `application-${locale}.png`), fullPage: true });
    await page.getByRole('link', { name: messages.openParent, exact: true }).click();
    await page.waitForURL((url) => url.pathname.endsWith(`/requests/${parent.id}`));
    await page.goto(`/${locale}/admin/requests/${noApplications.id}`);
    await page.getByRole('heading', { name: messages.noApplications, exact: true }).waitFor();
    await page.goto(`/${locale}/admin/requests/${management.id}`);
    await page.locator('#overview').waitFor();
    assert.equal(await page.locator('#applications').count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}/admin/requests/${parent.id}`);
    await page.locator('#applications h2').waitFor();
      assert.equal(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), true);
    await page.screenshot({ path: path.join(out, `parent-mobile-${locale}.png`), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1050 });
    evidence.push({
      check: `${locale}: parent cards/counts, status and search, clear, application link/answers/history/documents, parent backlink, empty and ineligible parent, mobile overflow and layout direction`,
      pass: true,
    });
  }
  assert.deepEqual(errors, []);
  evidence.push({
    check:
      'No browser exceptions; all non-read browser requests blocked; no database/session/record writes and no port 4000 access',
    pass: true,
    blockedRequests,
  });
  await context.close();
}
main()
  .catch((error) => {
    evidence.push({ check: 'Stopped on failure', pass: false, error: error.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    await prisma.$disconnect();
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify({ date: '2026-10-27', evidence }, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
  });
