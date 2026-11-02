import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateFarmManagementRequestDto, UpdateFarmManagementRequestDto } from './dto/farm-management-request.dto';
import { FarmManagementRequestsService } from './farm-management-requests.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { FarmAccessService } from '../authorization/farm-access.service';

describe('management request requirements', () => {
  const input = {
    professionalNeed: 'farmManager',
    responsibilities: ['operations', 'irrigation'],
    experienceLevel: 'Three seasons',
    onSitePresence: 'Weekly',
    currentTeam: [{ role: 'Irrigation', count: 2 }],
    resourcesAndFacilities: [{ facilityType: 'produce_storage', details: 'Available for the season' }],
    localizedContent: {
      ar: { currentSituation: 'تحتاج المزرعة إلى إدارة' },
      en: { currentSituation: 'Needs management' },
    },
  };
  for (const Contract of [CreateFarmManagementRequestDto, UpdateFarmManagementRequestDto]) {
    const errors = (value: object) =>
      validateSync(plainToInstance(Contract, value), { whitelist: true, forbidNonWhitelisted: true });
    it(`${Contract.name}: validates bilingual requirements`, () => expect(errors(input)).toEqual([]));
    it.each([
      { responsibilities: ['unknown'] },
      { responsibilities: ['operations', 'operations'] },
      { currentTeam: [{ role: 'Worker', count: -1 }] },
      { resourcesAndFacilities: [{ facilityType: 'unknown', details: 'x' }] },
      { resourcesAndFacilities: [{ facilityType: 'produce_storage', details: 'x', farmId: '2' }] },
      { localizedContent: { ar: { experienceLevel: 'x'.repeat(31) } } },
    ])(`${Contract.name}: rejects invalid requirements %j`, (invalid) =>
      expect(errors({ ...input, ...invalid }).length).toBeGreaterThan(0),
    );
  }

  it('writes and reads request columns, preserves the other language, and never writes farm inventory', async () => {
    let detail = {
      requestId: 3n,
      professionalNeed: 'farmManager',
      localizedContent: { ar: { currentSituation: 'محفوظ' } },
    };
    const request = { id: 3n, farmId: 2n, createdBy: 1n, requestType: 'farmManagement', status: 'draft' };
    const farm = { id: 2n, name: 'Test farm' };
    const prisma = {
      request: {
        findFirst: jest.fn().mockResolvedValue(request),
        findUniqueOrThrow: jest.fn().mockResolvedValue(request),
      },
      farm: { findFirst: jest.fn().mockResolvedValue(farm) },
      requestReview: { findMany: jest.fn().mockResolvedValue([]) },
      farmManagementDetail: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(detail)),
        update: jest.fn().mockImplementation(({ data }) => {
          detail = { ...detail, ...data };
          return Promise.resolve(detail);
        }),
      },
    };
    const access = { activeRoles: jest.fn().mockResolvedValue(['owner']) };
    const service = new FarmManagementRequestsService(
      prisma as unknown as PrismaService,
      access as unknown as FarmAccessService,
    );
    await service.update(1n, 3n, { ...input, localizedContent: { en: { currentSituation: 'Saved English' } } });
    const restored = await service.get(1n, 3n);
    expect(restored).toMatchObject({
      responsibilities: input.responsibilities,
      currentTeam: input.currentTeam,
      resourcesAndFacilities: input.resourcesAndFacilities,
      localizedContent: { ar: { currentSituation: 'محفوظ' }, en: { currentSituation: 'Saved English' } },
    });
    expect(prisma.farm).not.toHaveProperty('update');
    await service.update(1n, 3n, { responsibilities: [], currentTeam: [], resourcesAndFacilities: [] });
    expect(await service.get(1n, 3n)).toMatchObject({
      responsibilities: null,
      currentTeam: [],
      resourcesAndFacilities: [],
    });
  });
});
