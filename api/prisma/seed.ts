import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  PrismaClient,
  Prisma,
  AccountStatus,
  StaffRole,
  FarmType,
  FarmRelationshipRole,
  FarmRelationshipStatus,
  RequestType,
  RequestVisibility,
  ListingType,
  ProfessionalType,
  VerificationStatus,
} from '../src/generated/prisma/client';
import { toMariaDbPoolConfig } from '../src/prisma/database-url';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured in api/.env');
}

// Safety check: ensure seed is only run in non-production environments
if (process.env.NODE_ENV === 'production') {
  throw new Error('Seeding is prohibited in production environment.');
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(toMariaDbPoolConfig(databaseUrl)),
});

async function main() {
  console.log('🌱 Starting FarmExit development database seed...');

  // 1. Synthetic Demo Users (Clearly marked as demo accounts, no active sessions, no OTPs)
  console.log('Creating demo users...');
  const demoOwner = await prisma.user.upsert({
    where: { mobileE164: '+201000000001' },
    update: {},
    create: {
      fullName: '[DEMO] Demo Farm Owner',
      mobileE164: '+201000000001',
      email: 'demo-owner@example.test',
      accountStatus: AccountStatus.active,
      mobileVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  const demoAgronomist = await prisma.user.upsert({
    where: { mobileE164: '+201000000002' },
    update: {},
    create: {
      fullName: '[DEMO] Demo Agronomist',
      mobileE164: '+201000000002',
      email: 'demo-agronomist@example.test',
      accountStatus: AccountStatus.active,
      mobileVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  const demoStaffAgent = await prisma.user.upsert({
    where: { mobileE164: '+201000000003' },
    update: {},
    create: {
      fullName: '[DEMO] Demo Case Agent (Staff)',
      mobileE164: '+201000000003',
      email: 'demo-staff-agent@example.test',
      accountStatus: AccountStatus.active,
      mobileVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  // Safe dev-only staff membership for workflow routing (case_agent only, no production admin)
  await prisma.staffMembership.upsert({
    where: {
      userId_staffRole: {
        userId: demoStaffAgent.id,
        staffRole: StaffRole.caseAgent,
      },
    },
    update: {},
    create: {
      userId: demoStaffAgent.id,
      staffRole: StaffRole.caseAgent,
      status: 'active',
    },
  });

  // 2. Synthetic Professional Profile for Agronomist (Unverified, no fake credentials)
  await prisma.professionalProfile.upsert({
    where: { userId: demoAgronomist.id },
    update: {},
    create: {
      userId: demoAgronomist.id,
      headline: '[DEMO] Agricultural Engineer - Irrigation Specialist',
      bio: '[DEMO] Synthetic demo profile for testing local professional assignment workflows.',
      baseGovernorate: 'Sharqia',
      yearsExperience: 8,
      capabilities: {
        create: {
          professionalType: ProfessionalType.agriculturalEngineer,
          verificationStatus: VerificationStatus.verificationRequired,
        },
      },
    },
  });

  // 3. Synthetic Demo Farms
  console.log('Creating demo farms...');
  let farm1 = await prisma.farm.findFirst({
    where: { name: '[DEMO] Nile Valley Olive Grove' },
  });

  if (!farm1) {
    farm1 = await prisma.farm.create({
      data: {
        name: '[DEMO] Nile Valley Olive Grove',
        farmType: FarmType.fruit,
        areaFeddan: new Prisma.Decimal('15.50'),
        governorate: 'Beheira',
        areaName: 'Wadi El Natrun',
        waterSource: 'well',
        irrigationMethod: 'drip',
        energySource: 'solar',
        soilType: 'sandy loam',
        mainActivity: 'Olive and date palm cultivation',
        description: '[DEMO] Synthetic demo orchard for local development testing.',
        farmStatus: 'active',
        createdBy: demoOwner.id,
        cropTypes: {
          create: [{ cropType: 'Olive' }, { cropType: 'Date Palm' }],
        },
        relationships: {
          create: {
            userId: demoOwner.id,
            relationshipRole: FarmRelationshipRole.owner,
            relationshipStatus: FarmRelationshipStatus.active,
          },
        },
        agriculturalFacilities: {
          create: {
            name: '[DEMO] Tool Storage Shed',
            facilityType: 'Storage Shed',
            description: '[DEMO] 200 sqm ventilated tool storage',
            ownerUserId: demoOwner.id,
          },
        },
      },
    });
  }

  let farm2 = await prisma.farm.findFirst({
    where: { name: '[DEMO] Delta Green Vegetable Plot' },
  });

  if (!farm2) {
    farm2 = await prisma.farm.create({
      data: {
        name: '[DEMO] Delta Green Vegetable Plot',
        farmType: FarmType.vegetable,
        areaFeddan: new Prisma.Decimal('25.00'),
        governorate: 'Sharqia',
        areaName: 'Bilbeis',
        waterSource: 'canal',
        irrigationMethod: 'sprinkler',
        energySource: 'grid',
        soilType: 'clay',
        mainActivity: 'Seasonal open field vegetable production',
        description: '[DEMO] Synthetic demo vegetable plot for local development testing.',
        farmStatus: 'active',
        createdBy: demoOwner.id,
        cropTypes: {
          create: [{ cropType: 'Tomato' }, { cropType: 'Potato' }],
        },
        relationships: {
          create: {
            userId: demoOwner.id,
            relationshipRole: FarmRelationshipRole.owner,
            relationshipStatus: FarmRelationshipStatus.active,
          },
        },
        agriculturalFacilities: {
          create: {
            name: '[DEMO] Electric Pump Station',
            facilityType: 'Pump Station',
            description: '[DEMO] 25 HP electric irrigation pump',
            ownerUserId: demoOwner.id,
          },
        },
      },
    });
  }

  // 4. Synthetic Demo Listing Requests (UNPUBLISHED, private)
  console.log('Creating demo listing requests (draft & under review)...');

  // Request 1: Draft Sale Listing
  const req1 = await prisma.request.upsert({
    where: { requestNumber: 'DEMO-REQ-2026-0001' },
    update: {},
    create: {
      requestNumber: 'DEMO-REQ-2026-0001',
      requestType: RequestType.farmListing,
      farmId: farm1.id,
      createdBy: demoOwner.id,
      status: 'draft',
      visibility: RequestVisibility.private,
      currentStep: 2,
      publishedAt: null,
      listingDetail: {
        create: {
          slug: 'demo-nile-valley-olive-grove',
          listingType: ListingType.sale,
          askingPrice: new Prisma.Decimal('4500000.00'),
          statedSalePricePerFeddan: new Prisma.Decimal('290322.58'),
          currency: 'EGP',
          availability: 'available',
          listingDescription: '[DEMO] Unreviewed synthetic sale draft for local development testing.',
        },
      },
    },
  });

  // Request 2: Rent Listing Under Review (Submitted to FarmExit, NOT published)
  const req2 = await prisma.request.upsert({
    where: { requestNumber: 'DEMO-REQ-2026-0002' },
    update: {},
    create: {
      requestNumber: 'DEMO-REQ-2026-0002',
      requestType: RequestType.farmListing,
      farmId: farm2.id,
      createdBy: demoOwner.id,
      status: 'underFarmExitReview',
      visibility: RequestVisibility.private,
      currentStep: 3,
      submittedAt: new Date('2026-02-01T10:00:00.000Z'),
      publishedAt: null,
      listingDetail: {
        create: {
          slug: 'demo-delta-green-vegetable-plot',
          listingType: ListingType.rent,
          annualRentPerFeddan: new Prisma.Decimal('18000.00'),
          currency: 'EGP',
          availability: 'seasonal',
          listingDescription: '[DEMO] Unreviewed synthetic rent request submitted for FarmExit review.',
        },
      },
    },
  });

  console.log('✅ Seeding completed successfully:');
  console.log(`   - Users created/verified: 3 (Owner, Agronomist, Staff Agent)`);
  console.log(`   - Professional profiles: 1 (Unverified)`);
  console.log(`   - Farms: 2 (Olive Grove, Vegetable Plot)`);
  console.log(`   - Requests: 2 (${req1.requestNumber} [draft], ${req2.requestNumber} [underFarmExitReview])`);
  console.log('   - No fake scores, no fake licenses, no payments, no auto-published listings.');
  console.log('   - No admin user: from repo root run npm run admin:bootstrap -- --mobile <number> --name "<name>"');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
