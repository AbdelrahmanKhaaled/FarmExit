import { parseEntryMode } from '@/features/my-farms/entry-mode';
import { loadMyFarms, loadOwnerListings } from '@/features/my-farms/load-listings.server';
import { editableListing } from '@/features/my-farms/types';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { AddFarmForm } from '@/features/my-farms/AddFarmForm';

export const instant = false;

export default function NewFarmPage(props: PageProps<'/[locale]/my/farms/new'>) {
  return (
    <Suspense fallback={null}>
      <NewFarmContent {...props} />
    </Suspense>
  );
}

async function NewFarmContent({ params, searchParams }: PageProps<'/[locale]/my/farms/new'>) {
  await connection();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const query = await searchParams;
  const entryMode = parseEntryMode(query.entryMode);
  const suffix = new URLSearchParams();
  if (entryMode) suffix.set('entryMode', entryMode);
  if (query.createFarm === '1') suffix.set('createFarm', '1');
  const session = await requireCompletedProfile(locale, `/${locale}/my/farms/new?${suffix}`);
  if (entryMode && query.createFarm !== '1') {
    const [farms, listings] = await Promise.all([
      loadMyFarms(session.accessToken),
      loadOwnerListings(session.accessToken),
    ]);
    const t = await getTranslations('home.hero.search');
    return (
      <div className="flex flex-col gap-16 p-24">
        <h1>{t('chooseFarm')}</h1>
        <p>{t(`entry.${entryMode}`)}</p>
        <Link href={`/my/farms/new?entryMode=${entryMode}&createFarm=1`}>{t('createFarm')}</Link>
        {listings === null ? (
          <p role="alert">{t('draftsUnavailable')}</p>
        ) : (
          farms
            .filter((farm) => farm.myRoles.includes('owner'))
            .map((farm) => {
              const draft = listings.find((listing) => listing.farmId === farm.id && editableListing(listing.status));
              return (
                <Link
                  key={farm.id}
                  href={`/my/farms/${farm.id}/list?entryMode=${entryMode}${draft ? '&listingId=' + encodeURIComponent(draft.id) : ''}`}
                >
                  {farm.name}
                </Link>
              );
            })
        )}
      </div>
    );
  }
  return <AddFarmForm user={session.user} entryMode={entryMode} />;
}
