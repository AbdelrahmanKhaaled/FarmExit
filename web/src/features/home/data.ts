/*
 * Homepage sample content structure (Figma: Website Screens → Homepage / Desktop 1440 / EN, page 08 for Arabic).
 * Only structure lives here: message keys, image files and crop positions. All copy is in messages/<locale>/home.json.
 * Every figure is sample data from the approved design (Source of Truth 4p) and must come from the CMS in production.
 *
 * Images are the approved Figma image fills, unchanged. `position` reproduces each Figma CROP fill with
 * `object-fit: cover` (FILL fills are centred).
 */

export type ImageRef = { src: string; width: number; height: number; position?: string };

const img = (name: string, width: number, height: number, position?: string): ImageRef => ({
  src: `/images/home/${name}.jpg`,
  width,
  height,
  position,
});

export const homeImages = {
  hero: img('hero', 2000, 1116),
  about: img('about-farmer', 1672, 941, '50% 37%'),
  journeyFind: img('journey-find', 2400, 1602),
  journeyManage: img('journey-manage', 2000, 2000),
  journeyOffer: img('journey-managers', 2000, 1125),
  managementRoles: img('management-roles', 2000, 1131),
  ctaFeature: img('cta-feature', 2000, 1335, '53% 50%'),
} as const;

export type ListingType = 'sale' | 'rent';

export type FarmKey = 'wadiElNatrun' | 'nubaria' | 'abuSuwayr' | 'sadatCity' | 'mallawi' | 'tamiya';

export type FeaturedFarm = {
  key: FarmKey;
  listing: ListingType;
  image: ImageRef;
  /** "Illustrative image" label: only where the photo doesn't show the actual farm (Source of Truth 4p). */
  illustrative?: boolean;
  /** FarmExit Score (FarmExit's own evaluation; Source of Truth, Homepage farms). */
  score: number;
  /** Sort value in EGP: total price for sale listings, annual rent per feddan for rentals. */
  priceValue: number;
};

// Listing order = "Newest listings" (the default sort in the design).
export const featuredFarms: FeaturedFarm[] = [
  {
    key: 'wadiElNatrun',
    listing: 'sale',
    image: img('farm-wadi-el-natrun', 2000, 1335),
    score: 4.8,
    priceValue: 54_000_000,
  },
  { key: 'nubaria', listing: 'sale', image: img('farm-nubaria', 2000, 1116), score: 4.8, priceValue: 81_000_000 },
  {
    key: 'abuSuwayr',
    listing: 'sale',
    image: img('farm-abu-suwayr', 1800, 2717, '50% 70%'),
    score: 4.7,
    priceValue: 28_000_000,
  },
  {
    key: 'sadatCity',
    listing: 'rent',
    image: img('farm-sadat-city', 2000, 1131),
    illustrative: true,
    score: 4.6,
    priceValue: 21_000,
  },
  { key: 'mallawi', listing: 'rent', image: img('farm-mallawi', 1500, 1499), score: 4.5, priceValue: 14_500 },
  { key: 'tamiya', listing: 'rent', image: img('farm-tamiya', 2400, 1345), score: 4.4, priceValue: 18_000 },
];

export type RequestKey = 'olive' | 'citrus' | 'wheat';

export const managementRequests: { key: RequestKey; services: Array<'one' | 'two' | 'three' | 'four'> }[] = [
  { key: 'olive', services: ['one', 'two', 'three', 'four'] },
  { key: 'citrus', services: ['one', 'two', 'three'] },
  { key: 'wheat', services: ['one', 'two', 'three'] },
];

export const insightRows = ['beheira', 'ismailia', 'minya', 'fayoum', 'menoufia'] as const;

export type TestimonialKey = 'ahmed' | 'hany' | 'karim';

export const testimonials: { key: TestimonialKey; avatar: ImageRef }[] = [
  { key: 'ahmed', avatar: img('avatar-ahmed', 1800, 1198, '25% 50%') },
  { key: 'hany', avatar: img('avatar-hany', 2000, 2000) },
  { key: 'karim', avatar: img('journey-managers', 2000, 1125) },
];

export const searchOptions = {
  governorates: ['beheira', 'ismailia', 'menoufia', 'minya', 'fayoum'],
  activities: ['vegetables', 'fieldCrops'],
} as const;

/*
 * Destinations for homepage actions. Locale-free (next-intl adds /en or /ar); the pages arrive from Phase 3 on.
 * Shared navigation destinations stay in components/layout/site-links.ts.
 */
const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

export const homeLinks = {
  farms: '/farms',
  farmDetails: (key: FarmKey) => `/farms/${kebab(key)}`,
  listYourFarm: '/list-your-farm',
  management: '/management',
  managementRequest: '/management/request',
  managementApply: (key: RequestKey) => `/management/${kebab(key)}`,
} as const;
