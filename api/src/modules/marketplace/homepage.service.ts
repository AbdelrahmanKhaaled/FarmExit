import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarketplaceService } from './marketplace.service';
import { buildMarketplaceWhere } from './marketplace-query';
import { buildPublicOpportunityWhere, publicOpportunityListSelect } from './public-opportunity-query';
import { toPublicOpportunityDto } from './public-opportunity-map';
@Injectable()
export class HomepageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listings: MarketplaceService,
  ) {}
  async get(locale: string) {
    const saleWhere = buildMarketplaceWhere({ listingType: 'sale' }),
      rentWhere = buildMarketplaceWhere({ listingType: 'rent' });
    const managementWhere = buildPublicOpportunityWhere('farmManagement', {}),
      partnershipWhere = buildPublicOpportunityWhere('partnership', {});
    const [sale, rent, management, partnerships, priceRows, editorial] = await Promise.all([
      this.listings.list({ listingType: 'sale', pageSize: 6 }),
      this.listings.list({ listingType: 'rent', pageSize: 6 }),
      this.prisma.request.findMany({
        where: managementWhere,
        select: publicOpportunityListSelect,
        orderBy: { publishedAt: 'desc' },
        take: 3,
      }),
      this.prisma.request.findMany({
        where: partnershipWhere,
        select: publicOpportunityListSelect,
        orderBy: { publishedAt: 'desc' },
        take: 3,
      }),
      this.prisma.request.findMany({
        where: { OR: [saleWhere, rentWhere] },
        select: {
          farm: { select: { id: true, governorate: true, areaFeddan: true } },
          listingDetail: { select: { listingType: true, askingPrice: true, annualRentPerFeddan: true } },
        },
      }),
      this.prisma.homepageContent.findUnique({
        where: { locale: locale === 'ar' ? 'ar' : 'en' },
        select: { published: true },
      }),
    ]);
    const valid = priceRows.filter((r) => {
      const d = r.listingDetail;
      const n = Number(d?.listingType === 'sale' ? d.askingPrice : d?.annualRentPerFeddan);
      return d && Number.isSafeInteger(n) && n > 0;
    });
    const groups = new Map<string, { governorate: string; sales: number[]; rents: number[]; listings: number }>();
    for (const r of valid) {
      if (!r.farm || !r.listingDetail) continue;
      const key = r.farm.governorate;
      const g = groups.get(key) ?? { governorate: key, sales: [], rents: [], listings: 0 };
      g.listings++;
      const d = r.listingDetail;
      if (d.listingType === 'sale' && Number(r.farm.areaFeddan) > 0)
        g.sales.push(Number(d.askingPrice) / Number(r.farm.areaFeddan));
      if (d.listingType === 'rent') g.rents.push(Number(d.annualRentPerFeddan));
      groups.set(key, g);
    }
    const [managementTotal, partnershipTotal] = await Promise.all([
      this.prisma.request.count({ where: managementWhere }),
      this.prisma.request.count({ where: partnershipWhere }),
    ]);
    const uniqueFarms = new Map(valid.flatMap((r) => (r.farm ? [[r.farm.id, r.farm] as const] : [])));
    return {
      sale,
      rent,
      management: management.map(toPublicOpportunityDto),
      partnerships: partnerships.map(toPublicOpportunityDto),
      metrics: {
        listings: sale.total + rent.total,
        farms: uniqueFarms.size,
        feddans: [...uniqueFarms.values()].reduce((sum, f) => sum + Number(f.areaFeddan), 0),
        opportunities: managementTotal + partnershipTotal,
        governorates: groups.size,
      },
      insights: [...groups.values()].map((g) => ({
        governorate: g.governorate,
        listings: g.listings,
        salePerFeddan: g.sales.length ? Math.round(g.sales.reduce((a, b) => a + b, 0) / g.sales.length) : null,
        rentPerFeddan: g.rents.length ? Math.round(g.rents.reduce((a, b) => a + b, 0) / g.rents.length) : null,
      })),
      editorial: editorial?.published ?? null,
    };
  }
}
