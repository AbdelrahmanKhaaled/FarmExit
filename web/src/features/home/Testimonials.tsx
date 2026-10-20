'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Surface';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';
import { testimonials } from './data';

/*
 * Figma: Homepage › Section / Testimonials — Section Header + carousel controls (Icon Button Carousel: Outline previous,
 * Accent next) and three Testimonial Cards (Components → Group / Stats & Testimonials, State Default · Highlighted).
 * "The Highlighted card is the carousel focus (green), neighbours stay white": the arrows move the focus.
 * Desktop: 3-up. Tablet and mobile: a swipe row (about 1.1 cards visible on mobile) that follows the focus.
 * Card: padding 36, gap 28; Display/Quote Mark, tag pill, Body/Quote, hairline author row (48 avatar,
 * Label/Large name, Body/Caption place at 72%).
 */
export function Testimonials() {
  const t = useTranslations('home.testimonials');
  const ts = useTranslations('home');
  const [focus, setFocus] = useState(1);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);

  function move(step: number) {
    const next = (focus + step + testimonials.length) % testimonials.length;
    setFocus(next);
    // Below desktop the cards are a horizontal scroller: bring the focused card into view.
    const item = itemRefs.current[next];
    const row = item?.parentElement;
    if (item && row && row.scrollWidth > row.clientWidth) {
      row.scrollTo({ left: item.offsetLeft - (row.clientWidth - item.offsetWidth) / 2, behavior: 'smooth' });
    }
  }

  return (
    <section aria-labelledby="testimonials-title" className="pt-r-section-gap">
      <Container className="flex flex-col gap-48">
        <div className="flex flex-col gap-24 tablet:flex-row tablet:items-end tablet:justify-between tablet:gap-64">
          <SectionHeader eyebrow={t('eyebrow')} titleId="testimonials-title" title={t('title')} className="max-w-736" />
          <div className="flex shrink-0 gap-10">
            <IconButton variant="carousel-outline" icon="arrow-left" label={t('previous')} onClick={() => move(-1)} />
            <IconButton variant="carousel-accent" icon="arrow-right" label={t('next')} onClick={() => move(1)} />
          </div>
        </div>

        <p className="type-body-caption text-text-muted">{ts('sampleContentNote')}</p>
        <ul
          className={cn(
            // Swipe row below desktop: bleeds to the screen edge, snaps per card.
            '-mx-r-page-margin flex snap-x snap-mandatory gap-16 overflow-x-auto px-r-page-margin pb-8',
            'tablet:gap-24 desktop:mx-0 desktop:grid desktop:grid-cols-3 desktop:overflow-visible desktop:px-0 desktop:pb-0',
          )}
        >
          {testimonials.map(({ key, avatar }, index) => {
            const highlighted = index === focus;
            return (
              <li
                key={key}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                className="w-[86%] shrink-0 snap-center tablet:w-460 desktop:w-auto"
              >
                <Card
                  as="figure"
                  tone={highlighted ? 'dark' : 'light'}
                  padding="none"
                  className="flex h-full flex-col gap-28 p-36 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'type-display-quote-mark',
                        highlighted ? 'text-brand-accent-soft' : 'text-brand-accent',
                      )}
                    >
                      “
                    </span>
                    <span
                      className={cn(
                        'rounded-sm px-10 py-6 type-label-tag-strong',
                        highlighted ? 'bg-overlay-glass-strong text-text-on-dark' : 'bg-bg-subtle text-text-brand',
                      )}
                    >
                      {t(`items.${key}.tag`)}
                    </span>
                  </div>
                  <blockquote
                    className={cn('grow type-body-quote', highlighted ? 'text-text-on-dark' : 'text-text-primary')}
                  >
                    {t(`items.${key}.quote`)}
                  </blockquote>
                  <figcaption
                    className={cn(
                      'flex items-center gap-14 border-t pt-20',
                      highlighted ? 'border-overlay-on-dark-line' : 'border-border-subtle',
                    )}
                  >
                    <span className="relative size-48 shrink-0 overflow-hidden rounded-full bg-bg-image-placeholder">
                      <Image
                        src={avatar.src}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                        style={{ objectPosition: avatar.position }}
                      />
                    </span>
                    <span
                      className={cn('flex flex-col gap-2', highlighted ? 'text-text-on-dark' : 'text-text-primary')}
                    >
                      <span className="type-label-large">{t(`items.${key}.name`)}</span>
                      <span className="type-body-caption opacity-72">{t(`items.${key}.place`)}</span>
                    </span>
                  </figcaption>
                </Card>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
