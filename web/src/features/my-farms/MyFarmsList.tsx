'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';
import { Icon } from '@/components/icons/Icon';
import { PortalHeading, PortalEmpty, PortalStatus } from '@/features/my-farmexit/PortalUI';
import { editableListing, type Farm, type ListingDraft } from './types';
export function MyFarmsList({ farms, listings }: { farms: Farm[]; listings: ListingDraft[] | null }) {
  const t = useTranslations('workspace.wizard');
  const w = useTranslations('workspace');
  const status = useTranslations('workspace.visualStatuses');
  const [filter, setFilter] = useState('all');
  const latest = (id: string) => listings?.find((listing) => listing.farmId === id);
  const shown = farms.filter((farm) => filter === 'all' || latest(farm.id)?.status === filter);
  return (
    <div className="flex flex-col gap-24" data-testid="my-farms-list">
      <PortalHeading
        title={w('farms.title')}
        description={t('reviewNote')}
        action={
          <ButtonLink href="/my/farms/new" variant="primary">
            {w('farms.add')}
          </ButtonLink>
        }
      />
      {listings === null && (
        <p role="status" className="rounded-lg border border-overlay-gold-hairline bg-bg-notice p-16 type-body-caption">
          {t('unavailable')}
        </p>
      )}
      {farms.length > 0 && listings !== null && (
        <>
          <div className="flex flex-wrap gap-8" role="group" aria-label={w('farms.title')}>
            {['all', 'draft', 'underFarmExitReview', 'changesRequested', 'published'].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`min-h-44 rounded-lg px-16 type-label-small-strong ${value === filter ? 'bg-brand-primary text-text-on-dark' : 'text-text-secondary hover:bg-bg-hover'}`}
              >
                {value === 'all'
                  ? t('all')
                  : status(value as 'draft' | 'underFarmExitReview' | 'changesRequested' | 'published')}
                <span className="ms-8">
                  {value === 'all' ? farms.length : farms.filter((farm) => latest(farm.id)?.status === value).length}
                </span>
              </button>
            ))}
          </div>
          <p className="type-label-caption text-text-muted">{t('latest')}</p>
        </>
      )}
      {farms.length === 0 ? (
        <PortalEmpty
          icon="tree"
          title={w('visual.emptyFarms')}
          body={w('farms.empty')}
          href="/my/farms/new"
          action={t('title')}
        />
      ) : shown.length === 0 ? (
        <p className="rounded-card bg-bg-surface p-32 type-body-default text-text-muted">{t('noFilterResults')}</p>
      ) : (
        <ul className="flex flex-col gap-16">
          {shown.map((farm) => {
            const listing = latest(farm.id);
            return (
              <li key={farm.id}>
                <Card className="flex flex-col gap-20 p-16 tablet:flex-row tablet:items-center tablet:p-20">
                  <span
                    className="flex size-80 shrink-0 items-center justify-center rounded-image bg-bg-muted text-text-brand"
                    aria-hidden="true"
                  >
                    <Icon name="tree" size={32} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {listing && <p className="mb-6 type-overline-field text-text-accent">{t(listing.listingType)}</p>}
                    <h3 className="type-label-large wrap-anywhere">
                      <Link href={`/my/farms/${farm.id}`}>{farm.name}</Link>
                    </h3>
                    <p className="mt-8 flex items-center gap-6 type-body-caption text-text-muted">
                      <Icon name="location-pin" size={16} />
                      {farm.areaName ? `${farm.areaName}, ` : ''}
                      {farm.governorate}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-8">
                    {listing ? (
                      <PortalStatus status={listing.status} />
                    ) : (
                      <p className="type-label-caption text-text-muted">{t('farmRecord')}</p>
                    )}
                    {listing?.updatedAt && (
                      <time dateTime={listing.updatedAt} className="type-label-caption text-text-muted">
                        {listing.updatedAt.slice(0, 10)}
                      </time>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-12">
                    {listing && editableListing(listing.status) ? (
                      <ButtonLink
                        href={`/my/farms/${farm.id}/list?listingId=${listing.id}`}
                        variant="outline"
                        size="sm"
                      >
                        {t('resume')}
                      </ButtonLink>
                    ) : listing ? (
                      <ButtonLink href={`/my/requests/${listing.id}`} variant="outline" size="sm">
                        {t('track')}
                      </ButtonLink>
                    ) : farm.myRoles.includes('owner') && listings !== null ? (
                      <ButtonLink href={`/my/farms/${farm.id}/list`} variant="outline" size="sm">
                        {t('newListing')}
                      </ButtonLink>
                    ) : null}
                    <Link
                      href={`/my/farms/${farm.id}`}
                      className="inline-flex min-h-44 items-center type-label-caption-strong text-text-brand"
                    >
                      {t('workspace')}
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Card tone="light" surface="muted" className="flex items-start gap-16 border-overlay-gold-hairline">
        <Icon name="verify-filled" size={24} className="shrink-0 text-text-gold" />
        <div>
          <h3 className="type-label-small-strong">{t('reviewed')}</h3>
          <p className="mt-8 type-body-caption text-text-muted">{t('private')}</p>
        </div>
      </Card>
    </div>
  );
}
