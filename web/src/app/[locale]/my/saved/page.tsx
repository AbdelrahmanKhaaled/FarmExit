import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { apiFetchWebsite } from '@/lib/auth/session.server';
import { PortalHeading, PortalEmpty } from '@/features/my-farmexit/PortalUI';

import { SavedListings, type SavedListing } from '@/features/my-farmexit/SavedListings';

export default async function MySavedPage({ params }: PageProps<'/[locale]/my/saved'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace');
  const tv = await getTranslations('workspace.visual');
  const session = await requireCompletedProfile(locale, `/${locale}/my/saved`);
  const data = await apiFetchWebsite<{ items: SavedListing[] }>('/marketplace/saved', session.accessToken);

  return (
    <div className="flex flex-col gap-16">
      <PortalHeading title={t('saved.title')} description={tv('savedIntro')} />
      {data.items.length === 0 ? (
        <PortalEmpty
          icon="bookmark"
          title={tv('emptySaved')}
          body={t('saved.empty')}
          href="/farms"
          action={tv('browse')}
        />
      ) : (
        <SavedListings items={data.items} />
      )}
    </div>
  );
}
