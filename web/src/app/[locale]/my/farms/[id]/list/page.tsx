import { Suspense } from 'react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { AddFarmWizard } from '@/features/my-farms/AddFarmWizard';
import type { Farm, ListingDraft, FarmSpecification, PrivateFarmLocation } from '@/features/my-farms/types';
export const instant = false;
export default function ResumeListingPage(props: Parameters<typeof ResumeListing>[0]) {
  return <Suspense fallback={null}><ResumeListing {...props} /></Suspense>;
}

async function ResumeListing({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ listingId?: string; step?: string }>;
}) {
  await connection();
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
  const location = await apiFetchWebsite<PrivateFarmLocation>(
    `/farms/${id}/private-location`,
    session.accessToken,
  ).catch(() => undefined);
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
      initialLocation={location}
      initialStep={Number(query.step) || 1}
    />
  );
}
