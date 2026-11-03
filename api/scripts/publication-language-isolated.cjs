// Dedicated loopback-only MySQL integration harness. Never reads a project .env or a production URL.
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const statePath = path.join(os.tmpdir(), 'farmexit-publication-language-state.json');
const api = path.resolve(__dirname, '..');
const url = 'mysql://root@127.0.0.1:33316/farmexit_publication_test';
function client() {
  const { PrismaClient } = require('../dist/generated/prisma/client.js');
  const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
  return new PrismaClient({ adapter: new PrismaMariaDb({ host: '127.0.0.1', port: 33316, user: 'root', database: 'farmexit_publication_test', connectionLimit: 8 }) });
}
async function init() {
  const prisma = client();
  try {
    assert.equal(await prisma.user.count(), 0, 'Disposable database must be empty; do not reuse another schema');
    const password = crypto.randomBytes(24).toString('hex') + 'Aa12!';
    const otp = String(crypto.randomInt(100000, 999999));
    const identities = {};
    for (const [index, role] of ['owner', 'superAdmin', 'reviewer', 'caseAgent'].entries()) {
      const user = await prisma.user.create({ data: {
        fullName: `[TEST] Publication ${role}`, mobileE164: `+20109000110${index}`, mobileVerifiedAt: new Date(),
        ...(role !== 'owner' ? { staffMemberships: { create: { staffRole: role } }, adminCredential: { create: {
          email: `${role.toLowerCase()}@publication.invalid`, passwordHash: await require('argon2').hash(password), mustChangePassword: false,
        } } } : {}),
      } }); identities[role] = { id: String(user.id), mobile: user.mobileE164, email: `${role.toLowerCase()}@publication.invalid` };
    }
    const state = { url, identities, password, otp, env: {
      DATABASE_URL: url, NODE_ENV: 'development', PORT: '4501', JWT_ACCESS_SECRET: crypto.randomBytes(48).toString('hex'),
      OTP_HASH_SECRET: crypto.randomBytes(48).toString('hex'), JWT_ISSUER: 'farmexit-publication-isolated',
      ACCESS_TOKEN_TTL_SECONDS: '3600', SMS_PROVIDER: 'development', MEDIA_STORAGE_PROVIDER: 'local',
      MEDIA_STORAGE_DIR: path.join(os.tmpdir(), 'farmexit-publication-uploads'), CORS_ORIGINS: 'http://127.0.0.1:3501,http://127.0.0.1:3601',
      DEV_FIXED_OTP_ENABLED: 'true', DEV_FIXED_OTP_CODE: otp, DEV_FIXED_OTP_ALLOWED_MOBILES: identities.owner.mobile,
      CLIENT_DEMO_OTP_ENABLED: 'false', SWAGGER_ENABLED: 'false',
    } };
    fs.writeFileSync(statePath, JSON.stringify(state)); console.log('Synthetic identities created in disposable loopback MySQL; secrets retained only in temporary state.');
  } finally { await prisma.$disconnect(); }
}
async function tests() {
  const state = JSON.parse(fs.readFileSync(statePath));
  const prisma = client(); const results = [];
  async function call(endpoint, method = 'GET', body, token, expected = 200) {
    const res = await fetch('http://127.0.0.1:4501/api/v1' + endpoint, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await res.json(); assert.equal(res.status, expected, `${method} ${endpoint}: ${JSON.stringify(data).replace(/"(?:accessToken|refreshToken)":"[^"]+"/g, '"token":"[REDACTED]"')}`); return data;
  }
  try {
    if (!state.owner) await call('/auth/otp/request', 'POST', { mobile: state.identities.owner.mobile });
    state.owner = state.owner ?? await call('/auth/otp/verify', 'POST', { mobile: state.identities.owner.mobile, code: state.otp });
    fs.writeFileSync(statePath, JSON.stringify(state));
    state.staff = state.staff ?? await call('/admin-auth/login', 'POST', { email: state.identities.superAdmin.email, password: state.password });
    fs.writeFileSync(statePath, JSON.stringify(state));
    const owner = state.owner.accessToken, admin = state.staff.accessToken;
    const farm = await call('/farms', 'POST', { name: '[TEST] Publication Orchard Run' + Date.now(), farmType: 'fruit', governorate: 'Giza', areaName: 'El Saff', areaFeddan: 32,
      waterSource: 'well', irrigationMethod: 'drip', localizedContent: { en: { name: '[TEST] Publication Orchard', mainActivity: 'Citrus' }, ar: { name: '[اختبار] بستان النشر', mainActivity: 'موالح' } } }, owner, 201);
    state.farmId = farm.id;
    state.farmName = farm.name;
    const initialPublicCount = (await call('/public/management')).total;
    async function management(consent = true, farmId = farm.id) {
      return call(`/farms/${farmId}/management-requests`, 'POST', { professionalNeed: 'farmManager', currentSituation: 'Public management description', publicationConsent: consent,
        localizedContent: { en: { currentSituation: 'Public management description' }, ar: { currentSituation: 'وصف إدارة عام' } }, additionalInformation: 'PRIVATE-INTERNAL-CONTEXT' }, owner, 201);
    }
    const draft = await management(); state.managementId = draft.id;
    assert.equal((await call('/public/management')).total, initialPublicCount); results.push('Draft hidden');
    await call(`/farm-management-requests/${draft.id}/submit`, 'POST', undefined, owner, 201);
    assert.equal((await call('/public/management')).total, initialPublicCount); results.push('Under-review private request hidden');
    await call(`/staff/farm-management-requests/${draft.id}/decide`, 'POST', { decision: 'approved' }, owner, 403);
    results.push('Owner cannot approve or publish');
    const published = await call(`/staff/farm-management-requests/${draft.id}/decide`, 'POST', { decision: 'approved' }, admin, 201);
    assert.equal(published.status, 'approved'); assert.equal(published.visibility, 'public'); assert.ok(published.publishedAt);
    const stored = await prisma.request.findUniqueOrThrow({ where: { id: BigInt(draft.id) } });
    assert.equal(stored.visibility, 'public'); assert.ok(stored.publishedAt); results.push('Actual Super Admin login and approval atomically publish in MySQL');
    const publicList = await call('/public/management?q=' + encodeURIComponent(farm.name) + '&governorate=Giza&pageSize=1&sort=newest');
    assert.equal(publicList.total, 1); assert.equal(publicList.items[0].id, draft.id);
    const publicDetail = await call(`/public/management/${draft.id}`);
    assert.equal(publicDetail.id, draft.id);
    assert.equal(publicDetail.opportunityLocalizedContent.ar.currentSituation, 'وصف إدارة عام');
    assert.ok(!JSON.stringify(publicDetail).includes('PRIVATE-INTERNAL-CONTEXT'));
    for (const privateKey of ['mobileE164', 'privatePinLatitude', 'documents', 'creator', 'currentTeam']) assert.ok(!(privateKey in publicDetail));
    results.push('Real public list/search/filter/detail/localization/privacy projections pass');
    await call(`/staff/farm-management-requests/${draft.id}/decide`, 'POST', { decision: 'approved' }, admin, 201);
    assert.equal(await prisma.requestReview.count({ where: { requestId: BigInt(draft.id) } }), 1); results.push('Retry is idempotent without duplicate reviews or cards');
    const noConsent = await management(false); await call(`/farm-management-requests/${noConsent.id}/submit`, 'POST', undefined, owner, 201);
    const blocked = await call(`/staff/farm-management-requests/${noConsent.id}/decide`, 'POST', { decision: 'approved' }, admin, 400);
    assert.match(blocked.message, /owner.*authorize/);
    assert.equal((await prisma.request.findUniqueOrThrow({ where: { id: BigInt(noConsent.id) } })).status, 'underFarmExitReview');
    assert.equal(await prisma.requestReview.count({ where: { requestId: BigInt(noConsent.id) } }), 0); results.push('Missing consent rolls back approval and audit/history writes');
    const race = await management(); await call(`/farm-management-requests/${race.id}/submit`, 'POST', undefined, owner, 201);
    await Promise.all([call(`/staff/farm-management-requests/${race.id}/decide`, 'POST', { decision: 'approved' }, admin, 201), call(`/staff/farm-management-requests/${race.id}/decide`, 'POST', { decision: 'approved' }, admin, 201)]);
    assert.equal(await prisma.requestReview.count({ where: { requestId: BigInt(race.id) } }), 1); results.push('Concurrent approvals have one persisted review/publication');
    const rejected = await management(); await call(`/farm-management-requests/${rejected.id}/submit`, 'POST', undefined, owner, 201);
    await call(`/staff/farm-management-requests/${rejected.id}/decide`, 'POST', { decision: 'rejected', comment: 'Not suitable' }, admin, 201);
    await call(`/public/management/${rejected.id}`, 'GET', undefined, undefined, 404); results.push('Rejected request remains hidden');
    const partnership = await call(`/farms/${farm.id}/partnership-requests`, 'POST', { description: 'Test partnership' }, owner, 201);
    await call(`/partnership-requests/${partnership.id}/submit`, 'POST', undefined, owner, 201);
    const reviewed = await call(`/staff/partnership-requests/${partnership.id}/decide`, 'POST', { decision: 'approved' }, admin, 201);
    assert.equal(reviewed.visibility, 'private'); assert.equal(reviewed.publishedAt, null); results.push('Partnership approval remains private (unchanged rule)');
    const reviewer = await call('/admin-auth/login', 'POST', { email: state.identities.reviewer.email, password: state.password });
    const reviewerRequest = await management(); await call(`/farm-management-requests/${reviewerRequest.id}/submit`, 'POST', undefined, owner, 201);
    await prisma.requestStaffAssignment.create({ data: { requestId: BigInt(reviewerRequest.id), assignmentType: 'reviewer', assignedStaffId: BigInt(state.identities.reviewer.id), assignedByUserId: BigInt(state.identities.superAdmin.id) } });
    const reviewerDecision = await call(`/staff/farm-management-requests/${reviewerRequest.id}/decide`, 'POST', { decision: 'approved' }, reviewer.accessToken, 201);
    assert.equal(reviewerDecision.visibility, 'private');
    await call(`/staff/farm-management-requests/${reviewerRequest.id}/publish`, 'POST', undefined, reviewer.accessToken, 403);
    results.push('Assigned reviewer can review but cannot publish or gain admin scope');
    const historical = await management(false);
    await call(`/farm-management-requests/${historical.id}/submit`, 'POST', undefined, owner, 201);
    await prisma.request.update({ where: { id: BigInt(historical.id) }, data: { status: 'approved', reviews: { create: { reviewerId: BigInt(state.identities.superAdmin.id), decision: 'approved' } } } });
    assert.equal((await call(`/staff/farm-management-requests/${historical.id}/publication-readiness`, 'GET', undefined, admin)).eligible, false);
    await call(`/farm-management-requests/${historical.id}/publication-consent`, 'POST', { consent: true }, owner, 201);
    const beforeReadiness = await prisma.auditLog.count();
    assert.equal((await call(`/staff/farm-management-requests/${historical.id}/publication-readiness`, 'GET', undefined, admin)).eligible, true);
    assert.equal(await prisma.auditLog.count(), beforeReadiness);
    await call(`/staff/farm-management-requests/${historical.id}/publish`, 'POST', undefined, admin);
    await call(`/staff/farm-management-requests/${historical.id}/publish`, 'POST', undefined, admin);
    assert.equal(await prisma.auditLog.count({ where: { entityId: BigInt(historical.id), action: 'opportunity_published' } }), 1);
    state.historicalId = historical.id;
    results.push('Scoped historical reconciliation requires owner consent; dry-run is read-only and execution idempotent/audited');
    const inactiveFarm = await call('/farms', 'POST', { name: '[TEST] Inactive Farm', farmType: 'mixed', governorate: 'Giza', areaFeddan: 10 }, owner, 201);
    const inactive = await management(true, inactiveFarm.id); await call(`/farm-management-requests/${inactive.id}/submit`, 'POST', undefined, owner, 201);
    await prisma.farm.update({ where: { id: BigInt(inactiveFarm.id) }, data: { farmStatus: 'inactive' } });
    await call(`/staff/farm-management-requests/${inactive.id}/decide`, 'POST', { decision: 'approved' }, admin, 400);
    assert.equal((await prisma.request.findUniqueOrThrow({ where: { id: BigInt(inactive.id) } })).status, 'underFarmExitReview');
    results.push('Inactive farm approval fails atomically');
    const withdrawn = await management();
    await prisma.request.update({ where: { id: BigInt(withdrawn.id) }, data: { status: 'withdrawn', visibility: 'public', publishedAt: new Date(), reviews: { create: { reviewerId: BigInt(state.identities.superAdmin.id), decision: 'approved' } } } });
    await call(`/public/management/${withdrawn.id}`, 'GET', undefined, undefined, 404);
    results.push('Withdrawn record stays hidden even if stale publication flags exist');
    const arabicSearch = await call('/public/management?q=' + encodeURIComponent('بستان النشر'));
    assert.ok(arabicSearch.items.some(row => row.id === draft.id));
    const first = await call('/public/management?pageSize=1&page=1&sort=areaDesc');
    const second = await call('/public/management?pageSize=1&page=2&sort=areaDesc');
    assert.equal(first.items.length, 1); assert.equal(second.items.length, 1); assert.notEqual(first.items[0].id, second.items[0].id);
    results.push('Arabic title search, stable sorting and pagination return distinct public records');
    state.partnershipId = partnership.id;
    state.wizardManagementId = (await management()).id;
    const extraFarm = await call('/farms', 'POST', { name: '[TEST] Wizard Farm', farmType: 'mixed', governorate: 'Giza', areaFeddan: 20 }, owner, 201);
    state.wizardFarmId = extraFarm.id;
    state.wizardPartnershipId = (await call(`/farms/${extraFarm.id}/partnership-requests`, 'POST', { description: 'Draft partnership' }, owner, 201)).id;
    fs.writeFileSync(statePath, JSON.stringify(state));
    const evidence = path.resolve(api, '../docs/evidence/publication-language'); fs.mkdirSync(evidence, { recursive: true });
    fs.writeFileSync(path.join(evidence, 'real-api-mysql-results.json'), JSON.stringify({ database: 'Disposable MySQL 8.4 on loopback:33316', requestId: draft.id, results, publicList }, null, 2));
    console.log(JSON.stringify({ passed: results.length, results }, null, 2));
  } finally { await prisma.$disconnect(); }
}
async function browserFixtures() {
  const state = JSON.parse(fs.readFileSync(statePath)); const prisma = client();
  async function call(endpoint, method, body) {
    const res = await fetch('http://127.0.0.1:4501/api/v1' + endpoint, { method, headers: { authorization: `Bearer ${state.owner.accessToken}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await res.json(); if (!res.ok) throw Error(`${endpoint}: ${JSON.stringify(data)}`); return data;
  }
  try {
    let profile = await call('/professional-profile', 'PUT', { headline: 'Test farm manager', bio: 'Test professional biography' });
    let capability = profile.capabilities.find(c => c.professionalType === 'farmManager');
    if (!capability) { profile = await call('/professional-profile/capabilities', 'POST', { professionalType: 'farmManager' }); capability = profile.capabilities.find(c => c.professionalType === 'farmManager'); }
    const verifications = await call('/professional-verification-requests', 'GET');
    state.verificationId = (verifications.items.find(r => r.professionalCapabilityId === capability.id && r.status === 'draft') ?? await call('/professional-verification-requests', 'POST', { professionalCapabilityId: capability.id })).id;
    const otherFarm = await prisma.farm.create({ data: { name: '[TEST] Applicant Parent Farm', farmType: 'mixed', areaFeddan: 18, governorate: 'Giza', createdBy: BigInt(state.identities.caseAgent.id), relationships: { create: { userId: BigInt(state.identities.caseAgent.id), relationshipRole: 'owner', relationshipStatus: 'active' } } } });
    const parent = await prisma.request.create({ data: { requestNumber: 'TEST-PARENT-' + crypto.randomBytes(4).toString('hex'), requestType: 'partnership', createdBy: BigInt(state.identities.caseAgent.id), farmId: otherFarm.id, status: 'approved', submittedAt: new Date(), partnershipDetail: { create: { description: 'Synthetic application parent' } } } });
    state.applicationId = (await call('/partnership-applications', 'POST', { parentPartnershipRequestId: String(parent.id), applicantKind: 'individual' })).id;
    const listing = await prisma.request.create({ data: { requestNumber: 'TEST-LISTING-' + crypto.randomBytes(4).toString('hex'), requestType: 'farmListing', createdBy: BigInt(state.identities.owner.id), farmId: BigInt(state.wizardFarmId), status: 'draft', listingDetail: { create: { listingType: 'sale', slug: 'test-language-listing-' + Date.now(), askingPrice: 10000 } } } });
    state.listingId = String(listing.id);
    fs.writeFileSync(statePath, JSON.stringify(state)); console.log('Additional browser-only synthetic fixtures prepared; no production connections.');
  } finally { await prisma.$disconnect(); }
}
const mode = process.argv[2];
if (mode === 'init') init().catch(e => { console.error(e); process.exitCode = 1; });
else if (mode === 'test') tests().catch(e => { console.error(e.message); process.exitCode = 1; });
else if (mode === 'fixtures') browserFixtures().catch(e => { console.error(e.message); process.exitCode = 1; });
else if (mode === 'run') {
  const state = JSON.parse(fs.readFileSync(statePath));
  assert.equal(state.env.DATABASE_URL, url);
  const child = spawn(process.execPath, ['scripts/run-dist-cjs.cjs'], { cwd: api, env: { ...process.env, ...state.env }, stdio: 'inherit', windowsHide: true });
  process.on('SIGINT', () => child.kill()); child.on('exit', code => process.exit(code ?? 1));
} else throw Error('Use init, run, or test. Only the dedicated loopback schema is supported.');
