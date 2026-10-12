import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { sampleFarmDetails } from '@/lib/data/sample/farm-details';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { FarmDetailsView } from '@/features/farm-details/FarmDetailsView';

/*
 * Farm Details — /[locale]/farms/[slug] (Figma: Farm Details page; Arabic: 08 · Arabic Web → AR / 01 Public /
 * Farm Details). Every published sample listing is prerendered; an unknown slug is a 404.
 */

/* Without it, the first request for an unlisted slug gets the App Shell (200) while notFound() renders in the background. */
export const ensureStatic = 'navigation';

export function generateStaticParams() {
  return sampleFarmDetails.slugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/[locale]/farms/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const details = sampleFarmDetails.bySlug(slug);
  if (!details) return {};
  const { listing } = details;
  const t = await getTranslations({ locale, namespace: 'farm' });
  const tm = await getTranslations({ locale, namespace: 'marketplace' });
  const name = listing.name[locale];
  return {
    title: t('details.metaTitle', { name }),
    description: details.description
      ? details.description[locale]
      : t('details.metaDescription', {
          name,
          area: t('card.areaValue', { count: listing.areaFeddan }),
          location: t('card.location', {
            area: listing.area.label[locale],
            governorate: tm(`governorates.${listing.governorate}`),
          }),
        }),
  };
}

export default async function FarmDetailsPage({ params }: PageProps<'/[locale]/farms/[slug]'>) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const details = sampleFarmDetails.bySlug(slug);
  if (!details) notFound();
  const similar = details.similar.slugs.flatMap((s) => sampleFarmDetails.bySlug(s)?.listing ?? []);

  return (
    <>
      <Navbar />
      <FarmDetailsView details={details} similar={similar} />
      <Footer />
      {/* Room for the fixed Sticky Action Bar below the footer (mobile and tablet). */}
      <div aria-hidden="true" className="h-89 desktop:hidden" />
    </>
  );
}
