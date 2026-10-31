/** Explicit local-only test harness. Never connects to a non-loopback database or reuses an existing schema. */
const fs = require('node:fs'),
  path = require('node:path'),
  os = require('node:os'),
  crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const api = path.resolve(__dirname, '..'),
  root = path.resolve(api, '..');
const statePath = path.join(os.tmpdir(), 'farmexit-batch3-isolated-state.json');
const local = () => require('dotenv').parse(fs.readFileSync(path.join(api, '.env')));
function assertLocal(url) {
  const u = new URL(url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) || u.protocol !== 'mysql:')
    throw Error('Only loopback MySQL is allowed');
  return u;
}
async function init() {
  const base = local(),
    u = assertLocal(base.DATABASE_URL);
  const database = 'farmexit_batch3_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
  const mysql = require('mariadb'),
    pool = {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      multipleStatements: true,
    };
  const admin = await mysql.createConnection(pool);
  // CREATE without IF NOT EXISTS deliberately fails if a schema already exists.
  try {
    await admin.query('CREATE DATABASE ' + database + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  } finally {
    await admin.end();
  }
  const isolated = await mysql.createConnection({ ...pool, database });
  await isolated.query(
    fs.readFileSync(path.join(os.tmpdir(), 'farmexit-batch3-schema.sql'), 'utf8').replace(/^\uFEFF/, ''),
  );
  await isolated.end();
  u.pathname = '/' + database;
  const secret = crypto.randomBytes(48).toString('hex'),
    password = crypto.randomBytes(24).toString('hex') + 'Aa12!';
  const env = {
    DATABASE_URL: u.toString(),
    SHADOW_DATABASE_URL: u.toString().replace(database, database + '_unused_shadow'),
    NODE_ENV: 'test',
    PORT: '4401',
    JWT_ACCESS_SECRET: secret,
    OTP_HASH_SECRET: crypto.randomBytes(48).toString('hex'),
    JWT_ISSUER: 'farmexit-batch3-test',
    ACCESS_TOKEN_TTL_SECONDS: '3600',
    REFRESH_TOKEN_TTL_DAYS: '1',
    SMS_PROVIDER: 'development',
    MEDIA_STORAGE_PROVIDER: 'local',
    MEDIA_STORAGE_DIR: path.join(os.tmpdir(), database + '-uploads'),
    DEV_FIXED_OTP_ENABLED: 'false',
    CLIENT_DEMO_OTP_ENABLED: 'false',
    SWAGGER_ENABLED: 'false',
    CORS_ORIGINS: 'http://localhost:3000,http://localhost:3303',
    PUBLIC_MARKETPLACE_DEMO_SEED_ON_DEPLOY: 'false',
    PUBLIC_FARMS_DEMO_SEED_ON_DEPLOY: 'false',
  };
  const { PrismaClient } = require('../dist/generated/prisma/client.js'),
    { PrismaMariaDb } = require('@prisma/adapter-mariadb');
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ ...pool, database, multipleStatements: undefined }) });
  const owner = await prisma.user.create({
    data: { fullName: 'Batch 3 isolated owner', mobileE164: '+201090000001', mobileVerifiedAt: new Date() },
  });
  const staff = await prisma.user.create({
    data: {
      fullName: 'Batch 3 isolated Super Admin',
      mobileE164: '+201090000002',
      mobileVerifiedAt: new Date(),
      staffMemberships: { create: { staffRole: 'superAdmin' } },
      adminCredential: {
        create: {
          email: 'batch3@farmexit.invalid',
          passwordHash: await require('argon2').hash(password),
          mustChangePassword: false,
        },
      },
    },
  });
  const farms = [],
    listings = [];
  for (let i = 0; i < 8; i++) {
    const farm = await prisma.farm.create({
      data: {
        name: '[TEST] Orchard ' + (i + 1),
        localizedContent: {
          en: {
            name: '[TEST] Orchard ' + (i + 1),
            mainActivity: 'Citrus cultivation',
            description: 'Private owner draft',
          },
          ar: { name: '[اختبار] مزرعة ' + (i + 1), mainActivity: 'زراعة الموالح', description: 'وصف خاص بالمالك' },
        },
        description: 'Private owner description',
        farmType: i % 2 ? 'vegetable' : 'fruit',
        areaFeddan: 20 + i * 5,
        governorate: i % 2 ? 'Giza' : 'Beheira',
        areaName: i % 2 ? 'El Saff' : 'Wadi El Natrun',
        waterSource: i % 2 ? 'canal' : 'well',
        irrigationMethod: i % 2 ? 'gravity' : 'drip',
        energySource: i % 2 ? 'electricity' : 'solar',
        createdBy: owner.id,
        cropTypes: { create: { cropType: i % 2 ? 'fieldCrops' : 'citrus' } },
        relationships: {
          create: { userId: owner.id, relationshipRole: 'owner', relationshipStatus: 'active', startsAt: new Date() },
        },
      },
    });
    farms.push(farm.id.toString());
    const rent = i === 6,
      hidden = i === 7;
    const listing = await prisma.request.create({
      data: {
        requestNumber: 'TEST-L-' + i,
        requestType: 'farmListing',
        createdBy: owner.id,
        farmId: farm.id,
        status: hidden ? 'draft' : 'published',
        visibility: hidden ? 'private' : 'public',
        publishedAt: hidden ? null : new Date(Date.now() - i * 1000),
        listingDetail: {
          create: {
            slug: 'test-batch-three-' + i,
            listingType: rent ? 'rent' : 'sale',
            askingPrice: rent ? null : 5000000 + i * 100000,
            annualRentPerFeddan: rent ? 15000 : null,
            listingDescription: 'Published bilingual listing',
            localizedContent: {
              en: { listingDescription: 'Published English description' },
              ar: { listingDescription: 'وصف الإعلان العربي المنشور' },
            },
            ...(!rent
              ? {
                  saleTerms: {
                    create: {
                      saleMode: i < 2 ? 'quickSale' : 'standardCash',
                      acceptsCashProposals: i >= 2,
                      acceptsInstallmentProposals: true,
                      acceptsExchangeProposals: i < 2,
                    },
                  },
                }
              : {}),
          },
        },
      },
    });
    listings.push(listing.id.toString());
    if (i < 6)
      for (const kind of ['farmManagement', 'partnership'])
        await prisma.request.create({
          data: {
            requestNumber: 'TEST-' + kind + '-' + i,
            requestType: kind,
            createdBy: owner.id,
            farmId: farm.id,
            status: 'approved',
            visibility: 'public',
            publishedAt: new Date(),
            reviews: { create: { reviewerId: staff.id, decision: 'approved' } },
            ...(kind === 'farmManagement'
              ? {
                  managementDetail: {
                    create: {
                      professionalNeed: 'farmManager',
                      managementTypes: [i % 2 ? 'productionSupervision' : 'fullOperationManagement'],
                      currentSituation: '[TEST] Seasonal support needed',
                      experienceLevel: 'experienced',
                      localizedContent: {
                        en: { currentSituation: 'Seasonal support needed' },
                        ar: { currentSituation: 'مطلوب دعم موسمي' },
                      },
                    },
                  },
                }
              : {
                  partnershipDetail: {
                    create: {
                      objective: [i % 2 ? 'operateTogether' : 'expandCultivation'],
                      acceptedPartnerTypes: [i % 2 ? 'company' : 'individual'],
                      description: '[TEST] Public partnership',
                      localizedContent: {
                        en: { description: '[TEST] Partnership opportunity' },
                        ar: { description: '[اختبار] فرصة شراكة' },
                      },
                    },
                  },
                }),
          },
        });
  }
  const session = await prisma.userSession.create({
    data: {
      userId: owner.id,
      authAudience: 'website',
      sessionTokenHash: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const { TokenService } = require('../dist/modules/auth/token.service.js');
  const tokens = new TokenService({
    get: (key) =>
      ({
        JWT_ACCESS_SECRET: secret,
        JWT_ISSUER: env.JWT_ISSUER,
        ACCESS_TOKEN_TTL_SECONDS: 3600,
        REFRESH_TOKEN_TTL_DAYS: 1,
      })[key],
  });
  fs.writeFileSync(
    statePath,
    JSON.stringify({
      env,
      database,
      password,
      email: 'batch3@farmexit.invalid',
      ownerId: owner.id.toString(),
      staffId: staff.id.toString(),
      farms,
      listings,
      ownerToken: tokens.signAccessToken(owner.id, session.id),
    }),
    { mode: 0o600 },
  );
  await prisma.$disconnect();
  console.log(
    JSON.stringify({
      isolatedDatabase: database,
      farms: farms.length,
      publicListings: 7,
      management: 6,
      partnerships: 6,
      stateStoredOutsideRepository: true,
    }),
  );
}
function serve() {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const u = assertLocal(state.env.DATABASE_URL);
  if (!/^\/farmexit_batch3_/.test(u.pathname)) throw Error('Refusing non-isolated schema');
  const children = [];
  function start(label, args, cwd, env) {
    const child = spawn(process.execPath, args, {
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    child.stdout.on('data', (d) => process.stdout.write('[' + label + '] ' + d));
    child.stderr.on('data', (d) => process.stderr.write('[' + label + '] ' + d));
    child.on('exit', (code) => console.log(label + ' exited ' + code));
  }
  start('isolated-api', ['scripts/run-dist-cjs.cjs'], api, state.env);
  const frontend = {
    FARMEXIT_API_URL: 'http://127.0.0.1:4401/api/v1',
    NEXT_PUBLIC_FARMEXIT_API_URL: 'http://127.0.0.1:4401/api/v1',
    NEXT_PUBLIC_FARMEXIT_REALTIME_ORIGIN: 'http://127.0.0.1:4401',
  };
  start('website', ['node_modules/next/dist/bin/next', 'dev', '-p', '3000'], path.join(root, 'web'), frontend);
  start('dashboard', ['node_modules/next/dist/bin/next', 'dev', '-p', '3303'], path.join(root, 'dashboard'), frontend);
  process.on('SIGINT', () => {
    for (const c of children) c.kill();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    for (const c of children) c.kill();
    process.exit(0);
  });
}
(async () => {
  if (process.argv[2] === 'init') await init();
  else if (process.argv[2] === 'serve') serve();
  else throw Error('Choose init or serve explicitly');
})().catch((e) => {
  console.error('Isolated harness failed: ' + (e.code || e.message));
  process.exitCode = 1;
});
