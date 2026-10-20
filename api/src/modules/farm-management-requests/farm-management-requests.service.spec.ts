import { BadRequestException } from '@nestjs/common';
import { FarmRelationshipRole, RequestType } from '../../generated/prisma/enums';
import type { PrismaService } from '../../prisma/prisma.service';
import type { FarmAccessService } from '../authorization/farm-access.service';
import { FarmManagementRequestsService } from './farm-management-requests.service';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateFarmManagementRequestDto, UpdateFarmManagementRequestDto } from './dto/farm-management-request.dto';

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
        findUnique: jest
          .fn()
          .mockResolvedValue({ requestId: 3n, professionalNeed: 'farmManager', currentSituation: null }),
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

  it('restores private optional fields without exposing persistence internals', async () => {
    prisma.farmManagementDetail.findUnique.mockResolvedValue({
      requestId: 3n,
      professionalNeed: 'farmManager',
      managementTypes: ['productionSupervision'],
      goals: ['Improve irrigation'],
      challenges: ['Irrigation needs attention'],
      outcomes: 'Measured after season',
      additionalInformation: 'Discuss via FarmExit',
      currentSituation: 'Owner-stated situation',
    });
    Object.assign(prisma, { requestReview: { findMany: jest.fn().mockResolvedValue([]) } });
    const result = await service.get(1n, 3n);
    expect(result).toMatchObject({
      goals: ['Improve irrigation'],
      challenges: ['Irrigation needs attention'],
      outcomes: 'Measured after season',
      additionalInformation: 'Discuss via FarmExit',
    });
    expect(result).not.toHaveProperty('createdBy');
    expect(result).not.toHaveProperty('visibility');
  });
});

describe('Management optional-field validation', () => {
  for (const Contract of [CreateFarmManagementRequestDto, UpdateFarmManagementRequestDto]) {
    it(`${Contract.name} accepts the same supported fields`, () => {
      const dto = plainToInstance(Contract, {
        professionalNeed: 'farmManager',
        managementTypes: ['productionSupervision'],
        goals: ['A goal'],
        challenges: ['A challenge'],
        outcomes: ' Result ',
        additionalInformation: ' Context ',
      });
      expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
      expect(dto.outcomes).toBe('Result');
    });
    it.each(['goals', 'challenges'])(`${Contract.name} rejects scalar %s`, (field) => {
      const dto = plainToInstance(Contract, { professionalNeed: 'farmManager', [field]: 'not an array' });
      expect(validateSync(dto).some((error) => error.property === field)).toBe(true);
    });
    it(`${Contract.name} rejects overlong outcomes and unapproved publication fields`, () => {
      const dto = plainToInstance(Contract, {
        professionalNeed: 'farmManager',
        outcomes: 'x'.repeat(8001),
        visibility: 'public',
      });
      expect(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).map((error) => error.property)).toEqual(
        expect.arrayContaining(['outcomes', 'visibility']),
      );
    });
  }
});
