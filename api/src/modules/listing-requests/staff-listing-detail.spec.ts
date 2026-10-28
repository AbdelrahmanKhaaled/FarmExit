import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffAuthorizationService } from '../authorization/staff-authorization.service';
import { permissionsForRoles } from '../authorization/staff-permissions';
import { StaffListingReviewsService } from './staff-listing-reviews.service';

describe('listing detail after review', () => {
  const request = {
    id: 5n,
    farmId: 6n,
    requestNumber: 'TEST-LISTING',
    requestType: 'farmListing',
    status: 'approved',
    visibility: 'private',
  };
  const prisma = {
    request: { findFirst: jest.fn() },
    farm: { findMany: jest.fn().mockResolvedValue([{ id: 6n, name: 'Farm', areaFeddan: 10 }]) },
    farmListingDetail: {
      findMany: jest.fn().mockResolvedValue([{ requestId: 5n, listingType: 'sale', slug: 'test', currency: 'EGP' }]),
    },
    requestStaffAssignment: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    requestReview: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const auth = { loadContext: jest.fn() };
  let service: StaffListingReviewsService;
  beforeEach(async () => {
    jest.clearAllMocks();
    auth.loadContext.mockResolvedValue({ roles: ['admin'], permissions: permissionsForRoles(['admin']) });
    prisma.request.findFirst.mockImplementation(({ where }: { where: { status: unknown } }) =>
      // Apply the real query's status predicate to the approved fixture.
      Promise.resolve(typeof where.status === 'string' && where.status !== request.status ? null : request),
    );
    const module = await Test.createTestingModule({
      providers: [
        StaffListingReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StaffAuthorizationService, useValue: auth },
      ],
    }).compile();
    service = module.get(StaffListingReviewsService);
  });
  it('opens the approved publication-queue request using its existing listing route', async () => {
    await expect(service.get(1n, 5n)).resolves.toMatchObject({ id: '5', status: 'approved' });
  });
  it('still denies an unassigned reviewer access to the same request', async () => {
    auth.loadContext.mockResolvedValue({ roles: ['reviewer'], permissions: permissionsForRoles(['reviewer']) });
    prisma.requestStaffAssignment.findFirst.mockResolvedValue(null);
    await expect(service.get(2n, 5n)).rejects.toMatchObject({ status: 404 });
  });
});
