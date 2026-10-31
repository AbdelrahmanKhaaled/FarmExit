import { HomepageService } from './homepage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketplaceService } from './marketplace.service';
describe('Homepage real-data aggregation', () => {
  it('deduplicates farms/feddans while counting listings and labels asking-price averages', async () => {
    const same = { id: 1n, governorate: 'Giza', areaFeddan: 10 },
      other = { id: 2n, governorate: 'Giza', areaFeddan: 20 };
    const prisma = {
      request: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { farm: same, listingDetail: { listingType: 'sale', askingPrice: 10000 } },
            { farm: same, listingDetail: { listingType: 'rent', annualRentPerFeddan: 100 } },
            { farm: other, listingDetail: { listingType: 'sale', askingPrice: 40000 } },
          ]),
        count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(3),
      },
      homepageContent: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const listings = {
      list: jest.fn().mockResolvedValueOnce({ total: 2, items: [] }).mockResolvedValueOnce({ total: 1, items: [] }),
    };
    const service = new HomepageService(prisma as unknown as PrismaService, listings as unknown as MarketplaceService);
    const data = await service.get('en');
    expect(data.metrics).toEqual({ listings: 3, farms: 2, feddans: 30, opportunities: 7, governorates: 1 });
    expect(data.insights).toEqual([{ governorate: 'Giza', listings: 3, salePerFeddan: 1500, rentPerFeddan: 100 }]);
    expect(data.editorial).toBeNull();
    expect(JSON.stringify(prisma.request.findMany.mock.calls)).toContain('publishedAt');
  });
  it('propagates data-source failures instead of reporting a successful empty marketplace', async () => {
    const prisma = {
      request: { findMany: jest.fn().mockRejectedValue(new Error('database unavailable')) },
      homepageContent: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const listings = { list: jest.fn().mockResolvedValue({ total: 0, items: [] }) };
    const service = new HomepageService(prisma as unknown as PrismaService, listings as unknown as MarketplaceService);
    await expect(service.get('ar')).rejects.toThrow('database unavailable');
  });
});
