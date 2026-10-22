import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { farmDetailsFromPublicListing } from '@/lib/data/public-farm-details';
import { loadPublicListingBySlug } from '@/lib/data/load-farm-marketplace';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { toNavbarUser } from '@/lib/auth/navbar-user';
import { FarmDetailsView } from '@/features/farm-details/FarmDetailsView';
import { getWebsiteSession } from '@/lib/auth/session.server';
import { gatedPortalHref } from '@/lib/auth/portal-href';

export const instant = false;

export async function generateMetadata({ params }: PageProps<'/[locale]/farms/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const listing = await loadPublicListingBySlug(slug);
  if (!listing) return {};
  const t = await getTranslations({ locale, namespace: 'farm' });
  const name = listing.name[locale as 'en' | 'ar'];
  return {
    title: t('details.metaTitle', { name }),
    description: listing.listingDescription ?? t('details.metaDescription', {
      name,
      area: t('card.areaValue', { count: listing.areaFeddan }),
      location: listing.area.label[locale as 'en' | 'ar'],
    }),
  };
}

export default async function FarmDetailsPage({ params }: PageProps<'/[locale]/farms/[slug]'>) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const listing = await loadPublicListingBySlug(slug);
  if (!listing) notFound();
  const details = farmDetailsFromPublicListing(listing);
  const session = await getWebsiteSession();
  const inquiryPath = `/my/farm-details-requests/new?slug=${encodeURIComponent(slug)}`;
  const requestHref = gatedPortalHref(locale, session, inquiryPath);
  const offerHref = listing.purpose === 'sale'
    ? gatedPortalHref(locale, session, `/my/proposals/new?slug=${encodeURIComponent(slug)}`)
    : undefined;

  return (
    <>
      <Navbar user={session ? toNavbarUser(session.user) : undefined} sessionResolved={!session} />
      <FarmDetailsView
        details={details}
        similar={[]}
        listingSlug={slug}
        requestHref={requestHref}
        offerHref={offerHref}
      />
      <Footer />
    </>
  );
}
