import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { loadOwnerListings } from '@/features/my-farms/load-listings.server';
import type { ListingRequestHistory } from '@/features/my-farms/ListingTracking';
import { FarmWorkspace } from '@/features/my-farms/FarmWorkspace';

export const instant = false;

type Farm = {
  id: string;
  name: string;
  governorate: string;
  areaName: string | null;
  areaFeddan: number;
  farmType: string;
  description: string | null;
  myRoles: string[];
};

export default async function MyFarmDetailPage({ params }: PageProps<'/[locale]/my/farms/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/farms/${id}`);
  let farm: Farm;
  try {
    farm = await apiFetchWebsite<Farm>(`/farms/${id}`, session.accessToken);
  } catch {
    notFound();
  }
  const listings = farm.myRoles.includes('owner') ? await loadOwnerListings(session.accessToken) : [];
  const farmListings = listings?.filter((item) => item.farmId === farm.id) ?? null;
  const latest = farmListings?.[0];
  const tracking =
    latest && latest.status !== 'draft'
      ? await apiFetchWebsite<ListingRequestHistory>(`/requests/${latest.id}`, session.accessToken).catch(() => null)
      : null;
  return <FarmWorkspace farm={farm} listings={farmListings} tracking={tracking} />;
}
