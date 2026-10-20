import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { RequestType, RequestVisibility } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_PAGE_SIZE } from '../farms/dto/list-farms-query.dto';
import { LISTING_PUBLISHED } from '../listing-requests/listing-requests.service';
import type { MarketplaceQueryDto } from './dto/marketplace-query.dto';
import type { PublicListingDto, PublicListingListDto } from './dto/public-listing.dto';
import {
  assertMarketplaceRanges,
  buildMarketplaceWhere,
  compareListedPrice,
  marketplaceOrder,
  publicListingSelect,
  toPublicListing,
  type PublicListingSource,
} from './marketplace-query';
import { loadPublishedFarmExitScores } from './public-farm-score';

const notFound = (): NotFoundException => new NotFoundException('Listing not found');

/**
 * Public read of listings an admin has published. No authentication, images, contacts, or coordinates.
 * FarmExit Score is included only from evaluations in published status.
 * Buyer and seller contact stays with FarmExit.
 */
@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MarketplaceQueryDto): Promise<PublicListingListDto> {
    assertMarketplaceRanges(query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const where = await this.whereWithWholePrices(buildMarketplaceWhere(query));
    const total = await this.prisma.request.count({ where });
    const skip = (page - 1) * pageSize;
    const orderBy = marketplaceOrder(query.sort ?? 'newest', query.listingType);
    const rows = orderBy
      ? await this.prisma.request.findMany({ where, orderBy, skip, take: pageSize, select: publicListingSelect })
      : await this.pageByListedPrice(where, query.sort === 'priceDesc' ? 'desc' : 'asc', skip, pageSize);
    return {
      items: await this.publicItems(rows),
      page,
      pageSize,
      total,
    };
  }

  async getBySlug(slug: string): Promise<PublicListingDto> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 220) {
      throw new BadRequestException('Invalid slug');
    }
    const detail = await this.prisma.farmListingDetail.findUnique({
      where: { slug },
      select: { requestId: true },
    });
    if (!detail) throw notFound();
    const request = await this.prisma.request.findFirst({
      where: {
        id: detail.requestId,
        requestType: RequestType.farmListing,
        status: LISTING_PUBLISHED,
        visibility: RequestVisibility.public,
        farm: { is: { deletedAt: null } },
      },
      select: publicListingSelect,
    });
    const items = request ? await this.publicItems([request]) : [];
    const item = items[0];
    if (!item) throw notFound();
    return item;
  }

  private async publicItems(rows: PublicListingSource[]) {
    const farmIds = rows.flatMap((row) => (row.farm ? [row.farm.id] : []));
    const scores = await loadPublishedFarmExitScores(this.prisma, farmIds);
    return rows.flatMap((row) => {
      const farmId = row.farm?.id.toString();
      const score = farmId ? (scores.get(farmId) ?? null) : null;
      const item = toPublicListing(row, score);
      return item ? [item] : [];
    });
  }

  /** A stored fractional pound is not a public price. Those listings stay out of the count and the page. */
  private async whereWithWholePrices(where: Prisma.RequestWhereInput): Promise<Prisma.RequestWhereInput> {
    const bad = await this.prisma.$queryRaw<Array<{ id: bigint | number }>>`
      /* whole-pound-listing-ids */
      SELECT r.id AS id
      FROM requests r
      INNER JOIN farm_listing_details d ON d.request_id = r.id
      WHERE r.request_type = 'farm_listing'
        AND r.status = 'published'
        AND (
          (d.listing_type = 'sale' AND (d.asking_price IS NULL OR d.asking_price <> FLOOR(d.asking_price) OR d.asking_price < 1))
          OR (d.listing_type = 'rent' AND (d.annual_rent_per_feddan IS NULL OR d.annual_rent_per_feddan <> FLOOR(d.annual_rent_per_feddan) OR d.annual_rent_per_feddan < 1))
        )
    `;
    if (bad.length === 0) return where;
    return { AND: [where, { id: { notIn: bad.map((row) => (typeof row.id === 'bigint' ? row.id : BigInt(row.id))) } }] };
  }

  /**
   * Sale and rent prices live on different columns. The filtered ids and those two prices are ordered here,
   * then only the page is loaded. A listing type narrows this to one column and uses database ordering instead.
   */
  private async pageByListedPrice(
    where: Prisma.RequestWhereInput,
    direction: 'asc' | 'desc',
    skip: number,
    take: number,
  ): Promise<PublicListingSource[]> {
    const keys = await this.prisma.request.findMany({
      where,
      select: {
        id: true,
        listingDetail: { select: { listingType: true, askingPrice: true, annualRentPerFeddan: true } },
      },
    });
    keys.sort((left, right) => {
      const byPrice = compareListedPrice(left.listingDetail, right.listingDetail, direction);
      if (byPrice !== 0) return byPrice;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
    const ids = keys.slice(skip, skip + take).map((row) => row.id);
    if (ids.length === 0) return [];
    const rows = await this.prisma.request.findMany({
      where: { id: { in: ids } },
      select: publicListingSelect,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
  }
}
