import Image from 'next/image';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { ButtonLink } from '@/components/ui/Button';
import { fetchPublicOpportunity, OPPORTUNITY_PLACEHOLDER_IMAGE } from '@/lib/opportunities/public-opportunity';
import { getWebsiteSession } from '@/lib/auth/session.server';
import '@/features/opportunity-marketplace/opportunity-marketplace.css';

export const instant = false;

export default async function PartnershipOpportunityPage({
  params,
}: PageProps<'/[locale]/partnerships/opportunities/[id]'>) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('opportunityMarketplace');
  const item = await fetchPublicOpportunity('partnerships', id);
  if (!item) notFound();
  const session = await getWebsiteSession();
  const applyHref = session
    ? `/my/applications/new?parentId=${id}`
    : `/sign-in?returnTo=${encodeURIComponent(`/${locale}/partnerships/opportunities/${id}`)}`;

  return (
    <>
      <PublicNavbar />
      <main id="main">
        <Container size="app" className="py-32 tablet:py-48">
          <Link href="/partnerships" className="type-label-small-strong text-text-brand">{t('detail.back')}</Link>
          <div className="mt-24 grid gap-32 desktop:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <h1 className="type-heading-h2 text-text-primary">{item.farmName}</h1>
              <p className="mt-8 type-body-caption text-text-muted">
                {[item.governorate, item.areaName].filter(Boolean).join(' · ')} · {item.areaFeddan.toLocaleString(locale)} {t('feddans')}
              </p>
              <div className="relative mt-20 aspect-[16/10] overflow-hidden rounded-card">
                <Image src={OPPORTUNITY_PLACEHOLDER_IMAGE} alt={item.farmName} fill className="object-cover" sizes="80vw" />
                <span className="absolute bottom-12 inset-inline-start-12 rounded-md bg-bg-surface/90 px-8 py-4 text-[0.65rem] text-text-muted">
                  {t('illustrativeImage')}
                </span>
              </div>
              {item.description ? (
                <section className="mt-28">
                  <h2 className="type-label-large">{t('detail.sections.about')}</h2>
                  <p className="mt-10 whitespace-pre-wrap type-body-small text-text-secondary">{item.description}</p>
                </section>
              ) : null}
              {item.contributionDetails ? (
                <section className="mt-24">
                  <h2 className="type-label-large">{t('detail.sections.terms')}</h2>
                  <p className="mt-10 whitespace-pre-wrap type-body-small">{item.contributionDetails}</p>
                </section>
              ) : null}
              {item.operations || item.salesChannel ? (
                <section className="mt-24">
                  <h2 className="type-label-large">{t('detail.sections.expertise')}</h2>
                  {item.operations ? <p className="mt-10 whitespace-pre-wrap type-body-small">{item.operations}</p> : null}
                  {item.salesChannel ? <p className="mt-8 type-body-caption">{item.salesChannel}</p> : null}
                </section>
              ) : null}
              {item.acceptedPartnerTypes?.length ? (
                <section className="mt-24">
                  <h2 className="type-label-large">{t('detail.sections.requirements')}</h2>
                  <ul className="mt-10 list-inside list-disc type-body-small">
                    {item.acceptedPartnerTypes.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </section>
              ) : null}
              {item.extraInformation ? (
                <section className="mt-24">
                  <h2 className="type-label-large">{t('detail.sections.situation')}</h2>
                  <p className="mt-10 whitespace-pre-wrap type-body-small">{item.extraInformation}</p>
                </section>
              ) : null}
              <p className="mt-28 type-body-caption text-text-muted">{t('detail.nonBinding')}</p>
            </div>
            <aside className="rounded-card border border-border-hairline bg-bg-surface p-20">
              {item.objective?.[0] ? <div className="om-highlight-box">{item.objective[0]}</div> : null}
              <p className="mt-16 type-label-caption text-text-muted">{t('detail.sections.recipient')}</p>
              <p className="type-body-caption">FarmExit</p>
              <p className="mt-12 type-label-caption text-text-muted">{t('detail.sections.process')}</p>
              <p className="type-body-caption">{t('mediation.body')}</p>
              <ButtonLink href={applyHref} variant="primary" size="md" className="mt-20 w-full">
                {session ? t('detail.apply') : t('detail.applySignIn')}
              </ButtonLink>
            </aside>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
