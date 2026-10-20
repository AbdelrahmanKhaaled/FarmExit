import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { FarmDetailsView } from '@/features/farm-details/FarmDetailsView';
import { sampleFarmDetails } from '@/lib/data/sample/farm-details';
import { sampleFarmMarketplace } from '@/lib/data/sample/farm-listings';
import { LISTING_PLACEHOLDER_SRC } from '@/lib/data/marketplace-api';

// This app is outside src/app and never participates in the production build.
// Existing design samples only: no live adapter, API, session, seed or database imports.
export default async function Fixture({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'ar') notFound();
  setRequestLocale(locale);
  const details = sampleFarmDetails.bySlug('wadi-el-natrun')!;
  const empty = (await searchParams).variant === 'empty';
  const fixture = empty
    ? {
        ...details,
        photos: [{ src: LISTING_PLACEHOLDER_SRC, alt: details.listing.name, isIllustrative: true }],
        description: null,
        highlights: [],
        soilType: null,
        infrastructure: [],
        facilities: [],
        documents: [],
        location: { roadLabel: null, nearby: [], access: [] },
        similar: { slugs: [], subtitle: null },
      }
    : details;
  const similar = sampleFarmMarketplace.all().filter((farm) => details.similar.slugs.includes(farm.slug));
  return (
    <>
      <Navbar />
      <FarmDetailsView
        details={fixture}
        similar={empty ? [] : similar}
        requestHref="/sign-in?returnTo=visual-test"
        offerHref="/sign-in?returnTo=visual-offer"
      />
      <Footer />
    </>
  );
}
