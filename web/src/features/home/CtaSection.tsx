import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { AudienceBadge } from '@/components/ui/Badge';
import { BlockButtonLink, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';
import { Container } from '@/components/layout/Container';
import { homeImages, homeLinks } from './data';

/*
 * Figma: Homepage › Section / CTA — CTA Section (Components → Group / CTA & Footer): CTA / Feature (photographic,
 * buyers & renters, flex 7) beside CTA / Panel (owners, 500 wide). Section padding = section gap above and below.
 * Feature: r28, 460 tall, CTA shade, content bottom-aligned (padding 48; 28/24 on mobile), Audience Gold badge,
 * Heading/CTA Feature, Body/Large, Accent L button. Panel: white, hairline, Premium Rest, r28, padding 40 (28/24 on
 * mobile): Audience Soft badge, Heading/CTA Panel, Body/Default, Button / Block Primary + Outline L, managers link.
 * Stacked on tablet and mobile, Feature first.
 */
export function CtaSection() {
  const t = useTranslations('home.cta');

  return (
    <section aria-labelledby="cta-title" className="py-r-section-gap">
      <Container className="flex flex-col gap-16 tablet:gap-24 desktop:flex-row">
        <div className="relative isolate flex h-460 flex-col justify-end overflow-hidden rounded-feature bg-brand-primary desktop:flex-[676_1_0%]">
          <Image
            src={homeImages.ctaFeature.src}
            alt={t('feature.imageAlt')}
            fill
            sizes="(min-width: 1280px) 676px, 100vw"
            className="-z-20 object-cover"
            style={{ objectPosition: homeImages.ctaFeature.position }}
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 fx-shade-cta" />
          <div className="flex max-w-580 flex-col items-start px-24 py-28 tablet:p-48">
            <AudienceBadge tone="gold">{t('feature.badge')}</AudienceBadge>
            <h2 id="cta-title" className="mt-20 type-heading-cta-feature text-text-on-dark">
              {t('feature.title')}
            </h2>
            <p className="mt-14 type-body-large text-overlay-on-dark-body">{t('feature.body')}</p>
            <ButtonLink href={homeLinks.farms} variant="accent" size="lg" className="mt-28">
              {t('feature.button')}
            </ButtonLink>
          </div>
        </div>

        <Card
          radius="feature"
          padding="none"
          className="flex flex-col justify-between gap-28 px-24 py-28 tablet:p-40 desktop:w-500 desktop:shrink-0"
        >
          <div className="flex flex-col items-start">
            <AudienceBadge tone="soft">{t('panel.badge')}</AudienceBadge>
            <h2 className="mt-20 type-heading-cta-panel text-text-brand">{t('panel.title')}</h2>
            <p className="mt-14 type-body-default text-text-body">{t('panel.body')}</p>
          </div>
          <div className="flex flex-col gap-10">
            <BlockButtonLink href={homeLinks.listYourFarm} variant="primary">
              {t('panel.listFarm')}
            </BlockButtonLink>
            <BlockButtonLink href={homeLinks.managementRequest} variant="outline">
              {t('panel.requestManagement')}
            </BlockButtonLink>
            <Link
              href={homeLinks.management}
              className="self-center pt-6 text-center type-label-small-strong text-text-muted transition-colors duration-150 hover:text-text-brand"
            >
              {t('panel.managerLink')}
            </Link>
          </div>
        </Card>
      </Container>
    </section>
  );
}
