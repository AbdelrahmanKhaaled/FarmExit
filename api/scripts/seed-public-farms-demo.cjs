/**
 * Idempotent local demo dataset: 60 synthetic farms, 35 published sale + 25 published rent listings.
 * DRY-RUN by default. Never auto-runs on deploy. Only touches [DEMO] PFM-* records.
 * Build API first: npm run build
 */
const path = require('node:path');
const {
  assertPublicFarmsDemoTarget,
  assertApplyOptIn,
  assertDatabaseServer,
} = require('./public-farms-demo-safety.cjs');

const root = path.resolve(__dirname, '..');
const load = (module) => require(path.join(root, 'dist', module));

const SALE_COUNT = 35;
const RENT_COUNT = 25;
const FARM_COUNT = SALE_COUNT + RENT_COUNT;
const DEMO_TAG = '[DEMO] PFM';

const PEOPLE = [
  ['owner', '+201099887710', '[DEMO] Public Farms Marketplace Owner'],
  ['publisher', '+201099887711', '[DEMO] Public Farms Marketplace Publisher'],
];

const GOVERNORATES = [
  'Beheira',
  'Sharqia',
  'Fayoum',
  'Giza',
  'Minya',
  'Qalyubia',
  'Dakahlia',
  'Gharbia',
  'Kafr El Sheikh',
  'Ismailia',
];
const AREAS = [
  'Wadi El Natrun',
  'Mit Ghamr',
  'Tamiya',
  'Birqash',
  'Samalut',
  'Banha outskirts',
  'Mansoura rural',
  'Tanta fringe',
  'Desouk',
  'Abu Swear',
];
const FARM_TYPES = ['fruit', 'vegetable', 'livestock', 'mixed'];
const MAIN_ACTIVITIES = [
  'Citrus and table grapes',
  'Protected vegetable production',
  'Dairy and fodder rotation',
  'Mixed field crops and olives',
  'Date palms and intercropping',
  'Export-oriented berries',
];
const CROP_TYPES = ['fruits', 'citrus', 'fieldCrops', 'palms', 'exportCrops'];
const RENT_AVAILABILITY = ['immediate', 'nextSeason', 'flexible'];

function demoRef(kind, index) {
  return `DEMO-PFM-${kind}-${String(index).padStart(3, '0')}`;
}

function farmName(kind, index) {
  const label = kind === 'sale' ? 'Sale' : 'Rent';
  return `${DEMO_TAG} ${label} Farm ${String(index).padStart(2, '0')}`;
}

function buildSpec(kind, index) {
  const i = index - 1;
  const governorate = GOVERNORATES[i % GOVERNORATES.length];
  const areaName = AREAS[(i + kind.length) % AREAS.length];
  const farmType = FARM_TYPES[i % FARM_TYPES.length];
  const areaFeddan = Math.round((8 + (i % 47) * 1.25 + (kind === 'rent' ? 0.5 : 0)) * 100) / 100;
  const ref = demoRef(kind, index);
  const baseLat = 29.9 + (i % 10) * 0.08;
  const baseLng = 30.8 + (i % 12) * 0.11;
  const description =
    `Synthetic demonstration farm for the Farms Marketplace (${ref}). ` +
    'Fictional property — not a real customer listing. Illustrative data only.';
  const listingDescription =
    `[DEMO] ${kind === 'sale' ? 'Sale' : 'Rental'} opportunity ref ${ref}. ` +
    `A ${areaFeddan}-feddan ${farmType} holding near ${areaName}, ${governorate}. ` +
    'Prepared for local UI and filter testing only.';
  const highlights = [
    `Demo highlight ${index}: ${areaName}`,
    i % 2 === 0 ? 'Irrigation infrastructure noted by owner' : null,
    i % 3 === 0 ? 'Road access described as all-weather' : null,
  ].filter(Boolean);

  const farmDto = {
    name: farmName(kind, index),
    description,
    farmType,
    mainActivity: MAIN_ACTIVITIES[i % MAIN_ACTIVITIES.length],
    areaFeddan,
    governorate,
    areaName,
    waterSource: i % 2 === 0 ? 'well' : 'canal',
    irrigationMethod: ['drip', 'sprinkler', 'gravity'][i % 3],
    energySource: ['electricity', 'solar', 'diesel'][i % 3],
    soilType: i % 2 === 0 ? 'Loamy clay' : 'Sandy loam',
  };

  const listingDto =
    kind === 'sale'
      ? {
          listingType: 'sale',
          askingPrice: 4_500_000 + i * 137_000,
          statedSalePricePerFeddan: Math.max(1, Math.floor((4_500_000 + i * 137_000) / areaFeddan)),
          availability: i % 2 === 0 ? 'immediate' : 'negotiable',
          listingDescription,
          highlights,
        }
      : {
          listingType: 'rent',
          annualRentPerFeddan: 7_500 + i * 425,
          availability: RENT_AVAILABILITY[i % RENT_AVAILABILITY.length],
          listingDescription,
          highlights,
        };

  let saleTermsDto;
  if (kind === 'sale') {
    const mode = i % 4;
    if (mode === 0) saleTermsDto = { saleMode: 'standardCash' };
    else if (mode === 1)
      saleTermsDto = { saleMode: 'standardCash', acceptsInstallmentProposals: true, acceptsCashProposals: true };
    else if (mode === 2)
      saleTermsDto = {
        saleMode: 'quickSale',
        acceptsExchangeProposals: true,
        exchangePreferenceScope: 'selected',
        exchangeAssetTypes: ['apartment', 'villa'].slice(0, 1 + (i % 2)),
      };
    else saleTermsDto = { saleMode: 'quickSale', acceptsInstallmentProposals: true, acceptsExchangeProposals: true };
  }

  return {
    demoRef: ref,
    farmName: farmDto.name,
    farmDto,
    listingType: kind,
    listingDto,
    saleTermsDto,
    crops: [CROP_TYPES[i % CROP_TYPES.length], CROP_TYPES[(i + 2) % CROP_TYPES.length]],
    facilities: { demo: true, ref, store: ['coldRoom', 'workerHousing', 'packhouse'][i % 3] },
    privatePinLat: baseLat + 0.012,
    privatePinLng: baseLng + 0.018,
    publicMapLat: baseLat,
    publicMapLng: baseLng,
  };
}

const PLAN = [
  ...Array.from({ length: SALE_COUNT }, (_, n) => buildSpec('sale', n + 1)),
  ...Array.from({ length: RENT_COUNT }, (_, n) => buildSpec('rent', n + 1)),
];

async function ensurePeople(prisma, stats) {
  const ids = {};
  for (const [key, mobileE164, fullName] of PEOPLE) {
    let row = await prisma.user.findUnique({ where: { mobileE164 } });
    if (row && row.fullName !== fullName) {
      throw new Error(`Refusing non-demo user collision for ${mobileE164}`);
    }
    if (!row) {
      row = await prisma.user.create({
        data: {
          mobileE164,
          fullName,
          email: `public-farms-demo-${key}@farmexit.invalid`,
          mobileVerifiedAt: new Date(),
        },
      });
      stats.usersCreated++;
    } else {
      stats.usersReused++;
    }
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

async function ensureListing(services, ids, spec, stats) {
  const { prisma, farms, listings, reviews, publication, saleTerms } = services;
  const ownerId = ids.owner;
  const publisherId = ids.publisher;

  let farm = await prisma.farm.findFirst({ where: { name: spec.farmName, deletedAt: null } });
  let farmCreated = false;
  if (farm) {
    await assertDemoFarm(farm, spec);
    stats.farmsReused++;
  } else {
    const created = await farms.create(ownerId, spec.farmDto);
    farm = await prisma.farm.findUniqueOrThrow({ where: { id: BigInt(created.id) } });
    farmCreated = true;
    stats.farmsCreated++;
    await prisma.farm.update({
      where: { id: farm.id },
      data: {
        description: spec.farmDto.description,
        facilities: spec.facilities,
        privatePinLatitude: spec.privatePinLat,
        privatePinLongitude: spec.privatePinLng,
        publicMapLatitude: spec.publicMapLat,
        publicMapLongitude: spec.publicMapLng,
      },
    });
    for (const cropType of spec.crops) {
      await prisma.farmCropType.upsert({
        where: { farmId_cropType: { farmId: farm.id, cropType } },
        create: { farmId: farm.id, cropType },
        update: {},
      });
    }
  }

  let request = await prisma.request.findFirst({
    where: {
      farmId: farm.id,
      requestType: 'farmListing',
      listingDetail: { listingType: spec.listingType },
    },
    include: { listingDetail: true },
  });

  let listingCreated = false;
  if (!request) {
    const created = await listings.create(ownerId, farm.id, spec.listingDto);
    request = await prisma.request.findUniqueOrThrow({
      where: { id: BigInt(created.id) },
      include: { listingDetail: true },
    });
    listingCreated = true;
    stats.listingsCreated++;
    if (spec.saleTermsDto) {
      await saleTerms.putForOwner(ownerId, request.id, spec.saleTermsDto);
    }
  } else {
    if (!request.listingDetail?.listingDescription?.includes(spec.demoRef)) {
      throw new Error(`Listing on farm ${spec.farmName} is not a demo PFM fixture`);
    }
    stats.listingsReused++;
  }

  request = await prisma.request.findUniqueOrThrow({
    where: { id: request.id },
    include: { listingDetail: true },
  });

  if (request.status === 'draft') {
    await listings.submit(ownerId, request.id);
    stats.submitted++;
  }
  request = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });

  if (request.status === 'underFarmExitReview') {
    await reviews.decide(publisherId, request.id, {
      decision: 'approved',
      comment: '[DEMO] Synthetic staff approval for marketplace demonstration only.',
    });
    stats.approved++;
  }
  request = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });

  if (request.status === 'approved' && request.publishedAt === null) {
    await publication.publish(publisherId, request.id);
    stats.published++;
  }
  request = await prisma.request.findUniqueOrThrow({
    where: { id: request.id },
    include: { listingDetail: true },
  });

  if (request.status !== 'published' || request.visibility !== 'public' || !request.publishedAt) {
    throw new Error(`Publication incomplete for ${spec.demoRef} (status=${request.status})`);
  }

  return {
    farmCreated,
    listingCreated,
    slug: request.listingDetail.slug,
    listingType: spec.listingType,
  };
}

function resolveServices(app, tokens) {
  return {
    prisma: app.get(tokens.PrismaService),
    farms: app.get(tokens.FarmsService),
    listings: app.get(tokens.ListingRequestsService),
    reviews: app.get(tokens.StaffListingReviewsService),
    publication: app.get(tokens.ListingPublicationService),
    saleTerms: app.get(tokens.SaleTermsService),
    marketplace: tokens.MarketplaceService ? app.get(tokens.MarketplaceService) : null,
  };
}

async function verifyMarketplace(services) {
  const marketplace = services.marketplace;
  if (!marketplace) throw new Error('MarketplaceService token required for --verify');
  const all = await marketplace.list({ page: 1, pageSize: 5, listingType: 'sale' });
  const rent = await marketplace.list({ page: 1, pageSize: 5, listingType: 'rent' });
  const demoSale = await marketplace.list({ page: 1, pageSize: 100, listingType: 'sale', q: DEMO_TAG });
  const demoRent = await marketplace.list({ page: 1, pageSize: 100, listingType: 'rent', q: DEMO_TAG });
  if (demoSale.total < SALE_COUNT || demoRent.total < RENT_COUNT) {
    throw new Error(
      `Marketplace demo counts low: sale ${demoSale.total}/${SALE_COUNT}, rent ${demoRent.total}/${RENT_COUNT}`,
    );
  }
  const sample = demoSale.items[0];
  if (!sample?.slug) throw new Error('Missing demo sale slug');
  const detail = await marketplace.getBySlug(sample.slug);
  const blob = JSON.stringify(detail);
  for (const forbidden of ['privatePin', 'storageKey', 'mobile', 'farmId', 'requestNumber']) {
    if (blob.includes(forbidden)) throw new Error(`Public detail leaked ${forbidden}`);
  }
  const sorted = await marketplace.list({ page: 1, pageSize: 3, sort: 'priceAsc', listingType: 'sale' });
  return {
    publicSaleTotal: all.total,
    publicRentTotal: rent.total,
    demoSaleTotal: demoSale.total,
    demoRentTotal: demoRent.total,
    sampleSlug: sample.slug,
    priceSortCount: sorted.items.length,
  };
}

async function prepare(app, args, tokens) {
  const target = assertPublicFarmsDemoTarget(process.env, args);
  assertApplyOptIn(args, target);

  const resolved = resolveServices(app, tokens);
  const prisma = resolved.prisma;
  const database = await assertDatabaseServer(prisma, target);
  console.log('Resolved database:', database, 'target:', target.mode);

  const stats = {
    usersCreated: 0,
    usersReused: 0,
    staffCreated: 0,
    farmsCreated: 0,
    farmsReused: 0,
    listingsCreated: 0,
    listingsReused: 0,
    submitted: 0,
    approved: 0,
    published: 0,
  };

  const ids = await ensurePeople(prisma, stats);
  const services = resolved;

  const slugs = [];
  for (const spec of PLAN) {
    const result = await ensureListing(services, ids, spec, stats);
    slugs.push(result.slug);
  }

  let marketplace;
  if (args.includes('--verify')) {
    marketplace = await verifyMarketplace(services);
  }

  return { stats, slugs, marketplace, farmCount: FARM_COUNT, saleCount: SALE_COUNT, rentCount: RENT_COUNT };
}

async function main() {
  require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
  const args = process.argv.slice(2);
  const target = assertPublicFarmsDemoTarget(process.env, args);
  console.log('Database target:', target);
  if (target.mode === 'production') {
    console.warn(
      'PRODUCTION DEMO SEED: only [DEMO] PFM synthetic farms/listings. Label clearly in client demos; not real customer inventory.',
    );
  }
  console.log(
    'Plan:',
    PLAN.map((spec) => ({
      ref: spec.demoRef,
      farm: spec.farmName,
      listingType: spec.listingType,
      publication: 'staff approve + admin publish (domain services)',
    })),
  );
  console.log(`Totals: ${FARM_COUNT} farms, ${SALE_COUNT} sale listings, ${RENT_COUNT} rent listings.`);

  if (!args.includes('--apply') || args.includes('--dry-run')) {
    console.log(
      'DRY RUN: zero writes. Local: --apply --confirm-local-development. Production server: --production-server --apply --confirm-production-demo-seed (and PUBLIC_FARMS_DEMO_SEED_ENABLED=true).',
    );
    return;
  }

  if (!process.env.FARMEXIT_SEED_APPLY_CHILD) {
    const { spawnSync } = require('node:child_process');
    const { pathToFileURL } = require('node:url');
    const resolver = pathToFileURL(path.join(__dirname, 'register-dist-resolver.mjs')).href;
    const applyEntry = path.join(__dirname, 'seed-public-farms-demo-apply-dist.mjs');
    const runApply = spawnSync(
      process.execPath,
      ['--import', resolver, applyEntry, ...args],
      {
        stdio: 'inherit',
        cwd: root,
        env: { ...process.env, FARMEXIT_SEED_APPLY_CHILD: '1' },
      },
    );
    process.exit(runApply.status ?? 1);
    return;
  }

  throw new Error('Apply must run through seed-public-farms-demo-apply.ts (spawned automatically).');
}

module.exports = { PLAN, PEOPLE, DEMO_TAG, SALE_COUNT, RENT_COUNT, prepare, buildSpec, resolveServices };
if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
