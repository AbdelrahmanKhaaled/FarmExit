'use client';
import { BilingualFields } from '@/components/content/BilingualFields';
import type { LocalizedContent } from '@/lib/content/localized';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Select, TextInput } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';
import { ButtonLink } from '@/components/ui/Button';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { editableListing, type ListingDraft } from './types';
import { FarmFacilitiesPanel } from './FarmFacilitiesPanel';
import { FarmMediaPanel } from './FarmMediaPanel';
import { ListingTracking, type ListingRequestHistory } from './ListingTracking';

type Farm = {
  localizedContent?: LocalizedContent;
  id: string;
  name: string;
  governorate: string;
  areaName: string | null;
  areaFeddan: number;
  farmType: string;
  description: string | null;
  myRoles: string[];
};

export function FarmWorkspace({
  farm: initial,
  listings,
  tracking,
}: {
  farm: Farm;
  listings: ListingDraft[] | null;
  tracking?: ListingRequestHistory | null;
}) {
  const t = useTranslations('workspace.farmWorkspace');
  const wizard = useTranslations('workspace.wizard');
  const router = useRouter();
  const [localizedContent, setLocalizedContent] = useState<LocalizedContent>(initial.localizedContent ?? {});
  const [farm, setFarm] = useState(initial);
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOwner = farm.myRoles.includes('owner');
  const canEditFarmDetails = isOwner || farm.myRoles.includes('manager');
  const canUploadMedia = canEditFarmDetails;

  async function saveFarm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEditFarmDetails) return;
    setError(null);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const body = {
      localizedContent,
      name: localizedContent.en?.name || localizedContent.ar?.name || farm.name,
      governorate: String(form.get('governorate') ?? '').trim(),
      areaName: localizedContent.en?.areaName || localizedContent.ar?.areaName || farm.areaName,
      description: localizedContent.en?.description || localizedContent.ar?.description || farm.description,
    };
    const res = await fetch(`/api/farms/${farm.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(t('saveError'));
      return;
    }
    const updated = (await res.json()) as Farm;
    setFarm(updated);
    setMessage(t('saved'));
  }

  async function createListing(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isOwner) return;
    setError(null);
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      listingType,
      listingDescription: String(form.get('listingDescription') ?? '').trim() || null,
    };
    if (listingType === 'sale') {
      body.askingPrice = Number(form.get('askingPrice'));
      const ppf = form.get('statedSalePricePerFeddan');
      if (ppf) body.statedSalePricePerFeddan = Number(ppf);
    } else {
      body.annualRentPerFeddan = Number(form.get('annualRentPerFeddan'));
    }
    const created = await fetch(`/api/farms/${farm.id}/listing-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!created.ok) {
      setError(t('listingError'));
      return;
    }
    const listing = (await created.json()) as { id: string };
    const submitted = await fetch(`/api/listing-requests/${listing.id}/submit`, { method: 'POST' });
    if (!submitted.ok) {
      setError(t('submitError'));
      return;
    }
    const req = (await submitted.json()) as { id: string };
    setMessage(t('listingSubmitted'));
    router.push(`/my/requests/${req.id}`);
  }

  return (
    <div className="flex flex-col gap-24">
      {tracking ? (
        <ListingTracking request={tracking} listing={listings?.find((item) => item.id === tracking.id) ?? null} />
      ) : (
        <>
          {' '}
          <div className="flex flex-wrap items-center justify-between gap-12">
            <h2 className="type-display-h4">{farm.name}</h2>
            <Link href="/my/farms" className="type-label-button text-text-brand">
              {t('back')}
            </Link>
          </div>
          <p className="type-body-small text-text-muted">{t('roles', { roles: farm.myRoles.join(', ') })}</p>
        </>
      )}
      <Surface className="p-24">
        <div className="flex flex-wrap items-center justify-between gap-16">
          <h3 className="type-heading-h4">{wizard('listingRequests')}</h3>
          {isOwner && listings !== null && (
            <ButtonLink
              href={
                listings.find((item) => editableListing(item.status))
                  ? `/my/farms/${farm.id}/list?listingId=${listings.find((item) => editableListing(item.status))!.id}`
                  : `/my/farms/${farm.id}/list`
              }
              variant="primary"
              size="sm"
            >
              {wizard(listings.some((item) => editableListing(item.status)) ? 'resume' : 'newListing')}
            </ButtonLink>
          )}
        </div>
        {listings === null ? (
          <p className="mt-16 type-body-caption text-text-muted">{wizard('unavailable')}</p>
        ) : !listings.length ? (
          <p className="mt-16 type-body-caption text-text-muted">{wizard('noListings')}</p>
        ) : (
          <ul className="mt-24 flex flex-col gap-16">
            {listings.map((listing) => (
              <li
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-16 rounded-lg border border-border-hairline p-16"
              >
                <Link href={`/my/requests/${listing.id}`} className="type-label-small-strong text-text-brand">
                  {listing.requestNumber}
                </Link>
                <PortalStatus status={listing.status} />
                <ButtonLink
                  href={
                    editableListing(listing.status)
                      ? `/my/farms/${farm.id}/list?listingId=${listing.id}`
                      : `/my/requests/${listing.id}`
                  }
                  variant="outline"
                  size="sm"
                >
                  {wizard(editableListing(listing.status) ? 'resume' : 'track')}
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <details className="rounded-card border border-border-hairline bg-bg-surface p-24">
        <summary className="cursor-pointer type-label-large text-text-brand">{t('editTitle')}</summary>{' '}
        <Surface className="p-24">
          <h3 className="type-heading-h4">{t('editTitle')}</h3>
          <form onSubmit={saveFarm} className="mt-16 flex flex-col gap-12">
            <fieldset disabled={!canEditFarmDetails} className="flex flex-col gap-12">
              <BilingualFields
                value={localizedContent}
                onChange={setLocalizedContent}
                legacy={{ name: farm.name, description: farm.description ?? '' }}
                fields={[
                  { key: 'name', label: t('name'), maxLength: 200 },
                  { key: 'description', label: t('description') },
                  { key: 'areaName', label: t('areaName'), maxLength: 120 },
                ]}
              />
              <TextInput
                label={t('governorate')}
                name="governorate"
                defaultValue={farm.governorate}
                required
                fieldStyle="form"
              />

              <Button type="submit" variant="primary" size="sm">
                {t('save')}
              </Button>
            </fieldset>
          </form>
        </Surface>
      </details>

      {isOwner && (
        <Surface className="p-24">
          <h3 className="type-heading-h4">{t('partnershipLinkTitle')}</h3>
          <p className="mt-8 type-body-caption text-text-muted">{t('partnershipLinkNote')}</p>
          <Link
            href={`/my/partnerships/new?farmId=${farm.id}`}
            className="mt-12 inline-block type-label-button text-text-brand"
          >
            {t('partnershipLink')}
          </Link>
        </Surface>
      )}

      {isOwner && (
        <Surface className="p-24">
          <h3 className="type-heading-h4">{t('managementLinkTitle')}</h3>
          <p className="mt-8 type-body-caption text-text-muted">{t('managementLinkNote')}</p>
          <Link
            href={`/my/management/new?farmId=${farm.id}`}
            className="mt-12 inline-block type-label-button text-text-brand"
          >
            {t('managementLink')}
          </Link>
        </Surface>
      )}

      <details className="rounded-card border border-border-hairline bg-bg-surface p-24">
        <summary className="cursor-pointer type-label-large text-text-brand">{wizard('facilities')}</summary>
        <div className="mt-24">
          <FarmFacilitiesPanel farmId={farm.id} canEdit={canEditFarmDetails} />
        </div>
      </details>
      <details className="rounded-card border border-border-hairline bg-bg-surface p-24">
        <summary className="cursor-pointer type-label-large text-text-brand">{wizard('steps.photos')}</summary>
        <div className="mt-24">
          <FarmMediaPanel farmId={farm.id} canUpload={canUploadMedia} />
        </div>
      </details>

      {isOwner && (
        <details className="rounded-card border border-border-hairline bg-bg-surface p-24">
          <summary className="cursor-pointer type-label-large text-text-brand">{t('listingTitle')}</summary>{' '}
          <Surface className="p-24">
            <h3 className="type-heading-h4">{t('listingTitle')}</h3>
            <p className="mt-8 type-body-caption text-text-muted">{t('listingNote')}</p>
            <form onSubmit={createListing} className="mt-16 flex flex-col gap-12">
              <Select
                label={t('listingType')}
                name="listingType"
                value={listingType}
                onChange={(e) => setListingType(e.target.value as 'sale' | 'rent')}
                fieldStyle="form"
              >
                <option value="sale">{t('sale')}</option>
                <option value="rent">{t('rent')}</option>
              </Select>
              {listingType === 'sale' ? (
                <>
                  <TextInput
                    label={t('askingPrice')}
                    name="askingPrice"
                    type="number"
                    min={1}
                    step={1}
                    required
                    fieldStyle="form"
                  />
                  <TextInput
                    label={t('pricePerFeddan')}
                    name="statedSalePricePerFeddan"
                    type="number"
                    min={1}
                    step={1}
                    fieldStyle="form"
                  />
                </>
              ) : (
                <TextInput
                  label={t('annualRent')}
                  name="annualRentPerFeddan"
                  type="number"
                  min={1}
                  step={1}
                  required
                  fieldStyle="form"
                />
              )}
              <TextInput label={t('listingDescription')} name="listingDescription" maxLength={8000} fieldStyle="form" />
              <Button type="submit" variant="primary">
                {t('submitListing')}
              </Button>
            </form>
          </Surface>
        </details>
      )}

      {message && <p className="type-body-caption text-text-brand">{message}</p>}
      {error && <p className="type-body-caption text-status-error">{error}</p>}
    </div>
  );
}
