import { StaffFarmManagementReviewsService } from './staff-farm-management-reviews.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import type { FarmManagementRequestsService } from './farm-management-requests.service';
import { StaffPermission } from '../authorization/staff-permissions';

describe('management domain decisions', () => {
  function setup(roles = ['superAdmin'], permitted = true) {
    let status = 'underFarmExitReview';
    const tx = {
      request: {
        updateMany: jest.fn().mockImplementation(() => {
          if (status !== 'underFarmExitReview') return Promise.resolve({ count: 0 });
          status = 'approved';
          return Promise.resolve({ count: 1 });
        }),
      },
      requestReview: { create: jest.fn() },
      requestStatusHistory: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
      requestStaffAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const auth = {
      loadContext: jest
        .fn()
        .mockResolvedValue({ roles, permissions: permitted ? [StaffPermission.RequestsReview] : [] }),
    };
    const management = { getById: jest.fn().mockImplementation(() => ({ id: '3', status })) };
    const service = new StaffFarmManagementReviewsService(
      prisma as unknown as PrismaService,
      auth as unknown as StaffAuthorizationService,
      management as unknown as FarmManagementRequestsService,
    );
    return { service, tx, prisma };
  }
  it('allows superAdmin without assigning or publishing', async () => {
    const { service, tx, prisma } = setup();
    await expect(service.decide(1n, 3n, { decision: 'approved' })).resolves.toMatchObject({ status: 'approved' });
    expect(tx.request.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'approved' } }));
    expect(tx.requestReview.create).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.requestStaffAssignment.findFirst).not.toHaveBeenCalled();
  });
  it.each([['owner'], ['caseAgent'], ['reviewer']])('denies unassigned or unauthorized %j', async (role) => {
    const { service } = setup([role], role !== 'owner');
    await expect(service.decide(1n, 3n, { decision: 'approved' })).rejects.toBeDefined();
  });
  it('requires a rejection reason', async () => {
    await expect(setup().service.decide(1n, 3n, { decision: 'rejected' })).rejects.toMatchObject({ status: 400 });
  });
  it('only one racing approval records a decision', async () => {
    const { service, tx } = setup();
    const results = await Promise.allSettled([
      service.decide(1n, 3n, { decision: 'approved' }),
      service.decide(1n, 3n, { decision: 'approved' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(tx.requestReview.create).toHaveBeenCalledTimes(1);
  });
});
