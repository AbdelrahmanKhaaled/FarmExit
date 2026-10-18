import { ConflictException } from '@nestjs/common';
import { FarmRelationshipRole, RequestType } from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';
import type { FarmAccessService } from '../authorization/farm-access.service';
import { PartnershipRequestsService } from './partnership-requests.service';

describe('PartnershipRequestsService', () => {
  let farmAccess: { activeRoles: jest.Mock };
  let prisma: { request: { findFirst: jest.Mock }; farm: { findFirst: jest.Mock } };
  let service: PartnershipRequestsService;

  beforeEach(() => {
    farmAccess = { activeRoles: jest.fn().mockResolvedValue([FarmRelationshipRole.owner]) };
    prisma = {
      farm: { findFirst: jest.fn().mockResolvedValue({ id: 2n, name: 'Farm', deletedAt: null }) },
      request: {
        findFirst: jest.fn().mockResolvedValue({
          id: 9n,
          farmId: 2n,
          createdBy: 1n,
          requestType: RequestType.partnership,
          status: 'draft',
        }),
      },
    };
    service = new PartnershipRequestsService(
      prisma as unknown as PrismaService,
      farmAccess as unknown as FarmAccessService,
    );
  });

  it('blocks duplicate active partnership requests on the same farm', async () => {
    prisma.request.findFirst.mockResolvedValueOnce({ id: 99n });
    await expect(
      service.create(1n, 2n, { description: 'Seeking partner' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
