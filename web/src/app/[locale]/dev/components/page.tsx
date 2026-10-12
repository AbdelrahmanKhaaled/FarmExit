import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { devPreviewEnabled } from '@/lib/dev-preview';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/icons/Icon';
import { iconPaths, type IconName } from '@/components/icons/icon-paths';
import { Avatar } from '@/components/ui/Avatar';
import {
  AudienceBadge,
  HeroPill,
  ListingTypeBadge,
  NoticeBadge,
  PhotoGlassBadge,
  RequestBadge,
  ReviewedBadge,
  ServiceTag,
  StatusBadge,
  type StatusTone,
} from '@/components/ui/Badge';
import { BlockButton, Button, ButtonLink, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';
import { CapabilityChip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Card, GlassPanel, Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { Section, SectionHeader } from '@/components/layout/Section';
import { ChipDemo, FavoriteDemo, FieldDemo, OverlayDemo } from './InteractiveDemos';
import { SAMPLES } from './samples';

/*
 * DEVELOPMENT-ONLY Component Preview. Not a product page (404 in production unless FX_DEV_PREVIEW=1).
 * Shows the Phase 1 shared components so they can be compared with the Figma Components page in English (LTR)
 * and Arabic (RTL) at 1440 / 1024 / 390. Section labels are component names, not application copy.
 */

export const metadata: Metadata = {
  title: 'Component Preview (dev only) · FarmExit',
  robots: { index: false, follow: false },
};

function Group({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="flex flex-col gap-24 border-t border-border-default pt-32">
      <h2 className="type-overline-section text-text-accent">{title}</h2>
      {children}
    </section>
  );
}

const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'accent', 'outline', 'ghost'];
const BUTTON_SIZES: ButtonSize[] = ['sm', 'md', 'lg'];
const STATUS_TONES: StatusTone[] = ['neutral', 'review', 'action', 'positive', 'negative'];
const PHOTO_STAGE =
  'linear-gradient(135deg, var(--color-brand-deep), var(--color-brand-primary) 55%, var(--color-brand-accent-soft))';

export default async function ComponentPreviewPage({ params }: PageProps<'/[locale]/dev/components'>) {
  if (!devPreviewEnabled) notFound();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const s = SAMPLES[locale];

  return (
    <>
      <Navbar />
      <main id="main" data-testid="component-preview" className="flex flex-col gap-48 py-64">
        <Container className="flex flex-col gap-48">
          <header>
            <p className="type-overline-card text-text-gold">Development only · not a product page</p>
            <h1 className="mt-8 type-heading-h1-section text-text-brand">Component Preview</h1>
          </header>

          <Group title="Logo">
            <div className="grid gap-16 tablet:grid-cols-2">
              <Surface tone="surface" radius="card" padding="xl" bordered className="flex flex-wrap items-end gap-32">
                <Logo variant="full" />
                <Logo variant="horizontal" />
                <Logo variant="icon" />
              </Surface>
              <Surface tone="deep" radius="card" padding="xl" className="flex flex-wrap items-end gap-32">
                <Logo variant="full" tone="dark" />
                <Logo variant="horizontal" tone="dark" />
                <Logo variant="icon" tone="dark" />
              </Surface>
            </div>
          </Group>

          <Group title="Typography">
            <div className="flex flex-col gap-16">
              <Text as="p" variant="display-hero" tone="brand">
                {s.heading}
              </Text>
              <Text variant="heading-h1-section" tone="brand">
                {s.heading}
              </Text>
              <Text variant="heading-h3" tone="primary">
                {s.cardTitle}
              </Text>
              <Text variant="body-lead" tone="body">
                {s.lead}
              </Text>
              <Text variant="body-default" tone="muted">
                {s.body}
              </Text>
              <Text variant="overline-section" tone="accent">
                {s.eyebrow}
              </Text>
            </div>
          </Group>

          <Group title="Buttons · Style × Size (Default / Disabled)">
            <div className="flex flex-col gap-16">
              {BUTTON_VARIANTS.map((variant) => (
                <div key={variant} className="flex flex-wrap items-center gap-16">
                  {BUTTON_SIZES.map((size) => (
                    <Button key={size} variant={variant} size={size} arrow>
                      {s.browse}
                    </Button>
                  ))}
                  <Button variant={variant} size="md" arrow disabled>
                    {s.browse}
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-16">
                <Button variant="accent" size="lg" icon="search">
                  {s.search}
                </Button>
                <ButtonLink href="/dev/tokens" variant="outline" size="sm">
                  {s.listFarm}
                </ButtonLink>
                <LanguageToggle />
              </div>
            </div>
          </Group>

          <Group title="Button / Block · Icon Button">
            <div className="grid max-w-360 gap-12">
              <BlockButton variant="primary">{s.listFarm}</BlockButton>
              <BlockButton variant="outline" size="md">
                {s.listFarm}
              </BlockButton>
            </div>
            <Surface tone="subtle" radius="card" padding="md" className="flex flex-wrap items-center gap-16">
              <IconButton variant="carousel-outline" icon="arrow-left" label={s.previous} />
              <IconButton variant="carousel-outline" icon="arrow-right" label={s.next} />
              <IconButton variant="carousel-accent" icon="arrow-right" label={s.next} />
              <IconButton variant="tile-accent" icon="arrow-right" label={s.next} />
              <IconButton variant="tile-inverse" icon="arrow-right" label={s.next} />
              <IconButton variant="menu" icon="menu" label={s.open} />
              <IconButton variant="round" icon="close" label={s.open} />
              <FavoriteDemo s={s} />
              <BlockButton variant="inverse" className="max-w-360">
                {s.listFarm}
              </BlockButton>
            </Surface>
          </Group>

          <Group title="Badges · Status · Chips">
            <div className="flex flex-wrap items-center gap-12">
              {STATUS_TONES.map((tone) => (
                <StatusBadge key={tone} tone={tone}>
                  {s.status[tone]}
                </StatusBadge>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-12">
              <RequestBadge>{s.request}</RequestBadge>
              <ReviewedBadge>{s.reviewed}</ReviewedBadge>
              <ServiceTag>{s.irrigation}</ServiceTag>
              <AudienceBadge tone="gold">{s.audienceGold}</AudienceBadge>
              <AudienceBadge tone="soft">{s.audienceSoft}</AudienceBadge>
              <CapabilityChip variant="active" icon="building">
                {s.capabilityOwner}
              </CapabilityChip>
              <CapabilityChip variant="add" icon="add">
                {s.capabilityAdd}
              </CapabilityChip>
              <Avatar initials="AH" />
              <Avatar initials="AH" size="md" />
            </div>
            <NoticeBadge className="max-w-560">{s.notice}</NoticeBadge>
            <div
              className="flex flex-wrap items-center gap-12 rounded-card p-24"
              style={{ backgroundImage: PHOTO_STAGE }}
            >
              <ListingTypeBadge>{s.forSale}</ListingTypeBadge>
              <HeroPill>{s.heroPill}</HeroPill>
              <PhotoGlassBadge icon="category">{s.request}</PhotoGlassBadge>
            </div>
            <ChipDemo s={s} />
          </Group>

          <Group title="Form fields · Text Input · Select Field · Text Area">
            <FieldDemo s={s} />
          </Group>

          <Group title="Cards · Surfaces · Glass">
            <div className="grid gap-24 tablet:grid-cols-3">
              <Card>
                <Text variant="heading-card-title" tone="primary">
                  {s.cardTitle}
                </Text>
                <Text variant="body-card" tone="muted" className="mt-8">
                  {s.cardBody}
                </Text>
              </Card>
              <Card interactive>
                <Text variant="heading-card-title" tone="primary">
                  {s.cardTitle}
                </Text>
                <Text variant="body-card" tone="muted" className="mt-8">
                  {s.cardBody}
                </Text>
              </Card>
              <Card tone="dark">
                <Text variant="heading-card-title">{s.cardTitle}</Text>
                <Text variant="body-card" tone="on-dark-muted" className="mt-8">
                  {s.cardBody}
                </Text>
              </Card>
            </div>
            <div className="grid gap-16 tablet:grid-cols-4">
              <Surface tone="subtle" radius="card" padding="md">
                <Text variant="label-small-strong">bg/subtle</Text>
              </Surface>
              <Surface tone="ivory" radius="card" padding="md">
                <Text variant="label-small-strong">bg/ivory</Text>
              </Surface>
              <Surface tone="notice" radius="card" padding="md">
                <Text variant="label-small-strong">bg/notice</Text>
              </Surface>
              <Surface tone="brand" radius="card" padding="md">
                <Text variant="label-small-strong">brand/primary</Text>
              </Surface>
            </div>
            <div className="grid gap-32 rounded-card p-32 tablet:grid-cols-2" style={{ backgroundImage: PHOTO_STAGE }}>
              {(['dark', 'light'] as const).map((tone) => (
                <GlassPanel key={tone} tone={tone} interactive className="flex flex-col gap-16">
                  <Text variant="overline-section" tone={tone === 'dark' ? 'accent-soft' : 'accent'}>
                    {s.glassEyebrow}
                  </Text>
                  <Text variant="heading-card-title">{s.glassTitle}</Text>
                </GlassPanel>
              ))}
            </div>
          </Group>

          <Group title="Overlays · Dialog · Sheet" id="overlays">
            <OverlayDemo s={s} />
          </Group>

          <Group title="Icons (Figma Icons & Logo set)">
            <ul className="grid grid-cols-4 gap-8 tablet:grid-cols-8 desktop:grid-cols-12">
              {(Object.keys(iconPaths) as IconName[]).map((name) => (
                <li
                  key={name}
                  className="flex flex-col items-center gap-6 rounded-lg border border-border-subtle bg-bg-surface p-10"
                >
                  <Icon name={name} className="text-text-primary" />
                  <span className="type-label-caption break-all text-center text-text-muted">{name}</span>
                </li>
              ))}
            </ul>
          </Group>

          <Group title="Navbar · signed in">
            <div className="overflow-hidden rounded-card border border-border-default">
              <Navbar user={{ firstName: 'Ahmed', initials: 'AH', hasUnread: true }} />
            </div>
          </Group>
        </Container>

        <Section tone="ivory" spacing="band">
          <SectionHeader eyebrow={s.eyebrow} title={s.heading} subtitle={s.subtitle} />
        </Section>
        <Section tone="deep" spacing="band">
          <SectionHeader tone="dark" eyebrow={s.eyebrow} title={s.heading} subtitle={s.subtitle} />
        </Section>
      </main>
      <Footer />
    </>
  );
}
