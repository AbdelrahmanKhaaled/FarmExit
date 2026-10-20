import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { MyFarmsList } from '@/features/my-farms/MyFarmsList';
import { loadMyFarms, loadOwnerListings } from '@/features/my-farms/load-listings.server';
export default async function MyFarmsPage({ params }: PageProps<'/[locale]/my/farms'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const session = await requireCompletedProfile(locale, `/${locale}/my/farms`);
  const [data, listings] = await Promise.all([
    loadMyFarms(session.accessToken),
    loadOwnerListings(session.accessToken),
  ]);
  return <MyFarmsList farms={data} listings={listings} />;
}
