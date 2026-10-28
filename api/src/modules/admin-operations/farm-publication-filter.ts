import type { Prisma } from '../../generated/prisma/client';
import type { ListingPublicationFilter } from './dto/admin-farms.dto';

/** Same publication state as the registry's listing links; never infer it from farmStatus. */
export function publishedFarmListingWhere(listingType?: 'sale' | 'rent'): Prisma.RequestWhereInput {
  return {
    requestType: 'farmListing',
    status: 'published',
    visibility: 'public',
    publishedAt: { not: null },
    listingDetail: { is: { listingType: listingType ?? { in: ['sale', 'rent'] } } },
  };
}

export function farmPublicationWhere(filter?: ListingPublicationFilter): Prisma.FarmWhereInput {
  if (filter === 'none') return { requests: { none: publishedFarmListingWhere() } };
  if (filter === 'saleAndRent')
    return {
      AND: [
        { requests: { some: publishedFarmListingWhere('sale') } },
        { requests: { some: publishedFarmListingWhere('rent') } },
      ],
    };
  if (filter === 'sale' || filter === 'rent') return { requests: { some: publishedFarmListingWhere(filter) } };
  return {};
}
