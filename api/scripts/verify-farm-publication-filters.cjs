// Read-only local browser/API/database verification. No fixture, session, or business-record writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
require('./client-demo-safety.cjs').assertLocalDevelopment(process.env);
const { PrismaClient } = require('../dist/generated/prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { toMariaDbPoolConfig } = require('../dist/prisma/database-url');
const { TokenService } = require('../dist/modules/auth/token.service');
const { chromium } = require('../../FarmExit_dashboard-v2_redesigned/dashboard-v2/node_modules/@playwright/test');
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(toMariaDbPoolConfig(process.env.DATABASE_URL)) });
const out = path.resolve(
  root,
  '../FarmExit_dashboard-v2_redesigned/dashboard-v2/docs/artifacts/farm-publication-filters',
);
const evidence = [];
let browser;

async function main() {
  fs.mkdirSync(out, { recursive: true });
  // Reuse an already-authorized active local dashboard session without logging in, refreshing or writing sessions.
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
  assert.ok(
    session,
    'An existing active local dashboard administrator session is required; no sessions will be created',
  );
  const tokenService = new TokenService({
    get: (key) =>
      process.env[key] ??
      { JWT_ISSUER: 'farmexit-api', ACCESS_TOKEN_TTL_SECONDS: 900, REFRESH_TOKEN_TTL_DAYS: 30 }[key],
  });
  const token = tokenService.signAccessToken(session.userId, session.id);

  // Independent SQL truth set across all live farms; no reuse of the API's relation-filter helper.
  const exists = (type) => `EXISTS(SELECT 1 FROM requests r JOIN farm_listing_details ld ON ld.request_id = r.id
    WHERE r.farm_id=f.id AND r.request_type='farm_listing' AND r.status='published'
    AND r.visibility='public' AND r.published_at IS NOT NULL AND ld.listing_type='${type}')`;
  const rows =
    await prisma.$queryRawUnsafe(`SELECT f.id, f.name, f.governorate, f.area_name AS areaName, f.farm_status AS farmStatus,
    ${exists('sale')} AS sale, ${exists('rent')} AS rent FROM farms f WHERE f.deleted_at IS NULL ORDER BY f.created_at DESC, f.id DESC`);
  const matches = (row, filter) =>
    filter === 'sale'
      ? Number(row.sale) === 1
      : filter === 'rent'
        ? Number(row.rent) === 1
        : filter === 'none'
          ? !Number(row.sale) && !Number(row.rent)
          : filter === 'saleAndRent'
            ? Number(row.sale) === 1 && Number(row.rent) === 1
            : true;
  async function api(params) {
    const response = await fetch(`http://localhost:4001/api/v1/staff/admin/farms?${params}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  }
  const counts = {};
  for (const filter of ['', 'sale', 'rent', 'none', 'saleAndRent']) {
    const expected = rows.filter((row) => matches(row, filter));
    counts[filter || 'all'] = expected.length;
    const ids = [];
    for (let page = 1; page <= Math.max(1, Math.ceil(expected.length / 10)); page++) {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: '10',
        ...(filter ? { listingPublication: filter } : {}),
      });
      const data = await api(qs);
      assert.equal(data.total, expected.length);
      assert.deepEqual(
        data.items.map((item) => item.id),
        expected.slice((page - 1) * 10, page * 10).map((row) => String(row.id)),
      );
      ids.push(...data.items.map((item) => item.id));
      for (const item of data.items) {
        const source = expected.find((row) => String(row.id) === item.id);
        assert.equal(
          item.publishedListings.some((listing) => listing.listingType === 'sale'),
          !!Number(source.sale),
        );
        assert.equal(
          item.publishedListings.some((listing) => listing.listingType === 'rent'),
          !!Number(source.rent),
        );
      }
    }
    assert.equal(new Set(ids).size, expected.length);
    evidence.push({
      check: `API ${filter || 'all'}: full result set, totals, every page, listing links, no duplicate IDs`,
      pass: true,
      total: expected.length,
    });
  }
  const sample = rows.find((row) => Number(row.sale)) ?? rows.find((row) => Number(row.rent));
  assert.ok(sample, 'Existing published farm needed for combined-filter coverage');
  const filter = Number(sample.sale) ? 'sale' : 'rent';
  const combined = new URLSearchParams({
    search: sample.name,
    governorate: sample.governorate,
    farmStatus: sample.farmStatus,
    listingPublication: filter,
  });
  const expectedCombined = rows.filter(
    (row) =>
      matches(row, filter) &&
      row.governorate === sample.governorate &&
      row.farmStatus === sample.farmStatus &&
      [row.name, row.governorate, row.areaName ?? ''].some((value) =>
        value.toLowerCase().includes(sample.name.toLowerCase()),
      ),
  );
  assert.equal((await api(combined)).total, expectedCombined.length);
  evidence.push({
    check: 'Combined name search + governorate + farm status + publication',
    pass: true,
    total: expectedCombined.length,
  });
  const invalid = await fetch('http://localhost:4001/api/v1/staff/admin/farms?listingPublication=active', {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(invalid.status, 400);
  assert.equal((await fetch('http://localhost:4001/api/v1/staff/admin/farms?listingPublication=sale')).status, 401);
  evidence.push({ check: 'Invalid filter rejected; unauthenticated access denied', pass: true });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: 'http://localhost:3003',
    viewport: { width: 1440, height: 1000 },
  });
  await context.addCookies([
    { name: 'fx_admin_at', value: token, url: 'http://localhost:3003', httpOnly: true, sameSite: 'Lax' },
  ]);
  const blockedRequests = [];
  await context.route('**/*', (route) => {
    if (!['GET', 'HEAD'].includes(route.request().method())) {
      blockedRequests.push({ method: route.request().method(), path: new URL(route.request().url()).pathname });
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const locale of ['en', 'ar']) {
    const messages = JSON.parse(
      fs.readFileSync(
        path.resolve(root, `../FarmExit_dashboard-v2_redesigned/dashboard-v2/messages/${locale}/batch.json`),
        'utf8',
      ),
    );
    const admin = JSON.parse(
      fs.readFileSync(
        path.resolve(root, `../FarmExit_dashboard-v2_redesigned/dashboard-v2/messages/${locale}/admin.json`),
        'utf8',
      ),
    );
    await page.goto(`/${locale}/admin/farms`);
    await page.getByLabel(messages.publication, { exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr');
    for (const value of ['sale', 'rent', 'none', 'saleAndRent', '']) {
      await page.getByLabel(messages.publication, { exact: true }).selectOption(value);
      await page.getByRole('button', { name: admin.farms.applyFilters, exact: true }).click();
      await page.waitForURL((url) => (url.searchParams.get('listingPublication') ?? '') === value);
      await page.getByLabel(messages.publication, { exact: true }).waitFor();
      assert.equal(await page.getByLabel(messages.publication, { exact: true }).inputValue(), value);
      if (value === 'sale') await page.screenshot({ path: path.join(out, `farms-sale-${locale}.png`), fullPage: true });
    }
    await page.goto(`/${locale}/admin/farms?${combined}`);
    await page.getByLabel(messages.publication, { exact: true }).waitFor();
    assert.equal(await page.getByLabel(messages.farmStatusLabel, { exact: true }).inputValue(), sample.farmStatus);
    await page.getByRole('button', { name: messages.farmStatusHelp, exact: true }).focus();
    assert.equal(await page.locator('#farm-status-help').isVisible(), true);
    await page.getByRole('button', { name: messages.publicationHelp, exact: true }).focus();
    assert.equal(await page.locator('#listing-publication-help').isVisible(), true);
    await page.getByRole('link', { name: messages.clear, exact: true }).click();
    await page.waitForURL(`**/${locale}/admin/farms`);
    await page.getByLabel(messages.publication, { exact: true }).waitFor();
    assert.equal(await page.locator('input[name="search"]').inputValue(), '');
    assert.equal(await page.locator('input[name="governorate"]').inputValue(), '');
    assert.equal(await page.getByLabel(messages.farmStatusLabel, { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel(messages.publication, { exact: true }).inputValue(), '');
    if (counts.sale > 10) {
      await page.goto(`/${locale}/admin/farms?listingPublication=sale&farmStatus=active`);
      await page.getByLabel(messages.publication, { exact: true }).waitFor();
      const next = page.locator('a[href*="page=2"]').first();
      assert.ok((await next.getAttribute('href')).includes('listingPublication=sale'));
      await next.click();
      await page.waitForURL((url) => url.searchParams.get('page') === '2');
      assert.equal(new URL(page.url()).searchParams.get('listingPublication'), 'sale');
    }
    evidence.push({
      check: `${locale}: all publication options, combined controls, tooltips on focus, Clear Filters, pagination and layout direction`,
      pass: true,
    });
  }
  assert.deepEqual(errors, []);
  evidence.push({
    check: 'No browser exceptions; all non-read browser requests blocked; database access uses reads only',
    pass: true,
    blockedRequests,
  });
  fs.writeFileSync(
    path.join(out, 'status-audit.json'),
    JSON.stringify(
      {
        date: '2026-10-27',
        allFarmStatuses: await prisma.farm.groupBy({ by: ['farmStatus'], _count: { _all: true } }),
        liveFarmStatuses: await prisma.farm.groupBy({
          by: ['farmStatus'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
        counts,
      },
      null,
      2,
    ),
  );
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
