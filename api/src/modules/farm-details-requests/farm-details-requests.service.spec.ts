import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RequestType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { FarmAccessService } from '../authorization/farm-access.service';
import { FarmDetailsRequestsService } from './farm-details-requests.service';

describe('FarmDetailsRequestsService', () => {
  let service: FarmDetailsRequestsService;
  const prisma = {
    farmListingDetail: { findUnique: jest.fn() },
    request: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
    requestStatusHistory: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    requestReview: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(),
  };
  const farmAccess = { hasAnyRole: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        FarmDetailsRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FarmAccessService, useValue: farmAccess },
      ],
    }).compile();
    service = moduleRef.get(FarmDetailsRequestsService);
  });

  it('rejects owners requesting details on their listing', async () => {
    prisma.farmListingDetail.findUnique.mockResolvedValue({
      requestId: 50n,
      slug: 'farm-sale',
      listingType: 'sale',
    });
    prisma.request.findFirst.mockResolvedValue({
      id: 50n,
      farmId: 10n,
      createdBy: 1n,
      requestType: RequestType.farmListing,
      status: 'published',
      visibility: 'public',
    });
    farmAccess.hasAnyRole.mockResolvedValue(true);
    await expect(service.create(1n, { listingSlug: 'farm-sale' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects unpublished listings', async () => {
    prisma.farmListingDetail.findUnique.mockResolvedValue({ requestId: 50n, slug: 'x', listingType: 'sale' });
    prisma.request.findFirst.mockResolvedValue(null);
    await expect(service.create(2n, { listingSlug: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
