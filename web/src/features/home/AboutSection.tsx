import type { HomeData } from './home-data';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { figureDir } from '@/lib/figures';
import { GlassPanel } from '@/components/ui/Surface';
import { Container } from '@/components/layout/Container';
import { homeImages } from './data';

/*
 * Figma: Homepage › Section / About FarmExit (ivory band, padding = section gap 144 · 112 · 80).
 * Statement: eyebrow + Display/Statement (760) beside a Body/Editorial lead (376), bottom-aligned; stacked below
 * desktop (lead 640 on tablet, Body/Default on mobile). Immersive photo 1200×620 r28 (944×520, 358×440 r24) with
 * the photo Fade and a Glass Info Card (Tone Dark) floating 40 / 32 from the bottom-end corner; on mobile the card
 * moves below the image. Three Story Pillars: 3-up, 2 + 1 on tablet, stacked on mobile.
 */
const PILLARS = ['one', 'two', 'three'] as const;
const STATS = ['farms', 'governorates', 'review'] as const;

export function AboutSection({ data }: { data: HomeData | null }) {
  const t = useTranslations('home.about');
  const locale = useLocale();

  return (
    <section aria-labelledby="about-title" className="bg-bg-ivory py-r-section-gap">
      <Container className="flex flex-col gap-40 tablet:gap-56 desktop:gap-72">
        <div className="flex flex-col gap-20 tablet:gap-24 desktop:flex-row desktop:items-end desktop:justify-between desktop:gap-64">
          <div className="flex flex-col gap-20 tablet:gap-24 desktop:max-w-760 desktop:rtl:max-w-783">
            <p className="type-overline-section text-text-accent">{t('eyebrow')}</p>
            <h2 id="about-title" className="type-display-statement text-text-brand">
              {data?.editorial?.aboutStatement || t('statement')}
            </h2>
          </div>
          <p className="type-body-default text-text-body tablet:max-w-640 tablet:type-body-editorial desktop:w-376 desktop:shrink-0">
            {data?.editorial?.aboutLead || t('lead')}
          </p>
        </div>

        <div className="flex flex-col gap-16 tablet:relative">
          <div className="relative h-440 overflow-hidden rounded-card tablet:h-520 tablet:rounded-feature desktop:h-620">
            <Image
              src={homeImages.about.src}
              alt={t('imageAlt')}
              fill
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="object-cover"
              style={{ objectPosition: homeImages.about.position }}
            />
            <div aria-hidden="true" className="absolute inset-0 fx-shade-photo" />
          </div>
          <GlassPanel
            tone="dark"
            className="flex flex-col gap-16 tablet:absolute tablet:end-32 tablet:bottom-32 tablet:w-440 desktop:end-40 desktop:bottom-40"
          >
            <p className="type-overline-section text-brand-accent-soft">{t('card.eyebrow')}</p>
            <p className="type-heading-card-title text-text-on-dark">{t('card.title')}</p>
            <div className="flex border-t border-overlay-on-dark-line pt-16">
              {STATS.map((key) => (
                <div key={key} className="flex flex-1 flex-col gap-4">
                  <p className="type-heading-h4 text-text-on-dark">
                    <bdi dir={figureDir(key === 'review' ? '✓' : String(data?.metrics[key] ?? ''))}>
                      {key === 'review'
                        ? '✓'
                        : data?.metrics[key] != null
                          ? new Intl.NumberFormat(locale).format(data!.metrics[key]!)
                          : '—'}
                    </bdi>
                  </p>
                  <p className="type-label-caption text-overlay-on-dark-muted">{t(`card.${key}.label`)}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        <div className="grid grid-cols-1 gap-32 tablet:grid-cols-2 tablet:gap-24 desktop:grid-cols-3 desktop:gap-48">
          {PILLARS.map((key) => (
            <article key={key} className="flex flex-col border-t border-border-strong pt-28">
              <p className="type-numeric-editorial-index text-text-accent">{t(`pillars.${key}.number`)}</p>
              <h3 className="mt-40 type-heading-h3 text-text-primary">{t(`pillars.${key}.title`)}</h3>
              <p className="mt-14 type-body-default text-text-body">{t(`pillars.${key}.body`)}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
