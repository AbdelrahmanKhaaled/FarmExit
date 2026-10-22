import { FarmManagementRequestsService } from './farm-management-requests.service';
import { PartnershipRequestsService } from '../partnership-requests/partnership-requests.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { StaffFarmManagementReviewsService } from './staff-farm-management-reviews.service';
import { StaffPartnershipReviewsService } from '../partnership-requests/staff-partnership-reviews.service';
import { StaffPermission } from '../authorization/staff-permissions';
import { StaffPartnershipApplicationsReviewsService } from '../partnership-applications/staff-partnership-applications-reviews.service';

describe.each([
  [FarmManagementRequestsService, 'farmManagement', 'managementDetail'],
  [PartnershipRequestsService, 'partnership', 'partnershipDetail'],
] as const)('%s public discovery', (Controller, requestType, detail) => {
  it('only selects approved public requests on active farms and excludes private fields', async () => {
    const prisma = {
      request: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1n,
            publishedAt: new Date('2026-10-22T08:00:00Z'),
            farm: { name: 'Farm', governorate: 'Giza', areaName: null, areaFeddan: '25.5' },
            [detail]: {},
          },
        ]),
      },
    };
    const result = await new Controller(prisma as unknown as PrismaService, {} as never).listPublic({
      page: 2,
      pageSize: 10,
    });
    const args = (
      prisma.request.findMany.mock.calls as unknown as [{ where: unknown; skip: number; select: unknown }][]
    )[0][0];
    expect(args.where).toMatchObject({
      requestType,
      status: 'approved',
      visibility: 'public',
      publishedAt: { not: null },
      reviews: { some: { decision: 'approved' } },
      farm: { deletedAt: null },
    });
    expect(args.skip).toBe(10);
    expect(args.select).not.toHaveProperty('creator');
    expect(args.select).not.toHaveProperty('reviews');
    expect(result.items[0]).toMatchObject({ id: '1', areaFeddan: 25.5, reviewStatus: 'approved' });
    expect(() => JSON.stringify(result)).not.toThrow();
  });
});

describe.each([
  StaffFarmManagementReviewsService,
  StaffPartnershipReviewsService,
  StaffPartnershipApplicationsReviewsService,
])('%s reviewed details', (Service) => {
  it.each(['approved', 'changesRequested', 'rejected'] as const)(
    'review decision never changes publication or visibility: %s',
    async (decision) => {
      const tx = {
        request: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        requestReview: { create: jest.fn() },
        requestStatusHistory: { create: jest.fn() },
        auditLog: { create: jest.fn() },
      };
      const prisma = { $transaction: jest.fn((run: (client: typeof tx) => Promise<void>) => run(tx)) };
      const auth = {
        loadContext: jest
          .fn()
          .mockResolvedValue({ roles: ['superAdmin'], permissions: [StaffPermission.RequestsReview] }),
      };
      const domain = { getById: jest.fn().mockResolvedValue({ id: '1', status: decision }) };
      const service = new Service(prisma as never, auth as never, domain as never);
      await service.decide(2n, 1n, { decision, comment: 'Reviewed' });
      expect(tx.request.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'underFarmExitReview' }) as unknown,
          data: { status: decision },
        }),
      );
      expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    },
  );

  it('allows authorized admins to revisit approved requests', async () => {
    const prisma = { request: { findFirst: jest.fn().mockResolvedValue({ id: 1n, status: 'approved' }) } };
    const auth = {
      loadContext: jest.fn().mockResolvedValue({ roles: ['superAdmin'], permissions: [StaffPermission.RequestsRead] }),
    };
    const domain = { getById: jest.fn().mockResolvedValue({ id: '1', status: 'approved' }) };
    const service = new Service(prisma as never, auth as never, domain as never);
    await expect(service.get(2n, 1n)).resolves.toMatchObject({ status: 'approved' });
    const args = (prisma.request.findFirst.mock.calls as unknown as [{ where: unknown }][])[0][0];
    expect(args.where).not.toHaveProperty('status');
  });
});
