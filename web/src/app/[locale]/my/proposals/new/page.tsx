import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { requireCompletedProfile } from '@/lib/auth/require-session';
import { loadPublicListingBySlug } from '@/lib/data/load-farm-marketplace';
import { NewPurchaseProposalForm } from '@/features/my-proposals/NewPurchaseProposalForm';

export const instant = false;

export default async function NewProposalPage({ params, searchParams }: PageProps<'/[locale]/my/proposals/new'>) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('workspace.proposals');
  const slug = typeof sp.slug === 'string' ? sp.slug : '';
  await requireCompletedProfile(locale, `/${locale}/my/proposals/new${slug ? `?slug=${slug}` : ''}`);
  if (!slug) {
    return (
      <div className="flex flex-col gap-16">
        <p className="type-body-caption text-text-secondary">{t('missingSlug')}</p>
        <Link href="/farms" className="type-label-button text-text-brand">{t('browseMarketplace')}</Link>
      </div>
    );
  }
  const listing = await loadPublicListingBySlug(slug);
  if (!listing || listing.purpose !== 'sale') notFound();
  const farmName = listing.name[locale as 'en' | 'ar'];

  return (
    <div className="flex flex-col gap-16">
      <Link href={`/farms/${slug}`} className="type-label-button text-text-brand">{t('backToListing')}</Link>
      <h2 className="type-display-h4">{t('newTitle')}</h2>
      <NewPurchaseProposalForm slug={slug} farmName={farmName} />
    </div>
  );
}
