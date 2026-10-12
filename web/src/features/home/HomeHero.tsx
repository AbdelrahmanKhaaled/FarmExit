import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { figureDir } from '@/lib/figures';
import { Icon, type IconName } from '@/components/icons/Icon';
import { HeroPill } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { homeImages, homeLinks } from './data';
import { HeroSearch } from './HeroSearch';

/*
 * Figma: Homepage › Hero (Desktop 1440 / Tablet 1024 / Mobile 390).
 * Egyptian farmland photo on brand/deep with the Hero Shade. Copy column 1040 (desktop): Hero Pill, Display/Hero
 * headline on three deliberate lines (no forced breaks on mobile), Body/Lead subhead (640), the glass
 * "Own a farm?" strip, then the Search Bar and the Proof Panel.
 * Padding 112/48 · 96/40 · 56/24; copy gap 28 · 24 · 20; search gap 44 · 40 · 32; proof gap 40 · 32 · 24.
 */
export function HomeHero() {
  const t = useTranslations('home.hero');

  return (
    <section className="relative isolate overflow-hidden bg-brand-deep" aria-labelledby="hero-title">
      <Image src={homeImages.hero.src} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 fx-shade-hero" />

      <Container className="pt-56 pb-24 tablet:pt-96 tablet:pb-40 desktop:pt-112 desktop:pb-48">
        <div className="flex max-w-1040 flex-col items-start gap-20 tablet:gap-24 desktop:gap-28">
          <HeroPill>{t('pill')}</HeroPill>
          <h1 id="hero-title" className="type-display-hero text-text-on-dark tablet:whitespace-pre-line">
            {t('headline')}
          </h1>
          <p className="max-w-640 type-body-lead text-overlay-on-dark-body tablet:max-w-600 desktop:max-w-640">
            {t('subhead')}
          </p>

          <div
            className={cn(
              'flex flex-col items-start gap-12 rounded-3xl border border-overlay-gold-hairline bg-overlay-glass p-16 effect-hero-glass',
              'tablet:flex-row tablet:items-center tablet:gap-20 tablet:rounded-full tablet:py-8 tablet:ps-20 tablet:pe-8',
            )}
          >
            <Icon name="tree" size={20} className="text-brand-gold" />
            <div className="flex flex-col gap-2">
              <p className="type-label-large text-text-on-dark">{t('owner.title')}</p>
              <p className="type-body-small text-overlay-on-dark-body">{t('owner.caption')}</p>
            </div>
            <ButtonLink href={homeLinks.listYourFarm} variant="outline" size="md" arrow>
              {t('owner.cta')}
            </ButtonLink>
          </div>
        </div>

        <div className="mt-32 tablet:mt-40 desktop:mt-44">
          <HeroSearch />
        </div>

        <ProofPanel />
      </Container>
    </section>
  );
}

const PROOF: { key: 'farms' | 'feddans' | 'opportunities' | 'governorates'; icon: IconName }[] = [
  { key: 'farms', icon: 'verify' },
  { key: 'feddans', icon: 'area' },
  { key: 'opportunities', icon: 'trend-up' },
  { key: 'governorates', icon: 'location-pin' },
];

// Cell padding per Figma: the first stat has no start padding; the others sit after an on-dark hairline.
// Mobile is a 2 × 2 grid, so the hairline and padding restart on each row.
const CELL = [
  'pe-8 tablet:pe-24',
  'border-s border-overlay-on-dark-line ps-20 pe-8 tablet:ps-32 tablet:pe-24',
  'pe-8 tablet:border-s tablet:border-overlay-on-dark-line tablet:ps-32 tablet:pe-24',
  'border-s border-overlay-on-dark-line ps-20 pe-8 tablet:ps-32 tablet:pe-24',
];

/*
 * Figma: Components → Proof Panel (Layout = Row · Grid). Deep glass, Glass/Hero Panel, r24. Gold-hairline icon tiles,
 * Display/Proof figures, Label/Proof labels. Row 4-up on desktop and tablet, 2 × 2 grid on mobile. Sample figures.
 */
function ProofPanel() {
  const t = useTranslations('home.hero.proof');
  return (
    <div
      className={cn(
        'mt-24 flex flex-col gap-24 rounded-card border border-overlay-glass-border bg-overlay-deep-glass px-24 pt-24 pb-28',
        'effect-hero-panel tablet:mt-32 tablet:gap-28 tablet:px-40 tablet:pt-28 tablet:pb-36 desktop:mt-40',
      )}
    >
      <p className="flex items-center gap-10 border-b border-overlay-on-dark-line pb-24 type-overline-section text-brand-accent-soft">
        <Icon name="verify-filled" size={18} className="text-brand-gold" />
        <span className="min-w-0">{t('header')}</span>
      </p>
      <div className="grid grid-cols-2 gap-y-24 tablet:flex">
        {PROOF.map((item, i) => (
          <div key={item.key} className={cn('flex min-w-0 flex-1 flex-col', CELL[i])}>
            <span
              aria-hidden="true"
              className="flex size-40 items-center justify-center rounded-lg border border-overlay-gold-hairline bg-overlay-gold-glow text-brand-gold"
            >
              <Icon name={item.icon} size={20} />
            </span>
            <p className="mt-22 type-display-proof text-text-on-dark">
              <bdi dir={figureDir(t(`${item.key}.value`))}>{t(`${item.key}.value`)}</bdi>
            </p>
            <p className="mt-10 type-label-proof text-overlay-on-dark-muted">{t(`${item.key}.label`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
