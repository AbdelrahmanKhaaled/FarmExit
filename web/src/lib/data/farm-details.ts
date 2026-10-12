/**
 * Farm Details read model (Figma: Farm Details → CMS Data Map). The page depends on these types and on
 * `FarmDetailsSource` only; `src/lib/data/sample/farm-details.ts` is the sample adapter until the API exists.
 *
 * Every farm-specific section is listing data. A field that the listing doesn't state is `null` / `[]`, and its
 * section collapses (CMS Data Map: "Sections collapse cleanly when data is missing"). Nothing is derived or invented.
 */
import type { Localized } from '@/lib/domain/types';
import type { MarketplaceListing } from './marketplace';

export type FarmPhoto = {
  src: string;
  alt: Localized;
  /** "Illustrative image" label: only where the listing marks the photo that way. */
  isIllustrative: boolean;
  /** CSS object-position reproducing the Figma crop (optional). */
  position?: string;
};

export type FacilityIcon = 'building' | 'truck' | 'route' | 'power';

export type FarmDetails = {
  /** The marketplace listing: name, location, purpose, price fields, attributes and FarmExit Score. */
  listing: MarketplaceListing;
  /** Listing reference and publication month ("Listed Sep 2026 · ID FX-0142"). Null = not stated. */
  reference: { listingId: string; listedMonth: number; listedYear: number } | null;
  /** First photo = main; next four = thumbnails; the rest open from "View all photos". At least one. */
  photos: FarmPhoto[];
  description: Localized | null;
  /** 0–3 listing highlights, as worded by the listing. */
  highlights: Localized[];
  soilType: Localized | null;
  /** Infrastructure items, joined with " · ". */
  infrastructure: Localized[];
  facilities: { title: Localized; note: Localized; photo: FarmPhoto }[];
  /** The map shows the listing's area and governorate only; the exact pin is never public. */
  location: {
    /** Optional road label on the stylised map. */
    roadLabel: Localized | null;
    nearby: { place: Localized; distanceKm: number; icon: FacilityIcon }[];
    access: { label: Localized; value: { km: number } | { text: Localized }; icon: FacilityIcon }[];
  };
  /** Only document types the listing includes. Copies are shared through FarmExit after approval. */
  documents: { type: 'ownership' | 'land'; detail: Localized }[];
  /** Similar farms (slugs) as curated for the listing, with its own supporting line. Section hidden when empty. */
  similar: { slugs: string[]; subtitle: Localized | null };
};

export interface FarmDetailsSource {
  bySlug(slug: string): FarmDetails | null;
  slugs(): string[];
}
