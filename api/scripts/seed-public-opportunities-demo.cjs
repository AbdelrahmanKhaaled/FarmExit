/**
 * Idempotent [DEMO] POM published management + partnership marketplace opportunities.
 * DRY-RUN by default. Uses domain submit → staff approve → admin publish.
 */
const path = require('node:path');
const {
  assertPublicFarmsDemoTarget,
  assertApplyOptIn,
  assertDatabaseServer,
  resolveDeploySeedArgv,
} = require('./public-farms-demo-safety.cjs');

const root = path.resolve(__dirname, '..');
const load = (module) => require(path.join(root, 'dist', module));

const MGT_COUNT = 25;
const PART_COUNT = 25;
const DEMO_TAG = '[DEMO] POM';

const PEOPLE = [
  ['owner', '+201099887712', '[DEMO] Public Opportunities Marketplace Owner'],
  ['publisher', '+201099887713', '[DEMO] Public Opportunities Marketplace Publisher'],
];

const GOVERNORATES = ['Beheira', 'Sharqia', 'Fayoum', 'Giza', 'Minya', 'Qalyubia', 'Dakahlia'];
const AREAS = ['Wadi El Natrun', 'Mit Ghamr', 'Tamiya', 'Birqash', 'Samalut', 'Banha', 'Mansoura'];
const FARM_TYPES = ['fruit', 'vegetable', 'livestock', 'mixed'];
const PRO_NEEDS = ['farmManager', 'agriculturalEngineer', 'both'];
const MGT_TYPES = [
  ['fullOperationManagement'],
  ['irrigationAndMaintenance'],
  ['harvestAndPostHarvest'],
  ['fullOperationManagement', 'irrigationAndMaintenance'],
];

function demoRef(kind, index) {
  return `DEMO-POM-${kind}-${String(index).padStart(3, '0')}`;
}

function farmName(kind, index) {
  const label = kind === 'mgt' ? 'Management' : 'Partnership';
  return `${DEMO_TAG} ${label} Farm ${String(index).padStart(2, '0')}`;
}

function buildMgtSpec(index) {
  const i = index - 1;
  const ref = demoRef('mgt', index);
  const areaFeddan = Math.round((10 + (i % 40) * 1.1) * 100) / 100;
  return {
    kind: 'mgt',
    demoRef: ref,
    farmName: farmName('mgt', index),
    farmDto: {
      name: farmName('mgt', index),
      description: `Synthetic demo farm (${ref}). Fictional — not a real customer property.`,
      farmType: FARM_TYPES[i % FARM_TYPES.length],
      mainActivity: 'Mixed horticulture and field crops',
      areaFeddan,
      governorate: GOVERNORATES[i % GOVERNORATES.length],
      areaName: AREAS[i % AREAS.length],
      waterSource: i % 2 === 0 ? 'well' : 'canal',
      irrigationMethod: 'drip',
    },
    requestDto: {
      professionalNeed: PRO_NEEDS[i % PRO_NEEDS.length],
      managementTypes: MGT_TYPES[i % MGT_TYPES.length],
      term: i % 2 === 0 ? '12 months' : 'Seasonal',
      currentSituation: `[DEMO] ${ref} — owner seeks professional management support for demonstration listings only.`,
      goals: [`[DEMO] Improve seasonal planning (${ref})`, 'Coordinate maintenance windows'],
      challenges: ['[DEMO] Illustrative staffing gap'],
      additionalInformation: `[DEMO] Ref ${ref}. Synthetic opportunity for marketplace UI testing.`,
    },
  };
}

function buildPartSpec(index) {
  const i = index - 1;
  const ref = demoRef('part', index);
  const areaFeddan = Math.round((15 + (i % 35) * 0.9) * 100) / 100;
  const objective = `[DEMO] Partnership exploration ${ref}`;
  return {
    kind: 'part',
    demoRef: ref,
    farmName: farmName('part', index),
    farmDto: {
      name: farmName('part', index),
      description: `Synthetic demo farm (${ref}). Fictional partnership showcase only.`,
      farmType: FARM_TYPES[(i + 1) % FARM_TYPES.length],
      mainActivity: 'Protected cultivation and packing',
      areaFeddan,
      governorate: GOVERNORATES[(i + 2) % GOVERNORATES.length],
      areaName: AREAS[(i + 1) % AREAS.length],
      waterSource: 'canal',
      irrigationMethod: 'sprinkler',
    },
    requestDto: {
      description: `[DEMO] ${ref} — fictional operating partnership for UI and filter testing.`,
      objective: [objective, 'Explore technical collaboration'],
    },
  };
}

const PLAN = [
  ...Array.from({ length: MGT_COUNT }, (_, n) => buildMgtSpec(n + 1)),
  ...Array.from({ length: PART_COUNT }, (_, n) => buildPartSpec(n + 1)),
];

async function ensurePeople(prisma, stats) {
  const ids = {};
  for (const [key, mobileE164, fullName] of PEOPLE) {
    let row = await prisma.user.findUnique({ where: { mobileE164 } });
    if (row && row.fullName !== fullName) throw new Error(`Refusing non-demo user collision for ${mobileE164}`);
    if (!row) {
      row = await prisma.user.create({
        data: {
          mobileE164,
          fullName,
          email: `public-opportunities-demo-${key}@farmexit.invalid`,
          mobileVerifiedAt: new Date(),
        },
      });
      stats.usersCreated++;
    } else stats.usersReused++;
    ids[key] = row.id;
    if (key === 'publisher') {
      const staff = await prisma.staffMembership.findFirst({
        where: { userId: row.id, staffRole: 'admin' },
      });
      if (!staff) {
        await prisma.staffMembership.create({ data: { userId: row.id, staffRole: 'admin' } });
        stats.staffCreated++;
      }
    }
  }
  return ids;
}

async function assertDemoFarm(farm, spec) {
  if (!farm.name.startsWith(DEMO_TAG)) throw new Error(`Refusing non-demo farm id ${farm.id}`);
  if (!farm.description?.includes(spec.demoRef)) {
    throw new Error(`Demo farm ${farm.name} missing ref ${spec.demoRef}`);
  }
}

async function ensureOpportunity(services, ids, spec, stats) {
  const { prisma, farms, mgt, mgtReviews, part, partReviews, publication } = services;
  const ownerId = ids.owner;
  const publisherId = ids.publisher;
  const requestType = spec.kind === 'mgt' ? 'farmManagement' : 'partnership';

  let farm = await prisma.farm.findFirst({ where: { name: spec.farmName, deletedAt: null } });
  if (farm) {
    await assertDemoFarm(farm, spec);
    stats.farmsReused++;
  } else {
    const created = await farms.create(ownerId, spec.farmDto);
    farm = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(created.id) } });
    stats.farmsCreated++;
  }

  let request = await prisma.request.findFirst({
    where: { farmId: farm.id, requestType, createdBy: ownerId },
    include: { managementDetail: true, partnershipDetail: true },
  });

  if (!request) {
    if (spec.kind === 'mgt') {
      const created = await mgt.create(ownerId, farm.id, spec.requestDto);
      request = await prisma.request.findUniqueOrThrow({
        where: { id: BigInt(created.id) },
        include: { managementDetail: true, partnershipDetail: true },
      });
    } else {
      const created = await part.create(ownerId, farm.id, spec.requestDto);
      request = await prisma.request.findUniqueOrThrow({
        where: { id: BigInt(created.id) },
        include: { managementDetail: true, partnershipDetail: true },
      });
    }
    stats.requestsCreated++;
  } else {
    const marker =
      spec.kind === 'mgt'
        ? request.managementDetail?.additionalInformation
        : request.partnershipDetail?.description;
    if (!marker?.includes(spec.demoRef)) throw new Error(`Request on ${spec.farmName} is not a demo POM fixture`);
    stats.requestsReused++;
  }

  if (request.status === 'draft') {
    if (spec.kind === 'mgt') await mgt.submit(ownerId, request.id);
    else await part.submit(ownerId, request.id);
    stats.submitted++;
  }
  request = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });

  if (request.status === 'underFarmExitReview') {
    const comment = '[DEMO] Synthetic staff approval for opportunity marketplace demonstration only.';
    if (spec.kind === 'mgt') await mgtReviews.decide(publisherId, request.id, { decision: 'approved', comment });
    else await partReviews.decide(publisherId, request.id, { decision: 'approved', comment });
    stats.approved++;
  }
  request = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });

  if (request.status === 'approved' && request.publishedAt === null) {
    if (spec.kind === 'mgt') await publication.publishManagement(publisherId, request.id);
    else await publication.publishPartnership(publisherId, request.id);
    stats.published++;
  }
  request = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });

  if (request.status !== 'approved' || request.visibility !== 'public' || !request.publishedAt) {
    throw new Error(`Publication incomplete for ${spec.demoRef} (status=${request.status})`);
  }
}

function resolveServices(app, tokens) {
  return {
    prisma: app.get(tokens.PrismaService),
    farms: app.get(tokens.FarmsService),
    mgt: app.get(tokens.FarmManagementRequestsService),
    mgtReviews: app.get(tokens.StaffFarmManagementReviewsService),
    part: app.get(tokens.PartnershipRequestsService),
    partReviews: app.get(tokens.StaffPartnershipReviewsService),
    publication: app.get(tokens.OpportunityPublicationService),
    mgtPublic: app.get(tokens.FarmManagementRequestsService),
    partPublic: app.get(tokens.PartnershipRequestsService),
  };
}

async function verifyPublic(services) {
  const mgt = await services.mgtPublic.listPublic({ page: 1, pageSize: 100, q: DEMO_TAG });
  const part = await services.partPublic.listPublic({ page: 1, pageSize: 100, q: DEMO_TAG });
  if (mgt.total < MGT_COUNT || part.total < PART_COUNT) {
    throw new Error(`Public opportunity counts low: mgt ${mgt.total}/${MGT_COUNT}, part ${part.total}/${PART_COUNT}`);
  }
  return { demoMgtTotal: mgt.total, demoPartTotal: part.total, publicMgtTotal: mgt.total, publicPartTotal: part.total };
}

async function prepare(app, args, tokens) {
  const target = assertPublicFarmsDemoTarget(process.env, args);
  assertApplyOptIn(args, target);

  const services = resolveServices(app, tokens);
  const database = await assertDatabaseServer(services.prisma, target);
  console.log('Resolved database:', database, 'target:', target.mode);

  const stats = {
    usersCreated: 0,
    usersReused: 0,
    staffCreated: 0,
    farmsCreated: 0,
    farmsReused: 0,
    requestsCreated: 0,
    requestsReused: 0,
    submitted: 0,
    approved: 0,
    published: 0,
  };

  const ids = await ensurePeople(services.prisma, stats);
  for (const spec of PLAN) await ensureOpportunity(services, ids, spec, stats);

  let marketplace;
  if (args.includes('--verify')) marketplace = await verifyPublic(services);

  return { stats, marketplace, mgtCount: MGT_COUNT, partCount: PART_COUNT };
}

function normalizeArgs(argv) {
  if (!argv.includes('--deploy')) return argv;
  const deployArgv = resolveDeploySeedArgv(process.env);
  if (!deployArgv) {
    console.log('PUBLIC_FARMS_DEMO_SEED_ON_DEPLOY / PUBLIC_MARKETPLACE_DEMO_SEED_ON_DEPLOY not true; skip.');
    return ['--dry-run'];
  }
  return argv.filter((flag) => flag !== '--deploy').concat(deployArgv);
}

async function main() {
  require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
  const args = normalizeArgs(process.argv.slice(2));
  const target = assertPublicFarmsDemoTarget(process.env, args);
  console.log('Database target:', target);
  console.log(
    'Plan:',
    PLAN.map((spec) => ({ ref: spec.demoRef, farm: spec.farmName, kind: spec.kind })),
  );
  console.log(`Totals: ${MGT_COUNT} management + ${PART_COUNT} partnership published opportunities.`);

  if (!args.includes('--apply') || args.includes('--dry-run')) {
    console.log('DRY RUN. Apply via deploy script or --apply with confirm flags.');
    return;
  }

  if (!process.env.FARMEXIT_SEED_APPLY_CHILD) {
    const { spawnSync } = require('node:child_process');
    const { pathToFileURL } = require('node:url');
    const resolver = pathToFileURL(path.join(__dirname, 'register-dist-resolver.mjs')).href;
    const applyEntry = path.join(__dirname, 'seed-public-opportunities-demo-apply-dist.mjs');
    const runApply = spawnSync(process.execPath, ['--import', resolver, applyEntry, ...args], {
      stdio: 'inherit',
      cwd: root,
      env: { ...process.env, FARMEXIT_SEED_APPLY_CHILD: '1' },
    });
    process.exit(runApply.status ?? 1);
  }
  throw new Error('Apply must run through seed-public-opportunities-demo-apply-dist.mjs');
}

module.exports = { PLAN, PEOPLE, DEMO_TAG, MGT_COUNT, PART_COUNT, prepare, buildMgtSpec, buildPartSpec };
if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
