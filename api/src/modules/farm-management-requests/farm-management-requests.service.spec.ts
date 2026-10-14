import { BadRequestException } from '@nestjs/common';
import { FarmRelationshipRole, RequestType } from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';
import type { FarmAccessService } from '../authorization/farm-access.service';
import { FarmManagementRequestsService } from './farm-management-requests.service';

describe('FarmManagementRequestsService', () => {
  let farmAccess: { activeRoles: jest.Mock; activeRolesByFarm: jest.Mock };
  let prisma: {
    farm: { findFirst: jest.Mock };
    request: { findFirst: jest.Mock };
    farmManagementDetail: { findUnique: jest.Mock };
  };
  let service: FarmManagementRequestsService;

  beforeEach(() => {
    farmAccess = {
      activeRoles: jest.fn().mockResolvedValue([FarmRelationshipRole.owner]),
      activeRolesByFarm: jest.fn(),
    };
    prisma = {
      farm: { findFirst: jest.fn().mockResolvedValue({ id: 2n, name: 'Farm', deletedAt: null }) },
      request: {
        findFirst: jest.fn().mockResolvedValue({
          id: 3n,
          farmId: 2n,
          createdBy: 1n,
          requestType: RequestType.farmManagement,
          status: 'draft',
        }),
      },
      farmManagementDetail: {
        findUnique: jest.fn().mockResolvedValue({ requestId: 3n, professionalNeed: 'farmManager', currentSituation: null }),
      },
    };
    service = new FarmManagementRequestsService(
      prisma as unknown as PrismaService,
      farmAccess as unknown as FarmAccessService,
    );
  });

  it('requires current situation before submit', async () => {
    await expect(service.submit(1n, 3n)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('denies access when caller is not farm owner', async () => {
    farmAccess.activeRoles.mockResolvedValue([FarmRelationshipRole.manager]);
    await expect(service.get(1n, 3n)).rejects.toMatchObject({ status: 404 });
  });
});
