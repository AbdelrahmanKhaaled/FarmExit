import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { AddFarmWizard } from '@/features/my-farms/AddFarmWizard';
import type { Farm, ListingDraft, FarmSpecification } from '@/features/my-farms/types';
export const instant = false;
export default async function ResumeListing({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ listingId?: string; step?: string }>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(
    locale,
    `/${locale}/my/farms/${id}/list${query.listingId ? `?listingId=${encodeURIComponent(query.listingId)}` : ''}`,
  );
  const farm = await apiFetchWebsite<Farm>(`/farms/${id}`, session.accessToken).catch(() => null);
  if (!farm || !farm.myRoles.includes('owner')) notFound();
  const listing = query.listingId
    ? await apiFetchWebsite<ListingDraft>(
        `/listing-requests/${encodeURIComponent(query.listingId)}`,
        session.accessToken,
      ).catch(() => null)
    : undefined;
  if (query.listingId && (!listing || listing.farmId !== farm.id)) notFound();
  const specification = await apiFetchWebsite<FarmSpecification>(
    `/farms/${id}/specifications`,
    session.accessToken,
  ).catch(() => null);
  return (
    <AddFarmWizard
      user={session.user}
      initialFarm={farm}
      initialListing={listing ?? undefined}
      initialSpecification={specification}
      initialStep={Number(query.step) || 1}
    />
  );
}
