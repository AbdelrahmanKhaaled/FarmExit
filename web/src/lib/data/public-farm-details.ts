import { contentText } from '@/lib/content/localized';
import { LISTING_PLACEHOLDER_SRC } from './marketplace-api';
import type { FarmDetails } from './farm-details';
import type { MarketplaceListing } from './marketplace';

/** Public listing API → approved Farm Details layout (no invented sections). */
export function farmDetailsFromPublicListing(listing: MarketplaceListing): FarmDetails {
  const listed = listing.publishedRank ? new Date(listing.publishedRank) : null;
  const highlights = (listing.highlights ?? []).map((h) => ({ en: h, ar: h }));
  const description = listing.listingDescription?.trim()
    ? {
        en: contentText(listing.listingLocalizedContent, 'en', 'listingDescription', listing.listingDescription),
        ar: contentText(listing.listingLocalizedContent, 'ar', 'listingDescription', listing.listingDescription),
      }
    : null;

  return {
    listing,
    reference:
      listing.listingId && listed
        ? {
            listingId: listing.listingId,
            listedMonth: listed.getUTCMonth() + 1,
            listedYear: listed.getUTCFullYear(),
          }
        : null,
    photos: [
      {
        src: LISTING_PLACEHOLDER_SRC,
        alt: listing.image.alt,
        isIllustrative: true,
      },
    ],
    description,
    highlights,
    soilType: null,
    infrastructure: [],
    facilities: [],
    location: {
      roadLabel: null,
      nearby: [],
      access: [],
    },
    documents: [],
    similar: { slugs: [], subtitle: null },
  };
}
