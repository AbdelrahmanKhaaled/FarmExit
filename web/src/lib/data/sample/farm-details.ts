/**
 * SAMPLE ADAPTER — Farm Details sample content.
 *
 * Wadi El Natrun Vegetable Estate is the farm designed in Figma (Farm Details / Desktop 1440 · Tablet 1024 ·
 * Mobile 390; Arabic: 08 · Arabic Web → AR / 01 Public / Farm Details), copied verbatim. The other listings have
 * only their marketplace data, so their detail sections collapse (CMS Data Map: "Sections collapse cleanly when
 * data is missing"). Business/content validation required: detail content for every other listing.
 *
 * Photos: the approved Figma gallery, except where a photo is already another farm's card photo and the curated
 * Image Library has an unused alternative (nursery → "hands-seedlings-sunset", packing & storage →
 * "greenhouse-researcher"). The "Fields" thumbnail has no unused alternative and stays as designed.
 */
import type { FarmDetails, FarmDetailsSource, FarmPhoto } from '../farm-details';
import type { MarketplaceListing } from '../marketplace';
import { sampleFarmMarketplace } from './farm-listings';

const photo = (file: string, en: string, ar: string): FarmPhoto => ({
  src: `/images/farms/wadi-el-natrun/${file}.jpg`,
  alt: { en, ar },
  isIllustrative: false,
});

const wadi = {
  drip: photo(
    'drip-irrigation',
    'Drip lines between palm-lined vegetable rows',
    'خطوط تنقيط بين صفوف خضار والنخل حواليها',
  ),
  fields: photo('fields', 'Open green fields under a blue sky', 'حقول خضرا مفتوحة تحت سما زرقا'),
  machinery: photo('machinery', 'Tractor working the rows, seen from above', 'جرار شغال في الصفوف من فوق'),
  nursery: photo('nursery', 'Hands planting seedlings at sunset', 'إيدين بتزرع شتلات وقت الغروب'),
  packing: photo('packing-storage', 'Grower checking crops inside a greenhouse', 'مزارع بيراجع الزرع جوه صوبة'),
};

type DetailContent = Omit<FarmDetails, 'listing'>;

const details: Record<string, DetailContent> = {
  'wadi-el-natrun': {
    reference: { listingId: 'FX-0142', listedMonth: 9, listedYear: 2026 },
    photos: [wadi.drip, wadi.fields, wadi.machinery, wadi.nursery],
    description: {
      en: 'A mature, fully irrigated vegetable estate on reclaimed desert land west of the Nile Delta — palm-lined plots with a drip network and licensed wells, ready for production.',
      ar: 'مزرعة خضار قائمة ومتروية بالكامل على أرض صحراوية مستصلحة غرب الدلتا — أحواض محاطة بالنخيل وشبكة تنقيط وآبار مرخّصة، جاهزة للإنتاج.',
    },
    highlights: [
      { en: 'Registered title, no encumbrances', ar: 'ملكية مسجّلة وخالية من أي التزامات' },
      { en: 'Full drip irrigation network', ar: 'شبكة الري بالتنقيط كاملة' },
      { en: 'Paved road access', ar: 'طريق مرصوف للمزرعة' },
    ],
    soilType: { en: 'Sandy loam, low salinity', ar: 'طمي رملي، ملوحة قليلة' },
    infrastructure: [
      { en: 'Power', ar: 'كهربا' },
      { en: 'storage', ar: 'تخزين' },
      { en: 'housing', ar: 'سكن' },
    ],
    facilities: [
      {
        title: { en: 'Drip irrigation network', ar: 'شبكة الري بالتنقيط' },
        note: { en: 'Covers the cultivated area', ar: 'بتغطي المساحة المزروعة' },
        photo: wadi.drip,
      },
      {
        title: { en: 'Machinery & equipment', ar: 'المعدات والآلات' },
        note: { en: 'Included with the farm', ar: 'موجودة مع المزرعة' },
        photo: wadi.machinery,
      },
      {
        title: { en: 'Packing & storage', ar: 'تعبئة وتخزين' },
        note: { en: 'On-site building', ar: 'مبنى في الموقع' },
        photo: wadi.packing,
      },
      {
        title: { en: 'Seedling nursery', ar: 'مشتل شتلات' },
        note: { en: 'On-site nursery', ar: 'مشتل في الموقع' },
        photo: wadi.nursery,
      },
    ],
    location: {
      roadLabel: { en: 'Cairo–Alexandria Desert Rd', ar: 'طريق مصر–إسكندرية الصحراوي' },
      nearby: [
        { place: { en: 'Wadi El Natrun town', ar: 'مدينة وادي النطرون' }, distanceKm: 12, icon: 'building' },
        { place: { en: 'Sadat City', ar: 'مدينة السادات' }, distanceKm: 38, icon: 'building' },
        { place: { en: 'Cairo (6th of October)', ar: 'القاهرة (6 أكتوبر)' }, distanceKm: 95, icon: 'building' },
        { place: { en: 'Alexandria port', ar: 'ميناء إسكندرية' }, distanceKm: 95, icon: 'truck' },
      ],
      access: [
        {
          label: { en: 'Cairo–Alexandria Desert Road', ar: 'طريق مصر–إسكندرية الصحراوي' },
          value: { km: 4 },
          icon: 'route',
        },
        {
          label: { en: 'Paved access to the farm gate', ar: 'طريق مرصوف لحد بوابة المزرعة' },
          value: { text: { en: 'Yes', ar: 'أيوه' } },
          icon: 'route',
        },
        {
          label: { en: '3-phase power at the boundary', ar: 'كهربا 3 فاز على حدود الأرض' },
          value: { text: { en: 'On site', ar: 'على الطبيعة' } },
          icon: 'power',
        },
        {
          label: { en: 'Wholesale vegetable market', ar: 'سوق خضار جملة' },
          value: { km: 12 },
          icon: 'truck',
        },
      ],
    },
    documents: [
      { type: 'ownership', detail: { en: 'Title deed', ar: 'عقد الملكية' } },
      { type: 'land', detail: { en: 'Survey & boundaries', ar: 'الرفع المساحي والحدود' } },
    ],
    similar: {
      slugs: ['nubaria', 'abu-suwayr', 'quesna'],
      subtitle: {
        en: 'Other vegetable and field-crop farms in the Delta desert belt.',
        ar: 'مزارع خضار ومحاصيل حقلية تانية في حزام صحراء الدلتا.',
      },
    },
  },
};

const listingOnly = (listing: MarketplaceListing): DetailContent => ({
  reference: null,
  photos: [],
  description: null,
  highlights: [],
  soilType: null,
  infrastructure: [],
  facilities: [],
  location: { roadLabel: null, nearby: [], access: [] },
  documents: [],
  similar: { slugs: [], subtitle: null },
  ...details[listing.slug],
});

export const sampleFarmDetails: FarmDetailsSource = {
  bySlug(slug) {
    const listing = sampleFarmMarketplace.all().find((l) => l.slug === slug);
    if (!listing) return null;
    const content = listingOnly(listing);
    // The card photo is always the main photo; the listing's own gallery follows it.
    return { listing, ...content, photos: [listing.image, ...content.photos] };
  },
  slugs: () => sampleFarmMarketplace.all().map((l) => l.slug),
};
