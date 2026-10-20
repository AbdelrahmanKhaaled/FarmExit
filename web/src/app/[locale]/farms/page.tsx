import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { MarketplaceResults, MarketplaceResultsStatic } from '@/features/marketplace/MarketplaceResults';
import { MarketplaceSearch, MarketplaceSearchStatic } from '@/features/marketplace/MarketplaceSearch';

export const instant = false;

/*
 * Farm Marketplace — Explore Farms (Figma: Marketplace page, Desktop 1440 · Tablet 1024 · Mobile 390;
 * Arabic: 08 · Arabic Web → AR / 01 Public / Marketplace). Green Depth header with breadcrumb, H1 Section, Body/Lead
 * and the Search Bar; then the filters + results body on the app grid (64 · 40 · 16 margins).
 * Filters live in the URL; the prerendered page shows the default (Buy, newest) results.
 */
export async function generateMetadata({ params }: PageProps<'/[locale]/farms'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'marketplace' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function FarmsPage({ params }: PageProps<'/[locale]/farms'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('marketplace');
  return (
    <>
      <Navbar />
      <main id="main" data-testid="marketplace">
        <section aria-labelledby="marketplace-title" className="fx-band-depth">
          <Container
            size="app"
            className="flex flex-col gap-24 pt-32 pb-32 tablet:gap-32 tablet:pt-48 tablet:pb-48 desktop:gap-40 desktop:pt-56 desktop:pb-64"
          >
            <div className="flex flex-col gap-12 tablet:gap-16">
              <nav aria-label={t('breadcrumb.label')}>
                <ol className="flex flex-wrap items-center gap-8 type-label-meta text-overlay-on-dark-muted">
                  <li>
                    <Link href="/" className="transition-colors duration-150 hover:text-text-on-dark">
                      {t('breadcrumb.home')}
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page">{t('breadcrumb.farms')}</li>
                </ol>
              </nav>
              <h1 id="marketplace-title" className="type-heading-h1-section text-text-on-dark">
                {t('title')}
              </h1>
              <p className="type-body-lead text-overlay-on-dark-body">{t('description')}</p>
            </div>
            <Suspense fallback={<MarketplaceSearchStatic />}>
              <MarketplaceSearch />
            </Suspense>
          </Container>
        </section>

        <Container size="app" className="pt-24 pb-72 tablet:pt-40 tablet:pb-96 desktop:pt-48 desktop:pb-120">
          <Suspense fallback={<MarketplaceResultsStatic />}>
            <MarketplaceResults />
          </Suspense>
        </Container>
      </main>
      <Footer />
    </>
  );
}
