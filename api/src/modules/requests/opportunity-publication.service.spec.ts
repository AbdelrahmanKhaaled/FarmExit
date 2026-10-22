import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RequestType, RequestVisibility } from '../../generated/prisma/enums';
import { OpportunityPublicationService } from './opportunity-publication.service';
import { REQUEST_STATUS_APPROVED } from './request-workflow.policy';

describe('OpportunityPublicationService', () => {
  const publishedAt = new Date('2026-10-22T10:00:00Z');

  function buildService(overrides: {
    roles?: string[];
    request?: Record<string, unknown>;
    updateCount?: number;
  }) {
    const tx = {
      request: {
        findFirst: jest.fn().mockResolvedValue(overrides.request ?? null),
        updateMany: jest.fn().mockResolvedValue({ count: overrides.updateCount ?? 1 }),
      },
      requestReview: { findFirst: jest.fn().mockResolvedValue({ id: 1n }) },
      farmManagementDetail: { findUnique: jest.fn().mockResolvedValue({ professionalNeed: 'agronomist' }) },
      partnershipDetail: { findUnique: jest.fn().mockResolvedValue({ id: 1n }) },
      farm: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      farmRelationship: {
        findMany: jest.fn().mockResolvedValue([{ startsAt: null, endsAt: null }]),
      },
      requestStatusHistory: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((run: (client: typeof tx) => Promise<void>) => run(tx)),
    };
    const staffAuth = {
      loadContext: jest.fn().mockResolvedValue({ roles: overrides.roles ?? ['reviewer'] }),
    };
    return { service: new OpportunityPublicationService(prisma as never, staffAuth as never), tx, staffAuth };
  }

  it('rejects unauthorized staff', async () => {
    const { service } = buildService({ roles: ['reviewer'] });
    await expect(service.publishManagement(1n, 762n)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('publishes approved private management opportunity', async () => {
    const { service, tx } = buildService({
      roles: ['superAdmin'],
      request: {
        id: 762n,
        farmId: 10n,
        createdBy: 2n,
        requestType: RequestType.farmManagement,
        status: REQUEST_STATUS_APPROVED,
        visibility: RequestVisibility.private,
        publishedAt: null,
        submittedAt: publishedAt,
      },
    });
    await service.publishManagement(1n, 762n);
    expect(tx.request.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { visibility: RequestVisibility.public, publishedAt: expect.any(Date) as Date },
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it('rejects already published opportunities', async () => {
    const { service } = buildService({
      roles: ['admin'],
      request: {
        id: 762n,
        farmId: 10n,
        createdBy: 2n,
        requestType: RequestType.partnership,
        status: REQUEST_STATUS_APPROVED,
        visibility: RequestVisibility.public,
        publishedAt: publishedAt,
        submittedAt: publishedAt,
      },
    });
    await expect(service.publishPartnership(1n, 762n)).rejects.toBeInstanceOf(ConflictException);
  });
});
