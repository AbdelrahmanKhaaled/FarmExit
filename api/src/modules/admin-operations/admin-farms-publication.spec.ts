import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminFarmsService } from './admin-farms.service';
import { AdminListFarmsQueryDto } from './dto/admin-farms.dto';

describe('farm publication filtering before pagination', () => {
  const prisma = {
    farm: { count: jest.fn().mockResolvedValue(31), findMany: jest.fn().mockResolvedValue([]) },
    request: { findMany: jest.fn().mockResolvedValue([]) },
  };
  let service: AdminFarmsService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [AdminFarmsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AdminFarmsService);
  });
  it.each(['sale', 'rent', 'none', 'saleAndRent'] as const)(
    'applies %s to both the full count and database page',
    async (listingPublication) => {
      const result = await service.list({
        listingPublication,
        page: 2,
        pageSize: 10,
        search: 'Nile',
        governorate: 'Giza',
        farmStatus: 'active',
      });
      const countWhere = (prisma.farm.count.mock.calls[0][0] as { where: object }).where;
      expect(prisma.farm.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: countWhere, skip: 10, take: 10 }),
      );
      expect(countWhere).toMatchObject({
        deletedAt: null,
        governorate: 'Giza',
        farmStatus: 'active',
        OR: expect.any(Array),
      });
      const publication = {
        requestType: 'farmListing',
        status: 'published',
        visibility: 'public',
        publishedAt: { not: null },
      };
      if (listingPublication === 'none') expect(countWhere).toMatchObject({ requests: { none: publication } });
      else if (listingPublication === 'saleAndRent')
        expect(countWhere).toMatchObject({
          AND: [
            { requests: { some: { ...publication, listingDetail: { is: { listingType: 'sale' } } } } },
            { requests: { some: { ...publication, listingDetail: { is: { listingType: 'rent' } } } } },
          ],
        });
      else
        expect(countWhere).toMatchObject({
          requests: { some: { ...publication, listingDetail: { is: { listingType: listingPublication } } } },
        });
      // The total must not be recomputed from the returned page (which can be empty).
      expect(result.total).toBe(31);
    },
  );
  it('does not constrain listing state for All Farms', async () => {
    await service.list({});
    expect(prisma.farm.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
  });
  it('rejects unsupported publication filter values', async () => {
    expect(await validate(plainToInstance(AdminListFarmsQueryDto, { listingPublication: 'active' }))).not.toHaveLength(
      0,
    );
  });
});
