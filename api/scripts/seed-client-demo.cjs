/* Local-only additive fixtures. Build api first. Never publishes or updates customer records. */
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { assertLocalDevelopment } = require('./client-demo-safety.cjs');
const root = path.resolve(__dirname, '..');
const load = (module) => require(path.join(root, 'dist', module));

const PEOPLE = [
  ['owner', '+201099887701', '[DEMO] Client Demo Owner'],
  ['applicant', '+201099887702', '[DEMO] Client Demo Applicant'],
  ['reviewer', '+201099887703', '[DEMO] Client Demo Reviewer'],
  ['agent', '+201099887704', '[DEMO] Client Demo Case Agent'],
  ['outsider', '+201099887705', '[DEMO] Client Demo Other Applicant'],
];
const PLAN = [
  [
    'DEMO-MP-MGT-01',
    'farmManagement',
    '[DEMO] Citrus Orchard Management',
    45,
    'Improve irrigation scheduling and seasonal orchard operations.',
  ],
  [
    'DEMO-MP-MGT-02',
    'farmManagement',
    '[DEMO] Greenhouse Management',
    20,
    'Coordinate crop planning, maintenance and harvest logistics.',
  ],
  [
    'DEMO-MP-MGT-03',
    'farmManagement',
    '[DEMO] Mixed Farm Management',
    80,
    'Prepare a farm operations plan and a maintenance schedule.',
  ],
  [
    'DEMO-MP-PART-01',
    'partnership',
    '[DEMO] Orchard Operating Partnership',
    60,
    'Explore an operating partnership for a fictional orchard.',
  ],
  [
    'DEMO-MP-PART-02',
    'partnership',
    '[DEMO] Greenhouse Technical Partnership',
    30,
    'Explore a technical partnership for fictional protected cultivation.',
  ],
  [
    'DEMO-MP-PART-03',
    'partnership',
    '[DEMO] Mixed Farm Distribution Partnership',
    95,
    'Explore distribution support for a fictional mixed farm.',
  ],
];

async function prepare(app, args) {
  assertLocalDevelopment(process.env, args);
  if (!args.includes('--apply') || !args.includes('--confirm-local-development'))
    throw new Error('Explicit local apply opt-in required.');
  const { PrismaService } = load('prisma/prisma.service');
  const { FarmManagementRequestsService } = load('modules/farm-management-requests/farm-management-requests.service');
  const { PartnershipRequestsService } = load('modules/partnership-requests/partnership-requests.service');
  const { StaffFarmManagementReviewsService } = load(
    'modules/farm-management-requests/staff-farm-management-reviews.service',
  );
  const { StaffPartnershipReviewsService } = load('modules/partnership-requests/staff-partnership-reviews.service');
  const prisma = app.get(PrismaService);
  const [database] = await prisma.$queryRaw`SELECT DATABASE() AS databaseName, @@hostname AS serverHostname`;
  if (
    database.databaseName !== 'farmexit' ||
    database.serverHostname.toLowerCase() !== require('node:os').hostname().toLowerCase()
  ) {
    throw new Error(
      'Refusing unidentified database server: must match this development machine and database farmexit.',
    );
  }
  console.log('Resolved local database:', database);
  const secrets = new Map();
  const ids = {};
  let createdUsers = 0,
    createdRequests = 0;
  // All collision checks happen before writes. No upsert can overwrite an unrelated row.
  for (const [key, mobileE164, fullName] of PEOPLE) {
    const row = await prisma.user.findUnique({ where: { mobileE164 } });
    if (row && (row.fullName !== fullName || row.email !== `client-demo-${key}@farmexit.invalid`)) {
      throw new Error(`Refusing non-demo identity collision for fixture ${key}`);
    }
  }
  for (const [requestNumber, requestType, name] of PLAN) {
    const row = await prisma.request.findUnique({ where: { requestNumber }, include: { farm: true, creator: true } });
    if (
      row &&
      (row.requestType !== requestType ||
        row.farm?.name !== name ||
        row.creator.fullName !== PEOPLE[0][2] ||
        row.visibility !== 'private' ||
        row.publishedAt !== null)
    ) {
      throw new Error(`Refusing changed or non-demo request collision: ${requestNumber}`);
    }
  }
  await prisma.$transaction(
    async (tx) => {
      for (const [key, mobileE164, fullName] of PEOPLE) {
        let row = await tx.user.findUnique({ where: { mobileE164 } });
        if (!row) {
          row = await tx.user.create({
            data: { mobileE164, fullName, email: `client-demo-${key}@farmexit.invalid`, mobileVerifiedAt: new Date() },
          });
          createdUsers++;
          if (key === 'reviewer' || key === 'agent') {
            await tx.staffMembership.create({
              data: { userId: row.id, staffRole: key === 'reviewer' ? 'admin' : 'caseAgent' },
            });
            const password = randomBytes(32).toString('base64url');
            const passwordHash = await require('argon2').hash(password);
            await tx.adminCredential.create({
              data: { userId: row.id, email: row.email, passwordHash, mustChangePassword: false },
            });
            secrets.set(key, password); // memory only, never logged, persisted or included in reports
          }
        }
        ids[key] = row.id;
      }
      for (const [requestNumber, requestType, name, areaFeddan, description] of PLAN) {
        if (await tx.request.findUnique({ where: { requestNumber } })) continue;
        const farm = await tx.farm.create({
          data: {
            name,
            farmType: 'mixed',
            areaFeddan,
            governorate: '[DEMO] Region',
            description: '[DEMO] Synthetic farm for local demonstration only. No real location or performance claims.',
            createdBy: ids.owner,
          },
        });
        await tx.farmRelationship.create({
          data: {
            farmId: farm.id,
            userId: ids.owner,
            relationshipRole: 'owner',
            relationshipStatus: 'active',
            startsAt: new Date(),
          },
        });
        const row = await tx.request.create({
          data: {
            requestNumber,
            requestType,
            createdBy: ids.owner,
            farmId: farm.id,
            status: 'draft',
            visibility: 'private',
          },
        });
        if (requestType === 'farmManagement') {
          await tx.farmManagementDetail.create({
            data: {
              requestId: row.id,
              professionalNeed: 'farmManager',
              currentSituation: `[DEMO] ${description}`,
              goals: [description],
              managementTypes: ['fullOperationManagement'],
              additionalInformation: '[DEMO] بيانات تجريبية فقط، وليست فرصة حقيقية.',
            },
          });
        } else {
          await tx.partnershipDetail.create({
            data: {
              requestId: row.id,
              description: `[DEMO] ${description} بيانات تجريبية فقط.`,
              objective: [description],
              acceptedPartnerTypes: ['individual', 'company'],
              contributionDetails: '[DEMO] Operational experience',
              operations: '[DEMO] Fictional operations only',
            },
          });
        }
        await tx.requestStatusHistory.create({
          data: {
            requestId: row.id,
            fromStatus: null,
            toStatus: 'draft',
            changedBy: ids.owner,
            reason: '[DEMO] Synthetic fixture; not a customer submission.',
          },
        });
        await tx.auditLog.create({
          data: {
            actorUserId: ids.reviewer,
            entityType: 'request',
            entityId: row.id,
            action: 'client_demo_fixture_created',
            changes: { fixture: requestNumber, synthetic: true, publicPublicationBlocked: true },
          },
        });
        createdRequests++;
      }
    },
    { timeout: 30000 },
  );
  const requests = [];
  for (const [requestNumber, requestType] of PLAN) {
    let row = await prisma.request.findUniqueOrThrow({ where: { requestNumber } });
    const domain = app.get(
      requestType === 'farmManagement' ? FarmManagementRequestsService : PartnershipRequestsService,
    );
    const reviews = app.get(
      requestType === 'farmManagement' ? StaffFarmManagementReviewsService : StaffPartnershipReviewsService,
    );
    if (row.status === 'draft') await domain.submit(ids.owner, row.id);
    row = await prisma.request.findUniqueOrThrow({ where: { id: row.id } });
    if (row.status === 'underFarmExitReview')
      await reviews.decide(ids.reviewer, row.id, {
        decision: 'approved',
        comment:
          '[DEMO] Synthetic review for local workflow demonstration only. Not a real review or publication authorization.',
      });
    row = await prisma.request.findUniqueOrThrow({ where: { id: row.id } });
    if (row.visibility !== 'private' || row.publishedAt !== null)
      throw new Error('Privacy regression: demo review published a fixture.');
    requests.push({ id: row.id.toString(), reference: requestNumber, status: row.status, visibility: row.visibility });
  }
  return { ids, secrets, createdUsers, createdRequests, requests };
}

async function main() {
  require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
  const args = process.argv.slice(2);
  console.log('Database target:', assertLocalDevelopment(process.env, args));
  console.log(
    'Plan:',
    PLAN.map(([reference, type, name]) => ({
      reference,
      type,
      name,
      visibility: 'private',
      publication: 'BLOCKED: no approved publish workflow',
    })),
  );
  if (!args.includes('--apply') || args.includes('--dry-run')) {
    console.log('DRY RUN: zero writes. Public fixture insertion is blocked.');
    return;
  }
  // Application context only: does not listen on any port, especially not 4000.
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = load('app.module');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const { PrismaService } = load('prisma/prisma.service');
    const prisma = app.get(PrismaService);
    const select = {
      id: true,
      status: true,
      visibility: true,
      publishedAt: true,
      updatedAt: true,
      createdBy: true,
      farmId: true,
    };
    const before = await prisma.request.findMany({
      where: { NOT: { requestNumber: { startsWith: 'DEMO-MP-' } } },
      select,
      orderBy: { id: 'asc' },
    });
    const digest = (rows) =>
      require('node:crypto')
        .createHash('sha256')
        .update(JSON.stringify(rows, (_, value) => (typeof value === 'bigint' ? value.toString() : value)))
        .digest('hex');
    const result = await prepare(app, args);
    console.log('Applied private fixtures:', {
      createdUsers: result.createdUsers,
      createdRequests: result.createdRequests,
      requests: result.requests,
    });
    const again = await prepare(app, args);
    if (again.createdUsers || again.createdRequests) throw new Error('Idempotency check failed.');
    console.log('Idempotency: second run created zero users and zero requests.');
    let verificationError;
    try {
      if (args.includes('--verify')) await require('./verify-client-demo.cjs').verify(app, result);
    } catch (error) {
      verificationError = error;
    }
    const after = await prisma.request.findMany({
      where: { id: { in: before.map((row) => row.id) } },
      select,
      orderBy: { id: 'asc' },
    });
    if (digest(before) !== digest(after))
      throw new Error('Unrelated request snapshot changed during verification.', { cause: verificationError });
    console.log('Unrelated requests unchanged:', {
      count: before.length,
      sha256: digest(after),
      includesRequest753: before.some((row) => row.id === 753n),
    });
    if (verificationError) throw verificationError;
  } finally {
    await app.close();
  }
}

module.exports = { PLAN, PEOPLE, prepare };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
