import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { FarmDetailsRequestForm } from '@/features/my-farm-details/FarmDetailsRequestForm';
import { loadPublicListingBySlug } from '@/lib/data/load-farm-marketplace';

export default async function NewFarmDetailsRequestPage({
  params,
  searchParams,
}: PageProps<'/[locale]/my/farm-details-requests/new'> & {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { locale } = await params;
  const { slug } = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  if (!slug) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.farmDetails');
  await requireCompletedProfile(locale, `/${locale}/my/farm-details-requests/new?slug=${encodeURIComponent(slug)}`);
  const listing = await loadPublicListingBySlug(slug);
  const farmName = listing?.name[locale as 'en' | 'ar'];

  return (
    <div className="flex flex-col gap-16">
      <Link href={`/farms/${slug}`} className="type-label-button text-text-brand">{t('backToListing')}</Link>
      <h2 className="type-display-h4">{t('newTitle')}</h2>
      <FarmDetailsRequestForm slug={slug} farmName={farmName} />
    </div>
  );
}
