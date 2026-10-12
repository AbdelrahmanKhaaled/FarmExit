'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { SegmentedControl, tabId, tabPanelId } from '@/components/ui/SegmentedControl';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';

/*
 * Figma: Homepage › Section / How It Works — Green Depth band (brand/deep → brand/primary), band padding 128 · 96 · 72,
 * gap 72. Section Header (Tone Dark) with the Segmented Control bottom-aligned on the end side (stacked below desktop).
 * Four Process Steps (Components → Group / Content Rows → Process Step): 60px number box (r18; Current = brand/accent,
 * Upcoming = overlay/glass-subtle), Numeric/Step, dashed overlay/connector line to the next step (desktop only, not
 * after the last), Card Title + Body/Small. 4-up on desktop, 2 × 2 on tablet, stacked on mobile.
 * Figma designs the Buyers & renters steps; the owner and manager steps condense Source of Truth §7 (to approve).
 */
type Journey = 'buyers' | 'owners' | 'managers';
const JOURNEYS: Journey[] = ['buyers', 'owners', 'managers'];
const STEPS = ['one', 'two', 'three', 'four'] as const;
const ID = 'how-it-works';

export function HowItWorks() {
  const t = useTranslations('home.howItWorks');
  const [journey, setJourney] = useState<Journey>('buyers');

  return (
    <section
      id={ID}
      aria-labelledby="how-it-works-title"
      className="scroll-mt-r-nav-height fx-band-depth py-r-band-padding"
    >
      <Container className="flex flex-col gap-48 tablet:gap-56 desktop:gap-72">
        <div className="flex flex-col gap-32 desktop:flex-row desktop:items-end desktop:justify-between desktop:gap-64">
          <SectionHeader
            tone="dark"
            eyebrow={t('eyebrow')}
            titleId="how-it-works-title"
            title={t('title')}
            className="desktop:max-w-736"
          />
          <SegmentedControl
            idBase={ID}
            label={t('tabsLabel')}
            value={journey}
            onChange={setJourney}
            options={JOURNEYS.map((j) => ({ value: j, label: t(`tabs.${j}`) }))}
            className="shrink-0"
          />
        </div>

        {JOURNEYS.map((j) => (
          <ol
            key={j}
            role="tabpanel"
            id={tabPanelId(ID, j)}
            aria-labelledby={tabId(ID, j)}
            hidden={j !== journey}
            className="grid grid-cols-1 gap-32 tablet:grid-cols-2 tablet:gap-x-24 tablet:gap-y-40 desktop:grid-cols-4 desktop:gap-24"
          >
            {STEPS.map((step, i) => (
              <li key={step} className="flex flex-col">
                <div className="flex items-center gap-16">
                  <span
                    className={cn(
                      'flex size-60 shrink-0 items-center justify-center rounded-image type-numeric-step text-text-on-dark',
                      i === 0 ? 'bg-brand-accent' : 'bg-overlay-glass-subtle',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="hidden grow border-t-[1.5px] border-dashed border-overlay-connector desktop:block"
                    />
                  )}
                </div>
                <h3 className="mt-28 type-heading-card-title text-text-on-dark">{t(`steps.${j}.${step}.title`)}</h3>
                <p className="mt-10 type-body-small text-overlay-on-dark-muted">
                  {t(`steps.${j}.${step}.description`)}
                </p>
              </li>
            ))}
          </ol>
        ))}
      </Container>
    </section>
  );
}
