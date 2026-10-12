import Image from 'next/image';
import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/icons/Icon';
import { ListingTypeBadge } from '@/components/ui/Badge';
import { BlockButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { SectionHeader } from '@/components/layout/Section';
import { accountLinks } from '@/components/layout/site-links';
import type { FarmDetails } from '@/lib/data/farm-details';
import type { MarketplaceListing } from '@/lib/data/marketplace';
import type { Localized } from '@/lib/domain/types';
import { shortEgp } from '@/lib/format';
import { FarmCard } from '@/features/farms/FarmCard';
import { BackToResults } from './BackToResults';
import { PriceActions, RequestPanel, StickyActionBar, type FarmPrice } from './FarmActions';
import { FarmGallery } from './FarmGallery';
import { MapPreview } from './MapPreview';
import { SavedFarmProvider } from './saved-farm';

/*
 * Figma: Farm Details / Wadi El Natrun Vegetable Estate (Desktop 1440 · Tablet 1024 · Mobile 390) and
 * AR / 01 Public / Farm Details. Order: breadcrumb row → hero gallery → details body (main column 792 + sticky
 * Request Panel 384 on desktop; inline Price & Actions card below) → Request Band → Similar farms.
 * Main column sections: Overview · Specifications · Facilities & equipment · Location & access · Documents
 * (96 · 80 · 64 apart). Every farm-specific section is listing data and collapses when the listing has none.
 */
type Locale = 'en' | 'ar';

function DetailsHeading({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-10">
      <p className="type-overline-section text-text-accent">{eyebrow}</p>
      <h2 id={id} className="type-heading-cta-panel text-text-primary">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Medallion({ icon }: { icon: IconName }) {
  return (
    <span className="flex size-44 shrink-0 items-center justify-center rounded-lg bg-bg-success-soft text-text-primary">
      <Icon name={icon} size={22} />
    </span>
  );
}

function pairs<T>(items: T[]) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

export function FarmDetailsView({ details, similar }: { details: FarmDetails; similar: MarketplaceListing[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('farm.details');
  const tc = useTranslations('farm.card');
  const tm = useTranslations('marketplace');
  const L = (value: Localized) => value[locale];

  const { listing } = details;
  const name = L(listing.name);
  const sale = listing.purpose === 'sale';
  const governorate = tm(`governorates.${listing.governorate}`);
  const location = tc('location', { area: L(listing.area.label), governorate });
  const short = (amount: number) => t('price.amount', shortEgp(amount));
  const areaText = tc('areaValue', { count: listing.areaFeddan });

  // Sale: asking price + price per feddan only when stated. Rent: expected annual rent per feddan.
  const amount = sale ? listing.askingPrice : listing.annualRentPerFeddan;
  const price: FarmPrice = {
    label: sale ? t('price.saleLabel') : t('price.rentLabel'),
    amount: amount !== null ? short(amount) : tc('notStated'),
    sub: t('price.sub', {
      first: sale
        ? listing.pricePerFeddan !== null
          ? t('price.perFeddan', { amount: short(listing.pricePerFeddan) })
          : t('price.perFeddanNotStated')
        : t('price.rentUnit'),
      area: t('price.area', { count: listing.areaFeddan }),
    }),
  };

  // FarmExit is the intermediary: the request starts with FarmExit (guests sign in first). No direct owner contact.
  const requestHref = {
    pathname: accountLinks.signIn,
    query: { next: `/farms/${listing.slug}`, request: sale ? 'details' : 'rental' },
  };
  const actionProps = { name, purpose: listing.purpose, price, score: listing.score, requestHref };

  const listedDate = details.reference
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
        month: locale === 'ar' ? 'long' : 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(details.reference.listedYear, details.reference.listedMonth - 1, 1)))
    : null;

  const keyFacts: { label: string; value: string; icon: IconName }[] = [
    { label: t('keyFacts.area'), value: areaText, icon: 'area' },
    { label: t('keyFacts.activity'), value: L(listing.activity), icon: 'tree' },
    ...(listing.irrigationMethod
      ? [
          {
            label: t('keyFacts.irrigation'),
            value: tm(`options.irrigationMethods.${listing.irrigationMethod}`),
            icon: 'irrigation' as const,
          },
        ]
      : []),
  ];

  // Only attributes the listing states; water source, irrigation method and energy source stay separate.
  const specList: { label: string; value: string | null; icon: IconName }[] = [
    { label: t('specs.farmSize'), value: areaText, icon: 'area' },
    { label: t('specs.location'), value: location, icon: 'location-pin' },
    { label: t('specs.farmType'), value: listing.farmType && t(`farmTypes.${listing.farmType}`), icon: 'category' },
    { label: t('specs.activity'), value: L(listing.activity), icon: 'tree' },
    {
      label: t('specs.cropType'),
      value: listing.cropTypes.map((c) => tm(`options.cropTypes.${c}`)).join(' · ') || null,
      icon: 'tree',
    },
    { label: t('specs.water'), value: listing.waterSourceText && L(listing.waterSourceText), icon: 'drop' },
    {
      label: t('specs.irrigation'),
      value: listing.irrigationMethod && tm(`options.irrigationMethods.${listing.irrigationMethod}`),
      icon: 'irrigation',
    },
    {
      label: t('specs.energy'),
      value: listing.energySource && tm(`options.energySources.${listing.energySource}`),
      icon: 'power',
    },
    { label: t('specs.soil'), value: details.soilType && L(details.soilType), icon: 'layer' },
    {
      label: t('specs.infrastructure'),
      value: details.infrastructure.map(L).join(' · ') || null,
      icon: 'building',
    },
  ];
  const specs = specList.filter((s): s is { label: string; value: string; icon: IconName } => Boolean(s.value));

  const { nearby, access, roadLabel } = details.location;

  return (
    <SavedFarmProvider>
      <main id="main" data-testid="farm-details" data-slug={listing.slug}>
        <Container className="flex h-128 items-center justify-between gap-24 tablet:h-148">
          <BackToResults label={t('back')} />
          <nav aria-label={t('breadcrumb.label')} className="min-w-0 max-tablet:hidden">
            <ol className="flex items-center gap-8 type-label-meta text-text-muted">
              <li>
                <Link href="/farms" className="transition-colors duration-150 hover:text-text-brand">
                  {t('breadcrumb.farms')}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={{ pathname: '/farms', query: { gov: listing.governorate } }}
                  className="transition-colors duration-150 hover:text-text-brand"
                >
                  {governorate}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="truncate">
                {name}
              </li>
            </ol>
          </nav>
        </Container>

        <div className="mx-auto w-full max-w-content-max tablet:px-r-page-margin desktop:px-page-gutter">
          <FarmGallery
            name={name}
            status={tc(`listing.${listing.purpose}`)}
            score={listing.score}
            photos={details.photos.map((p) => ({ ...p, alt: L(p.alt) }))}
          />
        </div>

        <Container className="flex gap-24 pt-24 pb-72 tablet:pt-40 tablet:pb-96 desktop:pt-56 desktop:pb-120">
          <div className="flex min-w-0 flex-1 flex-col gap-64 tablet:gap-80 desktop:gap-96">
            {/* 01 · Farm Overview */}
            <section aria-labelledby="farm-name" className="flex flex-col gap-16 tablet:gap-20">
              <div className="flex flex-wrap items-center gap-8">
                <ListingTypeBadge>{tc(`listing.${listing.purpose}`)}</ListingTypeBadge>
                {details.reference && listedDate && (
                  <p className="type-label-caption text-text-muted">
                    {t('listed', { date: listedDate, id: details.reference.listingId })}
                  </p>
                )}
              </div>
              <h1 id="farm-name" className="type-heading-h1-section text-text-primary">
                {name}
              </h1>
              <p className="flex items-center gap-8 type-body-large text-text-body">
                <Icon name="location-pin" size={20} className="text-text-muted" />
                {location}
              </p>
              <dl aria-label={t('keyFacts.label')} className="flex flex-wrap gap-8 pt-4 tablet:gap-12">
                {keyFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex items-center gap-12 rounded-xl border border-border-hairline bg-bg-surface py-12 ps-16 pe-20"
                  >
                    <Icon name={fact.icon} size={22} className="text-text-brand" />
                    <div className="flex flex-col gap-1">
                      <dt className="type-overline-spec text-text-muted">{fact.label}</dt>
                      <dd className="type-label-large text-text-primary">{fact.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              <div className="desktop:hidden">
                <PriceActions {...actionProps} />
              </div>
              {details.description && <p className="type-body-editorial text-text-body">{L(details.description)}</p>}
              {details.highlights.length > 0 && (
                <ul aria-label={t('highlights')} className="flex flex-col gap-10">
                  {details.highlights.map((h) => (
                    <li key={h.en} className="flex items-center gap-10 type-label-list text-text-secondary">
                      <Icon name="check" size={20} className="text-brand-accent" />
                      {L(h)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 03 · Farm Specifications */}
            <section aria-labelledby="farm-specs" className="flex flex-col gap-28">
              <DetailsHeading id="farm-specs" eyebrow={t('specs.eyebrow')} title={t('specs.title')} />
              <dl className="flex flex-col rounded-card border border-border-hairline bg-bg-surface px-16 py-12 tablet:px-32">
                {pairs(specs).map((row, i, rows) => (
                  <div
                    key={i}
                    className={cn(
                      'flex flex-col py-14 tablet:flex-row tablet:gap-32',
                      i < rows.length - 1 && 'border-b border-border-subtle',
                    )}
                  >
                    {row.map((spec) => (
                      <div key={spec.label} className="flex min-w-0 flex-1 items-center gap-14 py-8">
                        <Medallion icon={spec.icon} />
                        <div className="flex min-w-0 flex-col gap-3">
                          <dt className="type-overline-spec text-text-muted">{spec.label}</dt>
                          <dd className="type-label-large break-words text-text-primary">{spec.value}</dd>
                        </div>
                      </div>
                    ))}
                    {row.length === 1 && <div aria-hidden="true" className="hidden flex-1 tablet:block" />}
                  </div>
                ))}
              </dl>
            </section>

            {/* 04 · Facilities & Equipment — hidden when the listing has no facilities. */}
            {details.facilities.length > 0 && (
              <section aria-labelledby="farm-facilities" className="flex flex-col gap-20 tablet:gap-28">
                <DetailsHeading id="farm-facilities" eyebrow={t('facilities.eyebrow')} title={t('facilities.title')} />
                <ul className="grid grid-cols-1 gap-20 tablet:grid-cols-2 tablet:gap-x-24 tablet:gap-y-28">
                  {details.facilities.map((f) => (
                    <li key={f.title.en} className="flex flex-col gap-14">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-image bg-bg-image-placeholder">
                        <Image
                          src={f.photo.src}
                          alt={L(f.photo.alt)}
                          fill
                          sizes="(min-width: 1280px) 384px, (min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-4">
                        <h3 className="type-label-large text-text-primary">{L(f.title)}</h3>
                        <p className="type-body-caption text-text-muted">{L(f.note)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 05 · Location & Access — the map is always shown; empty lists are hidden. */}
            <section aria-labelledby="farm-location" className="flex flex-col gap-28">
              <DetailsHeading id="farm-location" eyebrow={t('location.eyebrow')} title={t('location.title')} />
              <MapPreview place={location} roadLabel={roadLabel && L(roadLabel)} />
              {(nearby.length > 0 || access.length > 0) && (
                <>
                  <div className="flex flex-col gap-24 tablet:flex-row tablet:gap-32">
                    {nearby.length > 0 && (
                      <LocationList title={t('location.nearby')}>
                        {nearby.map((n) => (
                          <LocationRow
                            key={n.place.en}
                            icon={n.icon}
                            label={L(n.place)}
                            value={t('location.distance', { km: n.distanceKm })}
                          />
                        ))}
                      </LocationList>
                    )}
                    {access.length > 0 && (
                      <LocationList title={t('location.access')}>
                        {access.map((a) => (
                          <LocationRow
                            key={a.label.en}
                            icon={a.icon}
                            label={L(a.label)}
                            value={'km' in a.value ? t('location.distance', { km: a.value.km }) : L(a.value.text)}
                          />
                        ))}
                      </LocationList>
                    )}
                  </div>
                  <p className="type-label-caption text-text-muted">{t('location.note')}</p>
                </>
              )}
            </section>

            {/* 06 · Documents — only document types the listing includes; generic names, no verification claims. */}
            {details.documents.length > 0 && (
              <section aria-labelledby="farm-documents" className="flex flex-col gap-28">
                <DetailsHeading id="farm-documents" eyebrow={t('documents.eyebrow')} title={t('documents.title')}>
                  <p className="type-body-large text-text-body">{t('documents.subtitle')}</p>
                </DetailsHeading>
                <ul className="flex flex-col gap-12">
                  {details.documents.map((d) => (
                    <li
                      key={d.type}
                      className="flex items-center gap-16 rounded-xl border border-border-hairline bg-bg-surface py-16 ps-16 pe-20"
                    >
                      <Medallion icon={d.type === 'ownership' ? 'document-text' : 'map'} />
                      <div className="flex min-w-0 flex-col gap-2">
                        <p className="type-label-medium text-text-primary">{t(`documents.${d.type}`)}</p>
                        <p className="type-body-caption text-text-muted">
                          {t('documents.shared', { detail: L(d.detail) })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="flex items-start gap-10 type-label-caption text-text-muted tablet:items-center">
                  <Icon name="lock" size={18} />
                  {t('documents.note')}
                </p>
              </section>
            )}
          </div>

          <aside aria-label={t('actions.barLabel')} className="hidden w-384 shrink-0 desktop:block">
            <div className="sticky top-[calc(var(--spacing-r-nav-height)+24px)]">
              <RequestPanel {...actionProps} />
            </div>
          </aside>
        </Container>

        {/* 07 · Request Band */}
        <section aria-labelledby="request-band-title" className="pb-72 tablet:pb-112 desktop:pb-144">
          <Container>
            <div className="flex flex-col gap-24 rounded-feature px-24 py-32 fx-band-request effect-premium-lift tablet:gap-32 tablet:p-48 desktop:flex-row desktop:items-center desktop:gap-64 desktop:p-64">
              <div className="flex min-w-0 flex-1 flex-col gap-16">
                <p className="type-overline-section text-brand-gold">{t('band.eyebrow')}</p>
                <h2 id="request-band-title" className="type-heading-cta-feature text-text-on-dark">
                  {t('band.title')}
                </h2>
                <p className="type-body-large text-overlay-on-dark-body">{t('band.body')}</p>
                <ol className="flex flex-col gap-12 pt-12 tablet:flex-row tablet:gap-24">
                  {(['one', 'two', 'three'] as const).map((step, i) => (
                    <li key={step} className="flex flex-1 flex-col gap-6 border-t border-overlay-gold-hairline pt-14">
                      <span className="type-numeric-index text-brand-gold">{`0${i + 1}`}</span>
                      <span className="type-label-medium text-text-on-dark">{t(`band.steps.${step}`)}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-col gap-12 desktop:w-360 desktop:shrink-0">
                <BlockButtonLink href={requestHref} variant="inverse">
                  {sale ? t('actions.requestSale') : t('actions.requestRent')}
                </BlockButtonLink>
                <p className="flex items-center gap-10 pt-4 type-label-caption text-overlay-on-dark-muted">
                  <Icon name="lock" size={16} />
                  {t('band.note')}
                </p>
                <p className="type-label-caption-strong text-brand-gold">{t('band.reply')}</p>
              </div>
            </div>
          </Container>
        </section>

        {/* 08 · Related Opportunities — hidden when the listing has no similar farms. */}
        {similar.length > 0 && (
          <section aria-labelledby="similar-title" className="pb-72 tablet:pb-112 desktop:pb-144">
            <Container className="flex flex-col gap-24 tablet:gap-40">
              <SectionHeader
                eyebrow={t('similar.eyebrow')}
                titleId="similar-title"
                title={t('similar.title')}
                subtitle={details.similar.subtitle ? L(details.similar.subtitle) : undefined}
              />
              <ul className="-mx-16 flex snap-x snap-mandatory gap-16 overflow-x-auto px-16 pb-4 tablet:-mx-40 tablet:gap-24 tablet:px-40 desktop:mx-0 desktop:grid desktop:grid-cols-3 desktop:overflow-visible desktop:px-0 desktop:pb-0">
                {similar.map((s) => (
                  <li key={s.slug} className="w-310 shrink-0 snap-start tablet:w-460 desktop:w-auto">
                    <FarmCard
                      sizes="(min-width: 1280px) 366px, (min-width: 768px) 444px, 294px"
                      farm={{
                        name: L(s.name),
                        listingLabel: tc(`listing.${s.purpose}`),
                        location: tc('location', {
                          area: L(s.area.label),
                          governorate: tm(`governorates.${s.governorate}`),
                        }),
                        area: t('similar.areaShort', { count: s.areaFeddan }),
                        crop: L(s.activity),
                        water: s.waterSourceText ? L(s.waterSourceText) : tc('notStated'),
                        priceLabel: tc(`priceLabel.${s.purpose}`),
                        price: (() => {
                          const a = s.purpose === 'sale' ? s.askingPrice : s.annualRentPerFeddan;
                          return a !== null ? short(a) : tc('notStated');
                        })(),
                        priceSub:
                          s.purpose === 'sale'
                            ? s.pricePerFeddan !== null
                              ? t('price.perFeddan', { amount: short(s.pricePerFeddan) })
                              : t('price.perFeddanNotStated')
                            : tc('rentPerFeddan'),
                        imageAlt: L(s.image.alt),
                        image: { src: s.image.src },
                        illustrative: s.image.isIllustrative,
                        score: s.score,
                        href: `/farms/${s.slug}`,
                      }}
                    />
                  </li>
                ))}
              </ul>
            </Container>
          </section>
        )}
      </main>
      <StickyActionBar {...actionProps} />
    </SavedFarmProvider>
  );
}

function LocationList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <h3 className="type-label-medium text-text-primary">{title}</h3>
      <ul>{children}</ul>
    </div>
  );
}

function LocationRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <li className="flex h-48 items-center gap-12 border-b border-border-subtle">
      <Icon name={icon} size={20} className="text-text-muted" />
      <span className="min-w-0 flex-1 truncate type-body-default text-text-secondary">{label}</span>
      <span className="shrink-0 type-label-small-strong text-text-primary">{value}</span>
    </li>
  );
}
