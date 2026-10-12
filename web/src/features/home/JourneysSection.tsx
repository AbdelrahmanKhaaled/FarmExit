import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';
import { iconButtonClasses } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Surface';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';
import { homeImages, homeLinks, type ImageRef } from './data';

/*
 * Figma: Homepage › Section / Journeys — "Start here" Section Header + three Journey Cards
 * (Components → Group / CTA & Footer → Journey Card, Tone Light · Dark). 3 columns · 24 gap, 2 on tablet,
 * 1 · 16 on mobile. Card: 10px-inset photo (228 tall, r18), Overline/Card audience, Heading/H3, Body/Card,
 * hairline footer with a Label/Medium CTA and an Arrow Tile (Accent on light, Inverse on dark).
 */
type Journey = { key: 'find' | 'manage' | 'offer'; tone: 'light' | 'dark'; image: ImageRef; href: string };

const JOURNEYS: Journey[] = [
  { key: 'find', tone: 'light', image: homeImages.journeyFind, href: homeLinks.farms },
  { key: 'manage', tone: 'dark', image: homeImages.journeyManage, href: homeLinks.managementRequest },
  { key: 'offer', tone: 'light', image: homeImages.journeyOffer, href: homeLinks.management },
];

export function JourneysSection() {
  const t = useTranslations('home.journeys');

  return (
    <section aria-labelledby="journeys-title" className="pt-r-section-gap">
      <Container className="flex flex-col gap-48">
        <SectionHeader eyebrow={t('eyebrow')} titleId="journeys-title" title={t('title')} subtitle={t('subtitle')} />
        <div className="grid grid-cols-1 gap-16 tablet:grid-cols-2 tablet:gap-24 desktop:grid-cols-3">
          {JOURNEYS.map(({ key, tone, image, href }) => {
            const dark = tone === 'dark';
            return (
              <Card key={key} as="article" tone={tone} interactive padding="none" className="flex flex-col">
                <div className="px-10 pt-10">
                  <div className="relative h-228 overflow-hidden rounded-image">
                    <Image
                      src={image.src}
                      alt={t(`${key}.imageAlt`)}
                      fill
                      sizes="(min-width: 1280px) 364px, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-12 px-28 pt-28 pb-30">
                  <p className={cn('type-overline-card', dark ? 'text-brand-accent-soft' : 'text-text-accent')}>
                    {t(`${key}.audience`)}
                  </p>
                  <h3 className={cn('type-heading-h3', dark ? 'text-text-on-dark' : 'text-text-primary')}>
                    {t(`${key}.title`)}
                  </h3>
                  <p className={cn('type-body-card', dark ? 'text-overlay-on-dark-body' : 'text-text-muted')}>
                    {t(`${key}.description`)}
                  </p>
                  <Link
                    href={href}
                    className={cn(
                      'mt-20 flex items-center justify-between gap-12 border-t pt-20 type-label-medium',
                      // The link covers the whole card, so the card is one target.
                      'after:absolute after:inset-0 after:rounded-card',
                      dark ? 'border-overlay-on-dark-line text-text-on-dark' : 'border-border-subtle text-text-primary',
                    )}
                  >
                    {t(`${key}.cta`)}
                    <span aria-hidden="true" className={iconButtonClasses(dark ? 'tile-inverse' : 'tile-accent')}>
                      <Icon name="arrow-right" size={16} />
                    </span>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
