import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CoPurchaseGroupStatus,
  CoPurchaseMemberStatus,
  CommunicationCaseStatus,
  EvaluationStatus,
  FarmRelationshipRole,
  FarmRelationshipStatus,
  FarmType,
  ListingType,
  Prisma,
  PrismaClient,
  ProfessionalNeed,
  ProfessionalType,
  ProposalKind,
  RequestType,
  RequestVisibility,
  SaleMode,
  StaffRole,
  VerificationStatus,
  type AccountStatus,
} from '../src/generated/prisma/client';
import {
  DEMO_TAG,
  REQ_PREFIX,
  STAFF_MOBILE,
  buildDemoPlan,
  daysAgoUtc,
  demoMobile,
  GOVERNORATES,
} from './seed-dashboard-demo-plan';

const NON_PUBLISHED_LISTING_STATUSES = [
  'draft',
  'underFarmExitReview',
  'changesRequested',
  'approved',
  'rejected',
] as const;

const FARM_TYPES = [FarmType.vegetable, FarmType.fruit, FarmType.mixed, FarmType.livestock] as const;

function listingScenario(i: number, publishedTarget: number): { status: string; listingType: ListingType } {
  if (i <= publishedTarget) {
    const listingType = i % 4 === 0 ? ListingType.rent : ListingType.sale;
    return { status: 'published', listingType };
  }
  const offset = i - publishedTarget - 1;
  return {
    status: NON_PUBLISHED_LISTING_STATUSES[offset % NON_PUBLISHED_LISTING_STATUSES.length],
    listingType: i % 3 === 0 ? ListingType.rent : ListingType.sale,
  };
}

export type DemoManifest = {
  version: 1;
  seededAt: string;
  users: string[];
  farms: string[];
  requests: string[];
  coPurchaseGroups: string[];
  communicationCases: string[];
  evaluations: string[];
};

const PRISMA_DIR = join(process.cwd(), 'prisma');
const MANIFEST_PATH = join(PRISMA_DIR, '.dashboard-demo-manifest.json');

export function manifestPath(): string {
  return MANIFEST_PATH;
}

export async function applyDashboardDemo(prisma: PrismaClient): Promise<DemoManifest> {
  const plan = buildDemoPlan();
  const manifest: DemoManifest = {
    version: 1,
    seededAt: new Date().toISOString(),
    users: [],
    farms: [],
    requests: [],
    coPurchaseGroups: [],
    communicationCases: [],
    evaluations: [],
  };

  const staff = await prisma.user.upsert({
    where: { mobileE164: STAFF_MOBILE },
    update: { fullName: `${DEMO_TAG} Case Agent Staff` },
    create: {
      mobileE164: STAFF_MOBILE,
      fullName: `${DEMO_TAG} Case Agent Staff`,
      email: 'demo-dash-staff@example.test',
      accountStatus: 'active' as AccountStatus,
      mobileVerifiedAt: daysAgoUtc(300),
      createdAt: daysAgoUtc(300),
    },
  });
  manifest.users.push(staff.id.toString());
  await prisma.staffMembership.upsert({
    where: { userId_staffRole: { userId: staff.id, staffRole: StaffRole.caseAgent } },
    update: {},
    create: { userId: staff.id, staffRole: StaffRole.caseAgent, status: 'active' },
  });

  const userIds: bigint[] = [];
  const firstNames = ['Ahmed', 'Mohamed', 'Sara', 'Fatma', 'Omar', 'Nour', 'Hassan', 'Layla'];
  for (let i = 1; i <= plan.users; i++) {
    const mobile = demoMobile(i);
    const name = `${DEMO_TAG} ${firstNames[i % firstNames.length]} ${String(i).padStart(2, '0')}`;
    const createdAt = daysAgoUtc(30 + (i % 330), 8 + (i % 10));
    const user = await prisma.user.upsert({
      where: { mobileE164: mobile },
      update: { fullName: name },
      create: {
        mobileE164: mobile,
        fullName: name,
        email: `demo-dash-user-${i}@example.test`,
        accountStatus: 'active',
        mobileVerifiedAt: createdAt,
        createdAt,
      },
    });
    userIds.push(user.id);
    manifest.users.push(user.id.toString());
  }

  const farmIds: bigint[] = [];
  for (let i = 1; i <= plan.farms; i++) {
    const gov = GOVERNORATES[i % GOVERNORATES.length];
    const name = `${DEMO_TAG} ${gov} Farm ${String(i).padStart(2, '0')}`;
    const owner = userIds[(i - 1) % userIds.length];
    const createdAt = daysAgoUtc(20 + (i % 340));
    let farm = await prisma.farm.findFirst({ where: { name } });
    if (!farm) {
      farm = await prisma.farm.create({
        data: {
          name,
          farmType: FARM_TYPES[i % FARM_TYPES.length],
          areaFeddan: new Prisma.Decimal(String(5 + (i % 45))),
          governorate: gov,
          areaName: `${gov} demo area`,
          waterSource: i % 2 === 0 ? 'well' : 'canal',
          irrigationMethod: i % 3 === 0 ? 'drip' : 'flood',
          energySource: 'grid',
          soilType: 'loam',
          mainActivity: `${DEMO_TAG} mixed agriculture scenario`,
          description: `${DEMO_TAG} Synthetic local development farm — not verified ownership.`,
          farmStatus: 'active',
          createdBy: owner,
          createdAt,
          relationships: {
            create: {
              userId: owner,
              relationshipRole: FarmRelationshipRole.owner,
              relationshipStatus: FarmRelationshipStatus.active,
            },
          },
        },
      });
    }
    farmIds.push(farm.id);
    manifest.farms.push(farm.id.toString());

    if (i % 7 === 0 && userIds.length > 5) {
      const tenant = userIds[(i + 3) % userIds.length];
      await prisma.farmRelationship.upsert({
        where: { farmId_userId_relationshipRole: { farmId: farm.id, userId: tenant, relationshipRole: FarmRelationshipRole.tenant } },
        update: {},
        create: {
          farmId: farm.id,
          userId: tenant,
          relationshipRole: FarmRelationshipRole.tenant,
          relationshipStatus: FarmRelationshipStatus.active,
        },
      });
    }
  }

  const publishedListingIds: bigint[] = [];
  for (let i = 1; i <= plan.listingRequests; i++) {
    const requestNumber = `${REQ_PREFIX}LST-${String(i).padStart(4, '0')}`;
    const farmId = farmIds[(i - 1) % farmIds.length];
    const owner = userIds[(i - 1) % userIds.length];
    const { status, listingType } = listingScenario(i, plan.publishedListings);
    const isPublished = status === 'published';
    const createdAt = daysAgoUtc(5 + (i % 350));
    const publishedAt = isPublished ? daysAgoUtc(Math.max(1, i % 180)) : null;
    const slug = `demo-dash-${i}-${listingType}`;

    const req = await prisma.request.upsert({
      where: { requestNumber },
      update: {
        status,
        visibility: isPublished ? RequestVisibility.public : RequestVisibility.private,
        publishedAt,
      },
      create: {
        requestNumber,
        requestType: RequestType.farmListing,
        farmId,
        createdBy: owner,
        status,
        visibility: isPublished ? RequestVisibility.public : RequestVisibility.private,
        currentStep: 3,
        createdAt,
        submittedAt: status === 'draft' ? null : daysAgoUtc(Math.max(2, (i % 200))),
        publishedAt,
        listingDetail: {
          create: {
            slug,
            listingType,
            currency: 'EGP',
            availability: 'available',
            askingPrice: listingType === ListingType.sale ? new Prisma.Decimal(String(2_000_000 + i * 50_000)) : null,
            annualRentPerFeddan: listingType === ListingType.rent ? new Prisma.Decimal(String(12_000 + i * 200)) : null,
            listingDescription: `${DEMO_TAG} Synthetic listing scenario ${i} — not a verified sale.`,
          },
        },
      },
    });
    manifest.requests.push(req.id.toString());
    if (isPublished && listingType === ListingType.sale) {
      publishedListingIds.push(req.id);
      await prisma.farmSaleTerms.upsert({
        where: { listingRequestId: req.id },
        update: {},
        create: {
          listingRequestId: req.id,
          saleMode: i % 5 === 0 ? SaleMode.quickSale : SaleMode.standardCash,
          acceptsCashProposals: true,
          acceptsInstallmentProposals: true,
          acceptsExchangeProposals: i % 4 === 0,
        },
      });
    }
  }

  const proposalKinds = [
    ProposalKind.cash,
    ProposalKind.installment,
    ProposalKind.exchange,
    ProposalKind.mixed,
    ProposalKind.coPurchase,
  ] as const;
  for (let i = 1; i <= plan.purchaseProposals; i++) {
    const listingId = publishedListingIds[(i - 1) % Math.max(1, publishedListingIds.length)];
    if (!listingId) continue;
    const requestNumber = `${REQ_PREFIX}PROP-${String(i).padStart(4, '0')}`;
    const buyer = userIds[(i + 5) % userIds.length];
    const createdAt = daysAgoUtc(3 + (i % 120));
    const kind = proposalKinds[i % proposalKinds.length];
    const req = await prisma.request.upsert({
      where: { requestNumber },
      update: { status: 'submitted' },
      create: {
        requestNumber,
        requestType: RequestType.farmPurchaseProposal,
        parentRequestId: listingId,
        createdBy: buyer,
        status: 'submitted',
        visibility: RequestVisibility.private,
        createdAt,
        submittedAt: createdAt,
        purchaseProposalDetail: {
          create: {
            proposalKind: kind,
            proposedTotalValue: new Prisma.Decimal(String(1_500_000 + i * 25_000)),
            currency: 'EGP',
            proposalNotes: `${DEMO_TAG} Nonbinding buyer interest — not a completed purchase.`,
            submittedAt: createdAt,
          },
        },
      },
    });
    manifest.requests.push(req.id.toString());
  }

  for (let g = 1; g <= plan.coPurchaseGroups; g++) {
    const listingId = publishedListingIds[(g - 1) % Math.max(1, publishedListingIds.length)];
    if (!listingId) continue;
    const existing = await prisma.coPurchaseGroup.findFirst({
      where: { listingRequestId: listingId, notes: { contains: DEMO_TAG } },
    });
    const group =
      existing ??
      (await prisma.coPurchaseGroup.create({
        data: {
          listingRequestId: listingId,
          assignedStaffId: staff.id,
          targetSharePercent: new Prisma.Decimal('100'),
          groupStatus: g % 3 === 0 ? CoPurchaseGroupStatus.closed : CoPurchaseGroupStatus.collectingInterest,
          notes: `${DEMO_TAG} Co-purchase interest group ${g}`,
          createdAt: daysAgoUtc(10 + g),
        },
      }));
    manifest.coPurchaseGroups.push(group.id.toString());

    const proposal = await prisma.request.findFirst({
      where: { parentRequestId: listingId, requestType: RequestType.farmPurchaseProposal },
      orderBy: { id: 'asc' },
      skip: g - 1,
    });
    if (proposal) {
      await prisma.coPurchaseGroupMember.upsert({
        where: { groupId_buyerProposalRequestId: { groupId: group.id, buyerProposalRequestId: proposal.id } },
        update: {},
        create: {
          groupId: group.id,
          buyerProposalRequestId: proposal.id,
          proposedSharePercent: new Prisma.Decimal(String(15 + g * 3)),
          memberStatus: CoPurchaseMemberStatus.candidate,
        },
      });
    }
  }

  for (let i = 1; i <= plan.partnershipRequests; i++) {
    const requestNumber = `${REQ_PREFIX}PART-${String(i).padStart(4, '0')}`;
    const owner = userIds[i % userIds.length];
    const farmId = farmIds[i % farmIds.length];
    const createdAt = daysAgoUtc(15 + (i % 300));
    const status = i % 4 === 0 ? 'approved' : i % 3 === 0 ? 'changesRequested' : 'underFarmExitReview';
    const req = await prisma.request.upsert({
      where: { requestNumber },
      update: { status },
      create: {
        requestNumber,
        requestType: RequestType.partnership,
        farmId,
        createdBy: owner,
        status,
        visibility: RequestVisibility.private,
        createdAt,
        submittedAt: createdAt,
        partnershipDetail: {
          create: {
            description: `${DEMO_TAG} Partnership opportunity ${i} — not a legal partnership.`,
          },
        },
      },
    });
    manifest.requests.push(req.id.toString());
  }

  for (let i = 1; i <= plan.partnershipApplications; i++) {
    const parent = await prisma.request.findFirst({
      where: { requestNumber: { startsWith: `${REQ_PREFIX}PART-` } },
      orderBy: { id: 'asc' },
      skip: i % plan.partnershipRequests,
    });
    if (!parent) continue;
    const requestNumber = `${REQ_PREFIX}PARTAPP-${String(i).padStart(4, '0')}`;
    const applicant = userIds[(i + 10) % userIds.length];
    const createdAt = daysAgoUtc(8 + (i % 200));
    const req = await prisma.request.upsert({
      where: { requestNumber },
      update: {},
      create: {
        requestNumber,
        requestType: RequestType.partnershipApplication,
        parentRequestId: parent.id,
        createdBy: applicant,
        status: i % 5 === 0 ? 'rejected' : 'submitted',
        visibility: RequestVisibility.private,
        createdAt,
        submittedAt: createdAt,
        applicationDetail: {
          create: {
            applicationMessage: `${DEMO_TAG} Synthetic partnership application ${i}`,
          },
        },
      },
    });
    manifest.requests.push(req.id.toString());
  }

  for (let i = 1; i <= plan.farmManagementRequests; i++) {
    const requestNumber = `${REQ_PREFIX}MGT-${String(i).padStart(4, '0')}`;
    const farmId = farmIds[i % farmIds.length];
    const owner = userIds[i % userIds.length];
    const createdAt = daysAgoUtc(12 + (i % 250));
    const req = await prisma.request.upsert({
      where: { requestNumber },
      update: {},
      create: {
        requestNumber,
        requestType: RequestType.farmManagement,
        farmId,
        createdBy: owner,
        status: i % 3 === 0 ? 'approved' : 'underFarmExitReview',
        visibility: RequestVisibility.private,
        createdAt,
        submittedAt: createdAt,
        managementDetail: {
          create: {
            professionalNeed: ProfessionalNeed.farmManager,
            currentSituation: `${DEMO_TAG} Management need scenario ${i}`,
          },
        },
      },
    });
    manifest.requests.push(req.id.toString());
  }

  for (let i = 1; i <= plan.professionalVerificationRequests; i++) {
    const proUser = userIds[(i + 20) % userIds.length];
    const profile = await prisma.professionalProfile.upsert({
      where: { userId: proUser },
      update: { headline: `${DEMO_TAG} Agronomist profile ${i}` },
      create: {
        userId: proUser,
        headline: `${DEMO_TAG} Agronomist profile ${i}`,
        baseGovernorate: GOVERNORATES[i % GOVERNORATES.length],
        capabilities: {
          create: {
            professionalType: ProfessionalType.agriculturalEngineer,
            verificationStatus: VerificationStatus.verificationRequired,
          },
        },
      },
    });
    const capability = await prisma.professionalCapability.upsert({
      where: {
        professionalProfileId_professionalType: {
          professionalProfileId: profile.id,
          professionalType: ProfessionalType.agriculturalEngineer,
        },
      },
      update: {},
      create: {
        professionalProfileId: profile.id,
        professionalType: ProfessionalType.agriculturalEngineer,
        verificationStatus: VerificationStatus.verificationRequired,
      },
    });
    const requestNumber = `${REQ_PREFIX}PROF-${String(i).padStart(4, '0')}`;
    const createdAt = daysAgoUtc(25 + (i % 200));
    const req = await prisma.request.upsert({
      where: { requestNumber },
      update: {},
      create: {
        requestNumber,
        requestType: RequestType.professionalVerification,
        createdBy: proUser,
        status: i % 2 === 0 ? 'draft' : 'submitted',
        visibility: RequestVisibility.private,
        createdAt,
        submittedAt: i % 2 === 0 ? null : createdAt,
        professionalVerification: {
          create: {
            professionalCapabilityId: capability.id,
            profileSnapshot: { demo: true, tag: DEMO_TAG },
          },
        },
      },
    });
    manifest.requests.push(req.id.toString());
  }

  for (let i = 1; i <= plan.farmDetailsRequests; i++) {
    const listing = await prisma.request.findFirst({
      where: { requestNumber: { startsWith: `${REQ_PREFIX}LST-` }, status: 'published' },
      orderBy: { id: 'asc' },
      skip: i % Math.max(1, publishedListingIds.length),
    });
    if (!listing) continue;
    const requestNumber = `${REQ_PREFIX}DET-${String(i).padStart(4, '0')}`;
    const inquirer = userIds[(i + 7) % userIds.length];
    const createdAt = daysAgoUtc(4 + (i % 90));
    const req = await prisma.request.upsert({
      where: { requestNumber },
      update: {},
      create: {
        requestNumber,
        requestType: RequestType.farmDetails,
        parentRequestId: listing.id,
        farmId: listing.farmId,
        createdBy: inquirer,
        status: i % 4 === 0 ? 'approved' : 'underFarmExitReview',
        visibility: RequestVisibility.private,
        createdAt,
        submittedAt: createdAt,
      },
    });
    manifest.requests.push(req.id.toString());
  }

  for (let i = 1; i <= plan.draftEvaluations; i++) {
    const farmId = farmIds[i % farmIds.length];
    const note = `${DEMO_TAG} Draft internal evaluation ${i} — not published.`;
    const existing = await prisma.farmEvaluation.findFirst({
      where: { internalNotes: note },
    });
    if (existing) {
      manifest.evaluations.push(existing.id.toString());
      continue;
    }
    const ev = await prisma.farmEvaluation.create({
      data: {
        farmId,
        reviewedBy: staff.id,
        status: EvaluationStatus.draft,
        scoreValue: null,
        scoreMax: null,
        internalNotes: note,
        createdAt: daysAgoUtc(7 + i),
      },
    });
    manifest.evaluations.push(ev.id.toString());
  }

  for (let i = 1; i <= plan.communicationCases; i++) {
    const parentReq = await prisma.request.findFirst({
      where: { requestNumber: { startsWith: REQ_PREFIX } },
      orderBy: { id: 'asc' },
      skip: i * 3,
    });
    if (!parentReq) continue;
    const existing = await prisma.communicationCase.findFirst({
      where: { requestId: parentReq.id, assignedStaffId: staff.id },
    });
    const caseRow =
      existing ??
      (await prisma.communicationCase.create({
        data: {
          requestId: parentReq.id,
          assignedStaffId: staff.id,
          status: i % 4 === 0 ? CommunicationCaseStatus.closed : CommunicationCaseStatus.open,
          createdAt: daysAgoUtc(2 + i),
        },
      }));
    manifest.communicationCases.push(caseRow.id.toString());

    const extA = userIds[i % userIds.length];
    const extB = userIds[(i + 1) % userIds.length];
    const convA = await prisma.conversation.upsert({
      where: { caseId_externalUserId: { caseId: caseRow.id, externalUserId: extA } },
      update: {},
      create: { caseId: caseRow.id, externalUserId: extA, status: 'open', createdAt: daysAgoUtc(2 + i) },
    });
    await prisma.conversation.upsert({
      where: { caseId_externalUserId: { caseId: caseRow.id, externalUserId: extB } },
      update: {},
      create: { caseId: caseRow.id, externalUserId: extB, status: 'open', createdAt: daysAgoUtc(2 + i) },
    });
    const inboundBody = `${DEMO_TAG} Synthetic mediated message ${i}`;
    let msg = await prisma.message.findFirst({ where: { conversationId: convA.id, body: inboundBody } });
    if (!msg) {
      msg = await prisma.message.create({
        data: {
          conversationId: convA.id,
          senderId: extA,
          body: inboundBody,
          sentAt: daysAgoUtc(1 + i),
        },
      });
    }
    const convB = await prisma.conversation.findFirstOrThrow({
      where: { caseId: caseRow.id, externalUserId: extB },
    });
    const relayBody = `${DEMO_TAG} Staff relay copy ${i}`;
    let relayed = await prisma.message.findFirst({ where: { conversationId: convB.id, body: relayBody } });
    if (!relayed) {
      relayed = await prisma.message.create({
        data: {
          conversationId: convB.id,
          senderId: staff.id,
          body: relayBody,
          sentAt: daysAgoUtc(1 + i),
        },
      });
    }
    const relayExists = await prisma.messageRelay.findFirst({ where: { sourceMessageId: msg.id } });
    if (!relayExists) {
      await prisma.messageRelay.create({
        data: {
          sourceMessageId: msg.id,
          relayedMessageId: relayed.id,
          relayedBy: staff.id,
          relayNote: `${DEMO_TAG} relay audit`,
          relayedAt: daysAgoUtc(1 + i),
        },
      });
    }
  }

  const existingAuditCount = await prisma.auditLog.count({ where: { action: 'demo_seed_action' } });
  for (let i = existingAuditCount + 1; i <= plan.auditLogs; i++) {
    const entityId = BigInt(manifest.requests[i % manifest.requests.length] ?? '1');
    await prisma.auditLog.create({
      data: {
        actorUserId: staff.id,
        entityType: 'request',
        entityId,
        action: 'demo_seed_action',
        changes: { tag: DEMO_TAG, index: i },
        createdAt: daysAgoUtc(i % 365),
      },
    });
  }

  mkdirSync(join(PRISMA_DIR, 'backups'), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

export async function countDemoRecords(prisma: PrismaClient): Promise<Record<string, number>> {
  const [users, farms, requests, cases, audits] = await Promise.all([
    prisma.user.count({ where: { fullName: { contains: DEMO_TAG } } }),
    prisma.farm.count({ where: { name: { contains: DEMO_TAG } } }),
    prisma.request.count({ where: { requestNumber: { startsWith: REQ_PREFIX } } }),
    prisma.communicationCase.count({
      where: { request: { requestNumber: { startsWith: REQ_PREFIX } } },
    }),
    prisma.auditLog.count({ where: { action: 'demo_seed_action' } }),
  ]);
  return { demoUsers: users, demoFarms: farms, demoRequests: requests, demoCommCases: cases, demoAuditLogs: audits };
}
