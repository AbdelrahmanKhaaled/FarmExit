/** Isolated visual fixtures, never connected to the real API or database. */
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const out = new URL('../docs/batch-one-qa/', import.meta.url);
mkdirSync(out, { recursive: true });
const now = '2026-10-26T10:00:00.000Z';
const permissions = [
  'farms.private-location.read',
  'requests.read',
  'requests.review',
  'requests.forward',
  'communication.relay',
  'evaluations.manage',
  'staff.manage',
];
const farm = {
  id: '662',
  name: '[QA FIXTURE] Beheira Orchard',
  description: 'Isolated visual fixture. This is not customer data.',
  farmType: 'fruit',
  governorate: 'Beheira',
  areaName: 'Wadi El Natrun',
  areaFeddan: 36.6,
  farmStatus: 'active',
  mainActivity: 'Fruit cultivation',
  waterSource: 'well',
  irrigationMethod: 'drip',
  energySource: 'solar',
  soilType: 'Sandy',
  createdAt: now,
  updatedAt: now,
  facilityCount: 0,
  relationships: [{ relationshipRole: 'owner', userId: '9', fullName: 'QA declared owner' }],
  publishedListings: [{ id: '761', listingType: 'sale' }],
  recentRequests: [{ id: '760', requestType: 'farmListing', status: 'underFarmExitReview', createdAt: now }],
};
const request = {
  id: '756',
  requestNumber: 'FL-QA-FIXTURE-756',
  requestType: 'farmListing',
  status: 'underFarmExitReview',
  visibility: 'private',
  currentStep: 1,
  submittedAt: now,
  publishedAt: null,
  closedAt: null,
  createdAt: now,
  updatedAt: now,
  farm: { id: '662', name: farm.name, governorate: 'Beheira' },
  creator: { id: '9', fullName: 'QA declared owner' },
  parentRequestId: null,
  assignments: [],
  statusHistory: [
    {
      id: '1',
      fromStatus: null,
      toStatus: 'draft',
      changedBy: '9',
      changerName: 'QA owner',
      createdAt: now,
      reason: null,
    },
    {
      id: '2',
      fromStatus: 'draft',
      toStatus: 'underFarmExitReview',
      changedBy: '9',
      changerName: 'QA owner',
      createdAt: now,
      reason: null,
    },
  ],
  reviews: [],
  forwardings: [],
  documents: [],
};
const listing = {
  id: '760',
  requestNumber: 'FL-QA-FIXTURE-760',
  farmId: '662',
  farmName: farm.name,
  areaFeddan: 36.6,
  listingType: 'sale',
  status: 'underFarmExitReview',
  visibility: 'private',
  askingPrice: 1200000,
  annualRentPerFeddan: null,
  statedSalePricePerFeddan: null,
  currency: 'EGP',
  availability: null,
  listingDescription: 'Isolated listing workflow fixture.',
  highlights: [],
  slug: 'qa-fixture',
  submittedAt: now,
  createdAt: now,
  updatedAt: now,
  assignments: [],
  reviews: [],
};
const series = (seed) =>
  Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 8, 27 + i)).toISOString().slice(0, 10),
    count: i < 4 ? 0 : (i * seed) % 17,
  }));
const sale = series(3),
  rent = series(5),
  sum = (s) => s.reduce((n, p) => n + p.count, 0);
const analytics = {
  from: '2026-09-27T00:00:00Z',
  to: '2026-10-26T23:59:59Z',
  granularity: 'day',
  timezone: 'UTC',
  overview: {
    newUsers: sum(series(2)),
    newFarms: sum(series(4)),
    publishedListings: sum(sale) + sum(rent),
    requestsCreated: sum(series(6)),
    purchaseProposals: 20,
    saleListingsPublished: sum(sale),
    rentListingsPublished: sum(rent),
  },
  timeseries: {
    usersRegistered: series(2),
    farmsCreated: series(4),
    requestsCreated: series(6),
    listingsPublished: sale.map((p, i) => ({ ...p, count: p.count + rent[i].count })),
    listingsPublishedSale: sale,
    listingsPublishedRent: rent,
    proposalsCreated: [],
    communicationCasesCreated: series(7),
  },
  distributions: {
    requestsByType: {
      farmListing: 121,
      partnership: 65,
      farmManagement: 52,
      farmPurchaseProposal: 34,
      partnershipApplication: 30,
      farmDetails: 24,
      professionalVerification: 6,
    },
    requestsByStatusSnapshot: {
      submitted: 100,
      underFarmExitReview: 96,
      approved: 89,
      published: 85,
      draft: 51,
      changesRequested: 11,
      rejected: 10,
    },
    requestsByStatusInRange: {},
    listingsSaleVsRent: { sale: sum(sale), rent: sum(rent) },
    listingsByGovernorate: [],
    proposalsByKind: { cash: 4, installment: 4, exchange: 4, mixed: 4, co_purchase: 4 },
    proposalsByStatus: {},
    partnershipRequestsCreated: 65,
    partnershipApplicationsCreated: 30,
    professionalVerificationByStatus: {},
    farmManagementByStatus: {},
    communicationByStatus: {},
  },
  workflows: {
    awaitingReview: 96,
    unassignedReviewer: 96,
    changesRequested: 11,
    openCommunicationCases: 28,
    communicationCasesCreatedInRange: 31,
    documentsPendingReview: 37,
  },
};
const overview = {
  registeredUsers: 276,
  farms: 255,
  publishedSaleListings: 52,
  publishedRentListings: 33,
  pendingListingRequests: 19,
  farmManagementRequests: 17,
  partnershipRequests: 27,
  partnershipApplications: 35,
  professionalVerificationRequests: 10,
  farmDetailsInquiries: 27,
  purchaseProposals: 71,
  activeCommunicationCases: 28,
  requestsAwaitingStaffAssignment: 96,
  requestsAwaitingReview: 96,
};
const calls = [];
const api = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost'),
    p = url.pathname.replace('/api/v1', '');
  calls.push({ method: req.method, path: p, query: url.search });
  let data;
  if (p === '/staff/me') data = { id: '1', fullName: 'QA Super Admin', roles: ['superAdmin'], permissions };
  else if (p === '/staff/admin/analytics') data = analytics;
  else if (p === '/staff/admin/dashboard/overview') data = overview;
  else if (p === '/staff/admin/work-queue')
    data = {
      unassignedUnderReview: 96,
      changesRequested: 11,
      pendingDocumentReviews: 37,
      activeCommunicationCases: 28,
      recentlyUpdatedRequests: 208,
    };
  else if (p === '/staff/admin/farm-filter-options')
    data = { governorates: ['Beheira', 'Giza', 'Minya'], statuses: ['active', 'inactive'] };
  else if (p === '/staff/admin/assignable-staff')
    data = { items: [{ userId: '2', fullName: 'QA Reviewer', staffRole: url.searchParams.get('role') }] };
  else if (p === '/staff/admin/farms')
    data = {
      items: Array.from({ length: 10 }, (_, i) => ({ ...farm, id: String(662 - i), name: farm.name + ' ' + (i + 1) })),
      page: 1,
      pageSize: 10,
      total: 255,
    };
  else if (/^\/staff\/admin\/farms\/\d+(\/edit)?$/.test(p) || /^\/farms\/\d+$/.test(p)) data = farm;
  else if (p.endsWith('/private-location'))
    data = {
      farmId: '662',
      privatePinLatitude: null,
      privatePinLongitude: null,
      nearestMainRoad: null,
      roadDistanceKm: null,
    };
  else if (p === '/staff/listing-requests/publication-queue')
    data = {
      items: [{ ...listing, status: 'approved', governorate: 'Beheira', areaName: 'Wadi El Natrun' }],
      page: 1,
      pageSize: 10,
      total: 1,
    };
  else if (p === '/staff/listing-requests') data = { items: [listing], page: 1, pageSize: 10, total: 1 };
  else if (/^\/staff\/listing-requests\/\d+$/.test(p)) data = listing;
  else if (p === '/staff/requests') data = { items: [request], page: 1, pageSize: 10, total: 1 };
  else if (/^\/staff\/requests\/\d+$/.test(p)) data = { ...request, id: p.split('/').at(-1) };
  else if (p === '/staff/communication/cases') data = { items: [], page: 1, pageSize: 10, total: 0 };
  if (data === undefined) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: 'No QA fixture for ' + p }));
    return;
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
});
await new Promise((resolve, reject) => {
  api.once('error', reject);
  api.listen(4403, '127.0.0.1', resolve);
});
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3303'], {
  cwd: new URL('../', import.meta.url),
  env: { ...process.env, FARMEXIT_API_URL: 'http://127.0.0.1:4403/api/v1' },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
app.stdout.on('data', (d) => {
  log += d;
});
app.stderr.on('data', (d) => {
  log += d;
});
const results = [];
let browser;
try {
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch('http://127.0.0.1:3303/en/admin/login')).ok) break;
    } catch {}
    if (i === 89) throw Error('QA server did not start');
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch();
  const routes = [
    '',
    '/analytics',
    '/farms',
    '/farms/662',
    '/farms/new',
    '/farms/662/edit',
    '/evaluations/new?farmId=662',
    '/listings',
    '/listings/760',
    '/requests/756',
    '/communications?requestId=756',
    '/listing-pipeline',
  ];
  for (const locale of ['en', 'ar'])
    for (const width of process.env.QA_INTERACTIONS_ONLY ? [] : [1440, 1024, 390]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        locale: locale === 'ar' ? 'ar-EG' : 'en-US',
      });
      await context.addCookies([
        { name: 'fx_admin_at', value: 'isolated-visual-fixture', domain: '127.0.0.1', path: '/' },
      ]);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (/MISSING_MESSAGE|uncached data|failed: 403/.test(m.text())) errors.push(m.text());
      });
      for (const route of routes) {
        const before = errors.length;
        const response = await page.goto('http://127.0.0.1:3303/' + locale + '/admin' + route, {
          waitUntil: 'networkidle',
        });
        await page.locator('main').waitFor();
        const slug = route.split('?')[0].replaceAll('/', '-') || 'overview';
        await page.screenshot({ path: fileURLToPath(new URL(`${locale}-${width}${slug}.png`, out)) });
        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          dir: document.documentElement.dir,
          mainHeight: document.querySelector('main').clientHeight,
          sidebarHeight: document.querySelector('[data-testid=admin-sidebar]').getBoundingClientRect().height,
        }));
        results.push({
          label: 'TESTED - isolated API fixtures, not live workflow',
          locale,
          width,
          route,
          status: response.status(),
          ...metrics,
          errors: errors.slice(before),
        });
        if (width >= 768 && route === '/analytics') {
          await page.locator('main').evaluate((m) => {
            m.scrollTop = m.scrollHeight;
          });
          const side = await page.locator('[data-testid=admin-sidebar]').boundingBox();
          if (Math.abs(side.height - 1000) > 2) throw Error('Sidebar lost viewport height');
          await page.screenshot({ path: fileURLToPath(new URL(`${locale}-${width}-analytics-bottom.png`, out)) });
        }
      }
      await context.close();
    }
  const interactive = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'fx_admin_at', value: 'isolated-visual-fixture', domain: '127.0.0.1', path: '/' }]);
  const page = await context.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto('http://127.0.0.1:3303/en/admin', { waitUntil: 'networkidle' });
  const metric = await page.locator('.crm-panel__total').boundingBox();
  for (const bar of await page.locator('.crm-workload-chart__bar').all()) {
    const box = await bar.boundingBox();
    assert.ok(
      !(
        box.x < metric.x + metric.width &&
        box.x + box.width > metric.x &&
        box.y < metric.y + metric.height &&
        box.y + box.height > metric.y
      ),
      'Overview bar overlaps header metric',
    );
  }
  interactive.push('Highest workload bar does not overlap header metric');
  const headers=JSON.parse(readFileSync(new URL('../messages/en/admin.json',import.meta.url),'utf8')).header;
  await page.getByRole('button',{name:headers.collapseSidebar,exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid=admin-sidebar]').getBoundingClientRect().width<150);
  await page.getByRole('button',{name:headers.expandSidebar,exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-testid=admin-sidebar]').getBoundingClientRect().width>200);
  const plotHeader=await page.locator('.crm-workload-panel .crm-panel__header').boundingBox();
  for(const figure of await page.locator('.crm-workload-chart__figure').all()){
    const box=await figure.boundingBox();assert.ok(box.y>=plotHeader.y+plotHeader.height,'Workload label overlaps header');
  }
  await page.locator('main').evaluate(m=>{m.scrollTop=0});
  await page.locator('.luxe-sidenav__nav').evaluate(n=>{n.scrollTop=n.scrollHeight});
  assert.equal(await page.locator('main').evaluate(m=>m.scrollTop),0);
  interactive.push('Desktop sidebar collapse/expand and independent nav scroll; workload labels clear header');
  await page.goto('http://127.0.0.1:3303/en/admin/analytics', { waitUntil: 'networkidle' });
  await page.locator('.analytics-svg rect[tabindex]').first().focus();
  assert.match(await page.locator('.analytics-tooltip').first().innerText(), /Sep/);
  await page.getByRole('button', { name: 'Custom range', exact: true }).click();
  await page.locator('input[name=from]').fill('2026-10-01');
  await page.locator('input[name=to]').fill('2026-10-15');
  await Promise.all([
    page.waitForURL(/from=2026-10-01/),
    page.getByRole('button', { name: 'Apply custom range', exact: true }).click(),
  ]);
  assert.ok(
    calls.some(
      (c) =>
        c.path === '/staff/admin/analytics' && c.query.includes('from=2026-10-01') && c.query.includes('to=2026-10-15'),
    ),
  );
  await page.locator('input[name=from]').fill('2026-10-20');
  await page.locator('input[name=to]').fill('2026-10-01');
  assert.equal(await page.locator('form').evaluate((f) => f.checkValidity()), false);
  interactive.push('Keyboard chart tooltip and custom date/API query state; invalid date range blocked');
  await page.goto('http://127.0.0.1:3303/en/admin/farms/new', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.locator('input[name=name]').count(), 1);
  await page.locator('input[name=name]').fill('Isolated visual wizard');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('input[name=governorate]').fill('Beheira');
  await page.locator('input[name=ownerUserId]').fill('9');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('input[name=areaFeddan]').fill('12.5');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Create farm', exact: true }).isDisabled(), true);
  interactive.push('Wizard required fields, step progression, explicit confirmation; no create submitted');
  await page.goto('http://127.0.0.1:3303/en/admin/farms/662/edit', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('input[name=name]').inputValue(), farm.name);
  interactive.push('Edit wizard prepopulates authorized farm fields');
  await page.goto('http://127.0.0.1:3303/en/admin/requests/756', { waitUntil: 'networkidle' });
  const recipient = page.getByPlaceholder('Numeric ID only');
  assert.equal(await recipient.inputValue(), '');
  await recipient.fill('FL-QA-FIXTURE-756');
  assert.equal(await page.getByRole('button', { name: 'Create forwarding', exact: true }).isDisabled(), true);
  assert.ok(await page.getByText('No communication case opened yet', { exact: true }).isVisible());
  interactive.push('Recipient starts empty; request identifier rejected; zero-case state is honest');
  await page.goto('http://127.0.0.1:3303/en/admin/listings', { waitUntil: 'networkidle' });
  assert.ok(await page.getByRole('columnheader', { name: 'Created at', exact: true }).isVisible());
  assert.equal(await page.getByRole('columnheader', { name: 'Request', exact: true }).count(), 0);
  assert.equal(
    await page.getByRole('link', { name: farm.name, exact: true }).getAttribute('href'),
    '/en/admin/listings/760',
  );
  interactive.push('Listings farm link points to specialized listing; createdAt column replaces request column');
  for(const locale of ['en','ar']){
    await page.setViewportSize({width:390,height:1000});
    await page.goto('http://127.0.0.1:3303/'+locale+'/admin',{waitUntil:'networkidle'});
    const labels=JSON.parse(readFileSync(new URL('../messages/'+locale+'/admin.json',import.meta.url),'utf8')).header;
    await page.getByRole('button',{name:labels.openMenu,exact:true}).click();
    await page.waitForFunction(()=>{const r=document.querySelector('[data-testid=admin-sidebar]').getBoundingClientRect();return r.x>=-1&&r.x+r.width<=innerWidth+1});
    await page.screenshot({path:fileURLToPath(new URL(locale+'-390-sidebar-open.png',out))});
    await page.getByRole('button',{name:'Close',exact:true}).click({position:{x:locale==='ar'?10:370,y:500}});
    await page.waitForFunction(()=>{const r=document.querySelector('[data-testid=admin-sidebar]').getBoundingClientRect();return r.x+r.width<=1||r.x>=innerWidth-1});
  }
  interactive.push('Mobile off-canvas opens and dismisses in LTR and RTL');
  assert.ok(
    calls.every((c) => c.method === 'GET'),
    'Visual QA must not submit writes',
  );
  await context.close();
  writeFileSync(new URL(process.env.QA_INTERACTIONS_ONLY?'interaction-results.json':'results.json', out), JSON.stringify({ results, interactive, calls }, null, 2));
  const failures = results.filter(
    (r) => r.status !== 200 || r.overflow || r.errors.length || r.dir !== (r.locale === 'ar' ? 'rtl' : 'ltr'),
  );
  console.log(JSON.stringify({ views: results.length, interactive, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser?.close();
  app.kill();
  api.close();
  writeFileSync(new URL('server.log', out), log);
}
