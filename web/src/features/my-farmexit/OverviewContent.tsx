import Image from 'next/image';
import { SavedListings, type SavedListing } from './SavedListings';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/icons/Icon';
import { requestDetailHref } from '@/features/my-messages/request-context';
import { PortalHeading, PortalRow, VerificationCard } from './PortalUI';

export type OverviewData = {
  name: string;
  counts: { farms: number | null; requests: number | null; saved: number | null };
  farms: { id: string; name: string; governorate: string }[];
  requests: { id: string; requestNumber: string; requestType: string; status: string }[];
  saved: SavedListing[];
  capabilities: { id: string; professionalType: string; verificationStatus: string }[];
};

/** Portal PDF p2–6. Variants follow actual account activity, not a global user role. */
export function OverviewContent({ data }: { data: OverviewData }) {
  const t = useTranslations('workspace');
  const v = useTranslations('workspace.visual');
  const professional = useTranslations('workspace.professional.types');
  const newAccount = Object.values(data.counts).every((count) => count === 0) && data.capabilities.length === 0;
  const sections = [
    { key: 'farms', href: '/my/farms', title: t('farms.title') },
    { key: 'requests', href: '/my/requests', title: t('requests.title') },
    { key: 'saved', href: '/my/saved', title: t('saved.title') },
  ] as const;
  const journeys = [
    { title: 'browse', body: 'findDescription', audience: 'buyerAudience', image: 'journey-find', href: '/farms' },
    {
      title: 'list',
      body: 'listDescription',
      audience: 'ownerAudience',
      image: 'journey-manage',
      href: '/my/farms/new',
    },
    {
      title: 'manage',
      body: 'manageDescription',
      audience: 'ownerAudience',
      image: 'about-farmer',
      href: '/my/management/new',
    },
    {
      title: 'expertise',
      body: 'expertiseDescription',
      audience: 'professionalAudience',
      image: 'journey-managers',
      href: '/my/professional',
    },
  ] as const;
  return (
    <div className="flex flex-col gap-40 tablet:gap-48">
      <PortalHeading
        title={newAccount ? v('welcome', { name: data.name }) : t('overview.welcome', { name: data.name })}
        description={v('intro')}
      />
      {data.capabilities.map((capability) => (
        <VerificationCard
          key={capability.id}
          status={capability.verificationStatus}
          name={
            capability.professionalType === 'farmManager' || capability.professionalType === 'agriculturalEngineer'
              ? professional(capability.professionalType)
              : capability.professionalType
          }
        />
      ))}
      {!newAccount &&
        sections.map((section) => {
          const count = data.counts[section.key];
          const rows = section.key === 'farms' ? data.farms : section.key === 'requests' ? data.requests : data.saved;
          return (
            <section key={section.key} className="flex flex-col gap-20">
              <header className="flex flex-wrap items-center justify-between gap-12">
                <h3 className="type-heading-h4 text-text-primary">
                  {section.title}
                  <span className="ms-8 type-label-caption text-text-muted">{count ?? '—'}</span>
                </h3>
                <Link
                  href={section.href}
                  className="inline-flex min-h-44 items-center gap-8 type-label-small-strong text-text-brand"
                >
                  {v('view')}
                  <Icon name="arrow-right" size={16} />
                </Link>
              </header>
              {rows.length ? (
                section.key === 'saved' ? (
                  <SavedListings items={data.saved.slice(0, 3)} />
                ) : (
                  <ul className="flex flex-col gap-12">
                    {section.key === 'farms'
                      ? data.farms.map((farm) => (
                          <li key={farm.id}>
                            <PortalRow
                              icon="tree"
                              title={farm.name}
                              meta={farm.governorate}
                              href={`/my/farms/${farm.id}`}
                            />
                          </li>
                        ))
                      : section.key === 'requests'
                        ? data.requests.map((request) => (
                            <li key={request.id}>
                              <PortalRow
                                icon="clipboard-tick"
                                title={request.requestNumber}
                                meta={request.requestType}
                                status={request.status}
                                href={requestDetailHref(request)}
                              />
                            </li>
                          ))
                        : data.saved.slice(0, 3).map((farm) => (
                            <li key={farm.id}>
                              <PortalRow
                                icon="bookmark"
                                title={farm.farmName}
                                meta={farm.governorate}
                                href={`/farms/${farm.slug}`}
                              />
                            </li>
                          ))}
                  </ul>
                )
              ) : (
                <p className="rounded-2xl border border-border-hairline bg-bg-surface p-24 type-body-default text-text-muted">
                  {count === null ? v('unavailable') : t(`${section.key}.empty`)}
                </p>
              )}
            </section>
          );
        })}
      <section className="flex flex-col gap-24">
        <h3 className="type-heading-h4 text-text-primary">{v('start')}</h3>
        <div className="grid gap-24 tablet:grid-cols-2">
          {journeys.map((journey) => (
            <Link
              key={journey.title}
              href={journey.href}
              className={`group flex flex-col overflow-hidden rounded-card border border-border-hairline p-8 effect-premium-rest ${journey.title === 'list' ? 'bg-brand-primary text-text-on-dark' : 'bg-bg-surface text-text-primary'}`}
            >
              <div className="relative aspect-[2/1] overflow-hidden rounded-image">
                <Image
                  src={`/images/home/${journey.image}.jpg`}
                  alt=""
                  fill
                  sizes="(min-width:1280px) 460px, (min-width:768px) 45vw, 90vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-12 p-20">
                <p className="type-overline-field text-text-accent">{v(journey.audience)}</p>
                <h4 className="type-heading-h4">{v(journey.title)}</h4>
                <p
                  className={`flex-1 type-body-default ${journey.title === 'list' ? 'text-text-on-dark/80' : 'text-text-muted'}`}
                >
                  {v(journey.body)}
                </p>
                <span
                  className={`mt-12 flex items-center justify-between border-t pt-16 type-label-small-strong ${journey.title === 'list' ? 'border-text-on-dark/15' : 'border-border-subtle text-text-brand'}`}
                >
                  {v('next')}
                  <Icon name="arrow-right" size={22} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
