import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { accountLinks } from '@/components/layout/site-links';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { ButtonLink } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';

export async function generateMetadata({ params }: PageProps<'/[locale]/partnerships'>): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'partnership' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function PartnershipMarketplacePage({ params }: PageProps<'/[locale]/partnerships'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('partnership');

  return (
    <>
      <Navbar />
      <main id="main" data-testid="partnership-marketplace">
        <section aria-labelledby="partnership-marketplace-title" className="fx-band-depth">
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
                  <li aria-current="page">{t('breadcrumb.partnerships')}</li>
                </ol>
              </nav>
              <h1 id="partnership-marketplace-title" className="type-heading-h1-section text-text-on-dark">
                {t('title')}
              </h1>
              <p className="type-body-lead text-overlay-on-dark-body">{t('description')}</p>
            </div>
          </Container>
        </section>

        <Container size="app" className="flex flex-col gap-24 pt-24 pb-72 tablet:gap-32 tablet:pt-40 tablet:pb-96">
          <Surface className="flex flex-col gap-16 p-28">
            <p className="type-heading-h4 text-text-primary">{t('notLiveTitle')}</p>
            <p className="type-body-default text-text-secondary">{t('notLiveBody')}</p>
            <p className="type-body-caption text-text-muted">{t('nonBindingNote')}</p>
            <ButtonLink href={accountLinks.signIn} variant="primary" size="md" className="self-start">
              {t('ctaOwner')}
            </ButtonLink>
          </Surface>
        </Container>
      </main>
      <Footer />
    </>
  );
}
