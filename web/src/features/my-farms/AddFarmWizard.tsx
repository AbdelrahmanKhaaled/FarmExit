'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/icons/Icon';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextInput, Select, TextArea } from '@/components/ui/Field';
import { Card } from '@/components/ui/Surface';
import { Avatar } from '@/components/ui/Avatar';
import { Dialog } from '@/components/overlay/Dialog';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { farmTypes, waterSources, irrigationMethods, cropTypes } from '@/lib/domain/enums';
import { GOVERNORATE_API_LABEL } from '@/lib/data/marketplace-api';
import { governorates } from '@/lib/data/marketplace';
import type { AuthUser } from '@/lib/auth/types';
import { toNavbarUser } from '@/lib/auth/navbar-user';
import { WizardCard } from './WizardCard';
import { WizardDisclosure } from './WizardDisclosure';
import { SubmissionProgress } from './SubmissionProgress';
import { FarmLocationMap, type FarmPin } from './FarmLocationMap';
import type { PrivateFarmLocation } from './types';
import { FarmFacilitiesPanel, type Facility } from './FarmFacilitiesPanel';
import { FarmMediaPanel } from './FarmMediaPanel';
import { RequestDocumentsPanel } from './RequestDocumentsPanel';
import { editableListing, jsonRequest, type Farm, type ListingDraft, type FarmSpecification } from './types';

export const wizardSteps = ['basics', 'location', 'agriculture', 'listing', 'photos', 'documents', 'review'] as const;
type Props = {
  user: AuthUser;
  initialFarm?: Farm;
  initialListing?: ListingDraft;
  initialSpecification?: FarmSpecification | null;
  initialStep?: number;
  initialLocation?: PrivateFarmLocation;
};
const amenityKeys = [
  'irrigationNetwork',
  'machineryEquipment',
  'packingStorage',
  'seedlingNursery',
  'powerConnection',
  'housing',
] as const;
const amenityIcons = {
  irrigationNetwork: 'irrigation',
  machineryEquipment: 'truck',
  packingStorage: 'building',
  seedlingNursery: 'tree',
  powerConnection: 'power',
  housing: 'building',
} as const;
const availabilityChoices = ['Available now', 'From a later date'] as const;
function storedAvailabilityDate(value: string | null | undefined): string {
  const date = /^From (\d{4}-\d{2}-\d{2})$/.exec(value ?? '')?.[1];
  return date &&
    Number.isFinite(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date
    ? date
    : '';
}
export function AddFarmWizard({
  user,
  initialFarm,
  initialListing,
  initialSpecification,
  initialLocation,
  initialStep = 1,
}: Props) {
  const t = useTranslations('workspace.wizard');
  const ft = useTranslations('marketplace.options.farmTypes');
  const options = useTranslations('marketplace.options');
  const router = useRouter();
  const locale = useLocale();
  const govLabels = useTranslations('marketplace.governorates');
  const [customGovernorate, setCustomGovernorate] = useState(
    Boolean(initialFarm?.governorate && !Object.values(GOVERNORATE_API_LABEL).includes(initialFarm.governorate)),
  );
  const [step, setStep] = useState(Math.max(1, Math.min(7, initialStep)));
  const [visited, setVisited] = useState<number[]>([initialStep]);
  const [farm, setFarm] = useState(initialFarm);
  const [listing, setListing] = useState(initialListing);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(Boolean(initialFarm));
  const [leave, setLeave] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [docsBusy, setDocsBusy] = useState(false);
  const [mediaPending, setMediaPending] = useState(false);
  const [docsPending, setDocsPending] = useState(false);
  const [facilityPending, setFacilityPending] = useState(false);
  const [facilities, setFacilities] = useState<Facility[] | null>(null);
  const [specDirty, setSpecDirty] = useState(false);
  const [listingDirty, setListingDirty] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState(storedAvailabilityDate(initialListing?.availability));
  const [pin, setPin] = useState<FarmPin | null>(
    initialLocation?.privatePinLatitude != null && initialLocation.privatePinLongitude != null
      ? { latitude: initialLocation.privatePinLatitude, longitude: initialLocation.privatePinLongitude }
      : null,
  );
  const [locationDirty, setLocationDirty] = useState(false);
  const [pinDirty, setPinDirty] = useState(false);
  const [locationReady, setLocationReady] = useState(!initialFarm || Boolean(initialLocation));
  const [locationError, setLocationError] = useState(false);
  const [locationRetry, setLocationRetry] = useState(0);
  const [data, setData] = useState({
    name: initialFarm?.name ?? '',
    farmType: initialFarm?.farmType ?? '',
    mainActivity: initialFarm?.mainActivity ?? '',
    areaFeddan: initialFarm ? String(initialFarm.areaFeddan) : '',
    irrigationMethod: initialFarm?.irrigationMethod ?? '',
    governorate: initialFarm?.governorate ?? '',
    areaName: initialFarm?.areaName ?? '',
    soilType: initialFarm?.soilType ?? '',
    waterSource: initialFarm?.waterSource ?? '',
    energySource: initialFarm?.energySource ?? '',
    farmDescription: initialFarm?.description ?? '',
    listingType: initialListing?.listingType ?? 'sale',
    askingPrice: initialListing?.askingPrice?.toString() ?? '',
    statedSalePricePerFeddan: initialListing?.statedSalePricePerFeddan?.toString() ?? '',
    annualRentPerFeddan: initialListing?.annualRentPerFeddan?.toString() ?? '',
    availability: initialListing?.availability ?? '',
    listingDescription: initialListing?.listingDescription ?? '',
    highlight1: initialListing?.highlights[0] ?? '',
    highlight2: initialListing?.highlights[1] ?? '',
    highlight3: initialListing?.highlights[2] ?? '',
    currentProduction: initialSpecification?.productionDetails.currentProduction ?? '',
    harvestSeasons: initialSpecification?.productionDetails.harvestSeasons ?? '',
    notes: initialSpecification?.productionDetails.notes ?? '',
    nearestMainRoad: initialLocation?.nearestMainRoad ?? '',
    roadDistanceKm: initialLocation?.roadDistanceKm?.toString() ?? '',
  });
  useEffect(() => {
    if (!initialFarm || initialLocation) return;
    let active = true;
    void jsonRequest<PrivateFarmLocation>(`/api/farms/${initialFarm.id}/private-location`)
      .then((value) => {
        if (!active) return;
        setPin(
          value.privatePinLatitude != null && value.privatePinLongitude != null
            ? { latitude: value.privatePinLatitude, longitude: value.privatePinLongitude }
            : null,
        );
        setData((old) => ({
          ...old,
          nearestMainRoad: value.nearestMainRoad ?? '',
          roadDistanceKm: value.roadDistanceKm?.toString() ?? '',
        }));
        setLocationReady(true);
        setLocationError(false);
      })
      .catch(() => {
        if (active) setLocationError(true);
      });
    return () => {
      active = false;
    };
  }, [initialFarm, initialLocation, locationRetry]);
  const [crops, setCrops] = useState(initialSpecification?.cropTypes ?? []);
  const [amenities, setAmenities] = useState(initialSpecification?.amenities ?? []);
  const canEdit = (!farm || farm.myRoles.includes('owner')) && (!listing || editableListing(listing.status));
  const uploading = mediaBusy || docsBusy;
  const current = wizardSteps[step - 1]!;
  const update = (key: keyof typeof data, value: string) => {
    setData((old) => ({ ...old, [key]: value }));
    setDirty(true);
    setSaved(false);
    if (key === 'nearestMainRoad' || key === 'roadDistanceKm') setLocationDirty(true);
    if (
      [
        'listingType',
        'askingPrice',
        'statedSalePricePerFeddan',
        'annualRentPerFeddan',
        'availability',
        'listingDescription',
        'highlight1',
        'highlight2',
        'highlight3',
      ].includes(key)
    )
      setListingDirty(true);
    if (['currentProduction', 'harvestSeasons', 'notes'].includes(key)) setSpecDirty(true);
  };
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty || uploading || mediaPending || docsPending || facilityPending) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, uploading, mediaPending, docsPending, facilityPending]);
  const go = (next: number) => {
    setStep(next);
    setVisited((old) => (old.includes(next) ? old : [...old, next]));
    setInvalid(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  function requiredValid(location = false) {
    return Boolean(
      data.name.trim() &&
      data.farmType &&
      Number(data.areaFeddan) >= 0.01 &&
      Number(data.areaFeddan) <= 9999999999.99 &&
      /^\d+(\.\d{1,2})?$/.test(data.areaFeddan) &&
      (!location || data.governorate.trim()),
    );
  }
  function priceValid() {
    const values =
      data.listingType === 'sale' ? [data.askingPrice, data.statedSalePricePerFeddan] : [data.annualRentPerFeddan];
    return values.every(
      (value) =>
        !value ||
        (/^\d+$/.test(value) &&
          Number.isSafeInteger(Number(value)) &&
          Number(value) >= 1 &&
          Number(value) <= 9999999999999),
    );
  }
  const syncUrl = (farmId: string, requestId?: string, next = step) =>
    window.history.replaceState(
      null,
      '',
      `/${locale}/my/farms/${farmId}/list?step=${next}${requestId ? `&listingId=${encodeURIComponent(requestId)}` : ''}`,
    );
  async function persist(includeListing = step >= 4) {
    if (!locationReady) throw new Error('location unavailable');
    if (data.roadDistanceKm && (!Number.isFinite(Number(data.roadDistanceKm)) || Number(data.roadDistanceKm) < 0)) {
      throw new Error('invalid road distance');
    }
    if (!requiredValid(true)) {
      setInvalid(true);
      throw new Error('required');
    }
    if (includeListing && !priceValid()) {
      setInvalid(true);
      throw new Error('price');
    }
    const farmBody = {
      name: data.name.trim(),
      farmType: data.farmType,
      mainActivity: data.mainActivity.trim() || null,
      areaFeddan: Number(data.areaFeddan),
      governorate: data.governorate.trim(),
      areaName: data.areaName.trim() || null,
      description: data.farmDescription.trim() || null,
      irrigationMethod: data.irrigationMethod || null,
      waterSource: data.waterSource || null,
      energySource: data.energySource || null,
      soilType: data.soilType.trim() || null,
    };
    const stored = await jsonRequest<Farm>(
      farm ? `/api/farms/${farm.id}` : '/api/farms',
      farm ? 'PATCH' : 'POST',
      farmBody,
    );
    setFarm(stored);
    syncUrl(stored.id, listing?.id);
    if (locationDirty) {
      const confirmed = await jsonRequest<PrivateFarmLocation>(`/api/farms/${stored.id}/private-location`, 'PATCH', {
        ...(pinDirty ? { privatePinLatitude: pin?.latitude ?? null, privatePinLongitude: pin?.longitude ?? null } : {}),
        nearestMainRoad: data.nearestMainRoad.trim() || null,
        roadDistanceKm: data.roadDistanceKm === '' ? null : Number(data.roadDistanceKm),
      });
      setPin(
        confirmed.privatePinLatitude != null && confirmed.privatePinLongitude != null
          ? { latitude: confirmed.privatePinLatitude, longitude: confirmed.privatePinLongitude }
          : null,
      );
      setLocationDirty(false);
      setPinDirty(false);
    }
    if (specDirty) {
      await jsonRequest(`/api/farms/${stored.id}/specifications`, 'PATCH', {
        cropTypes: crops,
        amenities,
        productionDetails: {
          currentProduction: data.currentProduction.trim() || null,
          harvestSeasons: data.harvestSeasons.trim() || null,
          notes: data.notes.trim() || null,
        },
      });
      setSpecDirty(false);
    }
    let request = listing;
    if (includeListing && (!listing || listingDirty)) {
      const body = {
        listingType: data.listingType,
        askingPrice: data.listingType === 'sale' && data.askingPrice ? Number(data.askingPrice) : null,
        statedSalePricePerFeddan:
          data.listingType === 'sale' && data.statedSalePricePerFeddan ? Number(data.statedSalePricePerFeddan) : null,
        annualRentPerFeddan:
          data.listingType === 'rent' && data.annualRentPerFeddan ? Number(data.annualRentPerFeddan) : null,
        availability: data.availability.trim() || null,
        listingDescription: data.listingDescription.trim() || null,
        highlights: [data.highlight1, data.highlight2, data.highlight3].map((value) => value.trim()).filter(Boolean),
      };
      request = await jsonRequest<ListingDraft>(
        listing ? `/api/listing-requests/${listing.id}` : `/api/farms/${stored.id}/listing-requests`,
        listing ? 'PATCH' : 'POST',
        body,
      );
      setListing(request);
      setListingDirty(false);
      syncUrl(stored.id, request.id);
    }
    setDirty(false);
    setSaved(true);
    return { farm: stored, listing: request };
  }
  async function perform(action: 'next' | 'exit' | 'submit' | 'save') {
    if (busy.current || uploading || !canEdit) return;
    if (facilityPending) {
      setStep(3);
      setError(t('finishFacilities'));
      return;
    }
    if (mediaPending || docsPending) {
      setStep(mediaPending ? 5 : 6);
      setError(t('finishUploads'));
      return;
    }
    if (action === 'next' && step === 1) {
      if (!requiredValid()) {
        setInvalid(true);
        setError(t('required'));
        return;
      }
      go(2);
      return;
    }
    if (((action === 'next' && step === 3) || action === 'submit') && !data.waterSource) {
      setInvalid(true);
      setError(t('required'));
      setStep(3);
      return;
    }
    if (
      ((action === 'next' && step === 4) || action === 'submit') &&
      data.availability === 'From a later date' &&
      !availabilityDate
    ) {
      setInvalid(true);
      setError(t('required'));
      setStep(4);
      return;
    }
    busy.current = true;
    setPending(true);
    setSaved(false);
    setError(null);
    try {
      const stored = await persist(step >= 4 || Boolean(listing) || listingDirty);
      if (action === 'exit') {
        setLeave(false);
        router.push('/my/farms');
        return;
      }
      if (action === 'save') return;
      if (action === 'submit') {
        if (!stored.listing) throw new Error('required');
        setSubmitting(true);
        const result = await jsonRequest<ListingDraft>(`/api/listing-requests/${stored.listing.id}/submit`, 'POST');
        // A 2xx response without the confirmed review transition is not a successful submission.
        if (
          !result ||
          result.status !== 'underFarmExitReview' ||
          result.id !== stored.listing.id ||
          typeof result.requestNumber !== 'string'
        )
          throw new Error('unconfirmed');
        setListing(result);
        setSubmitted(true);
        setDirty(false);
        window.scrollTo(0, 0);
        return;
      }
      go(Math.min(7, step + 1));
      syncUrl(stored.farm.id, stored.listing?.id, Math.min(7, step + 1));
    } catch (reason) {
      setError(
        reason instanceof Error && reason.message === 'required'
          ? t('firstSave')
          : action === 'submit'
            ? t('submitError')
            : t('saveError'),
      );
    } finally {
      busy.current = false;
      setPending(false);
      setSubmitting(false);
    }
  }
  const text = (
    key: keyof typeof data,
    props: {
      required?: boolean;
      type?: string;
      maxLength?: number;
      min?: number;
      max?: number;
      step?: string;
      helper?: string;
    } = {},
  ) => (
    <TextInput
      key={key}
      className="min-w-0"
      name={key}
      label={t(`fields.${key as Exclude<keyof typeof data, 'listingType'>}`)}
      value={data[key]}
      onChange={(event) => update(key, event.target.value)}
      error={
        invalid &&
        key === 'areaFeddan' &&
        (!/^\d+(\.\d{1,2})?$/.test(data.areaFeddan) ||
          Number(data.areaFeddan) < 0.01 ||
          Number(data.areaFeddan) > 9999999999.99)
          ? t('areaError')
          : invalid && props.required && !data[key].trim()
            ? t('required')
            : undefined
      }
      fieldStyle="form"
      {...props}
    />
  );
  const displayValue = (key: keyof typeof data) => {
    if (initialFarm && initialSpecification === null && ['currentProduction', 'harvestSeasons', 'notes'].includes(key))
      return t('productionUnavailable');
    const value = data[key];
    if (!value) return t('notStated');
    if (key === 'farmType' && farmTypes.includes(value as (typeof farmTypes)[number]))
      return ft(value as (typeof farmTypes)[number]);
    if (key === 'availability') {
      if (value === 'Available now') return t('availableNow');
      if (value === 'From a later date') return t('availableLater');
      const date = storedAvailabilityDate(value);
      if (date)
        return t('fromDate', {
          date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
            new Date(`${date}T00:00:00Z`),
          ),
        });
    }
    if (key === 'governorate') {
      const known = governorates.find((item) => GOVERNORATE_API_LABEL[item] === value);
      if (known) return govLabels(known);
    }
    const group =
      key === 'waterSource'
        ? 'waterSources'
        : key === 'irrigationMethod'
          ? 'irrigationMethods'
          : key === 'energySource'
            ? 'energySources'
            : null;
    return group ? (options as (key: string) => string)(`${group}.${value}`) : value;
  };
  const select = (
    key: 'irrigationMethod' | 'waterSource' | 'energySource',
    values: readonly string[],
    group: 'irrigationMethods' | 'waterSources' | 'energySources',
  ) => (
    <Select
      name={key}
      label={t(`fields.${key}`)}
      required={key === 'waterSource'}
      error={invalid && key === 'waterSource' && !data.waterSource ? t('required') : undefined}
      value={data[key]}
      onChange={(event) => update(key, event.target.value)}
      fieldStyle="form"
    >
      <option value="">{t('select')}</option>
      {values.map((value) => (
        <option key={value} value={value}>
          {(options as (key: string) => string)(`${group}.${value}`)}
        </option>
      ))}
    </Select>
  );
  const stepsNav = (
    <nav aria-label={t('title')} className="flex flex-col gap-4">
      {wizardSteps.map((key, index) => (
        <button
          key={key}
          type="button"
          disabled={pending || uploading}
          aria-current={step === index + 1 ? 'step' : undefined}
          onClick={() => go(index + 1)}
          className={`flex min-h-56 items-center gap-12 rounded-lg px-12 py-10 text-start ${step === index + 1 ? 'bg-bg-success-soft text-text-brand' : 'text-text-secondary'}`}
        >
          <span
            className={`flex size-32 shrink-0 items-center justify-center rounded-full border type-label-caption-strong ${visited.includes(index + 1) && step !== index + 1 ? 'border-brand-primary bg-brand-primary text-text-on-dark' : 'border-border-strong'}`}
          >
            {visited.includes(index + 1) && step !== index + 1 ? <Icon name="tick" size={16} /> : index + 1}
          </span>
          <span className="min-w-0">
            <span className="block type-label-small-strong">{t(`steps.${key}`)}</span>
            <span className="block type-label-caption text-text-muted">
              {step === index + 1 ? t('inProgress') : visited.includes(index + 1) ? t('complete') : t('notStarted')}
            </span>
          </span>
        </button>
      ))}
    </nav>
  );
  return (
    <div className="min-h-dvh bg-bg-page pb-64" data-testid="add-farm-wizard">
      <header className="border-b border-border-nav bg-bg-surface">
        <div className="mx-auto flex h-64 max-w-1312 items-center justify-between gap-12 px-16 tablet:h-78 tablet:px-40 desktop:px-0">
          <div className="flex min-w-0 items-center gap-16">
            <button
              type="button"
              onClick={() => setLeave(true)}
              aria-label={t('saveExit')}
              className="flex size-44 items-center justify-center tablet:hidden"
            >
              <Icon name="close" size={20} />
            </button>
            <span className="hidden tablet:block">
              <Logo height={40} />
            </span>
            <span className="flex flex-col gap-4 type-label-small-strong text-text-secondary">
              {t('title')}
              <span className="type-label-caption text-text-muted tablet:hidden">
                {pending
                  ? t('saving')
                  : submitted
                    ? t('successTitle')
                    : dirty
                      ? t('dirty')
                      : saved
                        ? t('saved')
                        : t('notSaved')}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-12">
            <span
              role="status"
              className="hidden rounded-full bg-bg-muted px-12 py-6 type-label-caption text-text-brand tablet:block"
            >
              {pending ? t('saving') : dirty ? t('dirty') : saved ? t('saved') : t('notSaved')}
            </span>
            <Link
              href="/my/messages"
              className="hidden min-h-44 items-center type-label-small-strong text-text-brand tablet:flex"
            >
              {t('help')}
            </Link>
            {!submitted && (
              <span className="hidden tablet:block">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || uploading || !canEdit || !locationReady}
                  onClick={() => void perform('exit')}
                >
                  {t('saveExit')}
                </Button>
              </span>
            )}
            {!submitted && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="tablet:hidden"
                disabled={pending || uploading || !canEdit || !locationReady}
                onClick={() => void perform('save')}
              >
                {t('save')}
              </Button>
            )}
          </div>
        </div>
      </header>
      <main>
        {submitted && listing ? (
          <div className="mx-auto max-w-780 px-16 py-40 tablet:py-64">
            <Card className="flex flex-col items-center gap-24 text-center tablet:p-48">
              <span className="flex size-80 items-center justify-center rounded-full border border-overlay-gold-hairline bg-bg-success-soft text-text-brand">
                <Icon name="tick" size={36} />
              </span>
              <p className="type-overline-field text-text-gold">{t('successTitle')}</p>
              <h1 className="type-heading-h3">{t('success')}</h1>
              <p className="type-body-default text-text-muted">{t('successNote')}</p>
              <div className="flex w-full flex-wrap items-center justify-between gap-16 rounded-lg bg-bg-muted p-16">
                <p className="type-label-large">{farm?.name}</p>
                <PortalStatus status={listing.status} />
              </div>
              <p className="type-body-caption text-text-muted">{listing.requestNumber}</p>
              <div className="flex w-full flex-col gap-12 tablet:flex-row tablet:justify-center">
                <ButtonLink href={`/my/requests/${listing.id}`} variant="primary">
                  {t('track')}
                </ButtonLink>
                <ButtonLink href="/my" variant="outline">
                  {t('portal')}
                </ButtonLink>
              </div>
            </Card>
          </div>
        ) : (
          <div className="mx-auto grid max-w-1312 items-start gap-24 px-16 py-24 tablet:grid-cols-[minmax(0,1fr)_240px] tablet:px-40 tablet:py-40 desktop:grid-cols-[296px_minmax(0,1fr)_264px] desktop:gap-48 desktop:px-0">
            <aside className="hidden desktop:col-start-1 desktop:row-start-1 desktop:block">
              <Card padding="sm">
                <p className="type-overline-field text-text-gold">{t('title')}</p>
                <p className="mb-20 mt-8 type-label-large wrap-anywhere">{data.name || t('untitled')}</p>
                {stepsNav}
                <p className="mt-24 border-t border-border-subtle pt-20 type-label-caption-strong text-text-muted">
                  {t('stepsComplete', { n: visited.length })}
                </p>
                <p className="mt-16 type-label-caption text-text-muted">{t('private')}</p>
              </Card>
            </aside>
            <div className="min-w-0 tablet:col-start-1 tablet:row-start-1 desktop:col-start-2">
              <div className="mb-24 flex flex-col gap-12">
                <div className="flex items-center justify-between gap-16">
                  <p className="type-overline-field text-text-gold">{t('step', { n: step })}</p>
                  <details className="relative desktop:hidden">
                    <summary
                      aria-label={t('allSteps')}
                      className="flex size-36 cursor-pointer list-none items-center justify-center rounded-full text-text-brand"
                    >
                      <Icon name="menu" size={20} />
                    </summary>
                    <div className="absolute end-0 top-40 z-20 w-280 rounded-card border border-border-hairline bg-bg-surface p-12 shadow-premium-rest">
                      {stepsNav}
                    </div>
                  </details>
                </div>
                <h1 className="type-heading-h3">
                  <span className="tablet:hidden">{t(`steps.${current}`)}</span>
                  <span className="hidden tablet:inline">{t(`headings.${current}`)}</span>
                </h1>
                <div className="grid grid-cols-7 gap-4 desktop:hidden" aria-hidden="true">
                  {wizardSteps.map((key, index) => (
                    <span
                      key={key}
                      className={`h-4 rounded-full ${index < step ? 'bg-brand-primary' : 'bg-border-subtle'}`}
                    />
                  ))}
                </div>
                <p className="type-body-default text-text-muted">{t(`intros.${current}`)}</p>
              </div>
              {!canEdit && (
                <p className="mb-24 rounded-lg border border-overlay-gold-hairline bg-bg-notice p-16 type-body-caption">
                  {t('readOnly')}
                </p>
              )}
              {listing?.reviews
                .filter((review) => review.comment)
                .map((review, index) => (
                  <p
                    key={index}
                    className="mb-16 rounded-lg border border-overlay-gold-hairline bg-bg-notice p-16 type-body-caption"
                  >
                    <strong className="mb-8 block">{t('feedback')}</strong>
                    {review.comment}
                  </p>
                ))}
              <fieldset disabled={!canEdit || pending} className="min-w-0" aria-busy={pending}>
                <div hidden={step !== 1}>
                  <div className="flex flex-col gap-24">
                    <WizardCard icon="tree" title={t('about')} description={t('aboutNote')}>
                      {text('name', { required: true, maxLength: 200 })}
                      <fieldset>
                        <legend className="mb-8 type-label-form">{t('fields.farmType')}</legend>
                        <div className="grid grid-cols-2 gap-12">
                          {farmTypes.map((type) => (
                            <label
                              key={type}
                              className={`flex min-h-52 cursor-pointer items-center justify-between gap-12 rounded-lg border p-12 type-label-small-strong ${invalid && !data.farmType ? 'border-status-favorite' : data.farmType === type ? 'border-brand-primary bg-bg-selected text-text-brand' : 'border-border-hairline'}`}
                            >
                              <span className="flex items-center gap-8">
                                <Icon name="tree" size={18} className="hidden tablet:block" />
                                {t(`types.${type}`)}
                              </span>
                              <input
                                type="radio"
                                name="farmType"
                                value={type}
                                checked={data.farmType === type}
                                onChange={() => update('farmType', type)}
                                className="size-18 accent-brand-primary"
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      {text('mainActivity', { maxLength: 255 })}
                    </WizardCard>
                    <WizardCard icon="area" title={t('size')} description={t('sizeNote')}>
                      {text('areaFeddan', {
                        required: true,
                        type: 'number',
                        min: 0.01,
                        max: 9999999999.99,
                        step: '.01',
                      })}
                      {select('irrigationMethod', irrigationMethods, 'irrigationMethods')}
                    </WizardCard>
                  </div>
                </div>
                <div hidden={step !== 2}>
                  <div className="flex flex-col gap-24">
                    <WizardCard icon="location-pin" title={t('locationCard')}>
                      <div className="grid gap-24 tablet:grid-cols-2">
                        <div className="flex min-w-0 flex-col gap-16">
                          <Select
                            label={t('fields.governorate')}
                            name="governorate"
                            value={customGovernorate ? '__other' : data.governorate}
                            required
                            fieldStyle="form"
                            onChange={(event) => {
                              const custom = event.target.value === '__other';
                              setCustomGovernorate(custom);
                              update('governorate', custom ? '' : event.target.value);
                            }}
                          >
                            <option value="">{t('select')}</option>
                            {governorates.map((key) => (
                              <option key={key} value={GOVERNORATE_API_LABEL[key]}>
                                {govLabels(key)}
                              </option>
                            ))}
                            <option value="__other">{t('otherGovernorate')}</option>
                          </Select>
                          {customGovernorate && text('governorate', { required: true, maxLength: 120 })}
                        </div>
                        {text('areaName', { maxLength: 120 })}
                      </div>
                      {step === 2 && (
                        <FarmLocationMap
                          pin={pin}
                          disabled={!canEdit || pending || !locationReady}
                          onChange={(value) => {
                            setPin(value);
                            setPinDirty(true);
                            setLocationDirty(true);
                            setDirty(true);
                            setSaved(false);
                          }}
                        />
                      )}
                      {!locationReady && (
                        <p className="type-body-caption text-text-muted" role="status">
                          {t(locationError ? 'locationLoadError' : 'locationLoading')}
                        </p>
                      )}
                      {locationError && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setLocationError(false);
                            setLocationRetry((value) => value + 1);
                          }}
                        >
                          {t('retryLocation')}
                        </Button>
                      )}
                      <p className="type-body-caption text-text-muted">{t('privatePinNote')}</p>
                    </WizardCard>
                    <WizardCard icon="location-pin" title={t('access')} description={t('accessNote')}>
                      <TextInput
                        label={t('nearestRoad')}
                        name="nearestMainRoad"
                        value={data.nearestMainRoad}
                        onChange={(event) => update('nearestMainRoad', event.target.value)}
                        maxLength={255}
                        disabled={!canEdit || pending || !locationReady}
                        fieldStyle="form"
                      />
                      <TextInput
                        label={t('roadDistance')}
                        name="roadDistanceKm"
                        value={data.roadDistanceKm}
                        onChange={(event) => update('roadDistanceKm', event.target.value)}
                        min={0}
                        step="any"
                        disabled={!canEdit || pending || !locationReady}
                        type="number"
                        fieldStyle="form"
                      />
                    </WizardCard>
                    <WizardDisclosure icon="layer" title={t('land')} description={t('landNote')}>
                      {text('soilType', { maxLength: 120 })}
                      <TextArea
                        label={t('fields.farmDescription')}
                        name="farmDescription"
                        value={data.farmDescription}
                        onChange={(event) => update('farmDescription', event.target.value)}
                        maxLength={5000}
                        rows={4}
                        fieldStyle="form"
                      />
                    </WizardDisclosure>
                  </div>
                </div>
                <div hidden={step !== 3}>
                  <div className="flex flex-col gap-24">
                    <WizardCard icon="drop" title={t('water')}>
                      {select('waterSource', waterSources, 'waterSources')}
                    </WizardCard>
                    {farm && (
                      <div>
                        <FarmFacilitiesPanel
                          farmId={farm.id}
                          canEdit={canEdit && !pending}
                          onPendingChange={setFacilityPending}
                          onLoaded={setFacilities}
                          amenities={
                            <fieldset
                              disabled={!canEdit || pending || (Boolean(initialFarm) && initialSpecification === null)}
                            >
                              <legend className="mb-12 type-label-form">{t('onFarm')}</legend>
                              <div className="grid grid-cols-2 gap-12">
                                {amenityKeys.map((key) => (
                                  <label
                                    key={key}
                                    className={`flex min-h-56 cursor-pointer items-center gap-8 rounded-lg border p-12 type-label-small-strong ${amenities.includes(key) ? 'border-brand-primary bg-bg-selected text-text-brand' : 'border-border-hairline'}`}
                                  >
                                    <Icon name={amenityIcons[key]} size={18} className="hidden shrink-0 tablet:block" />
                                    <span className="min-w-0 flex-1">{t(`amenities.${key}`)}</span>
                                    <input
                                      type="checkbox"
                                      name="amenities"
                                      value={key}
                                      checked={amenities.includes(key)}
                                      className="size-18 shrink-0 accent-brand-primary"
                                      onChange={(event) => {
                                        setAmenities((old) =>
                                          event.target.checked ? [...old, key] : old.filter((value) => value !== key),
                                        );
                                        setSpecDirty(true);
                                        setDirty(true);
                                        setSaved(false);
                                      }}
                                    />
                                  </label>
                                ))}
                              </div>
                            </fieldset>
                          }
                        />
                      </div>
                    )}
                    <WizardDisclosure icon="tree" title={t('production')} description={t('productionNote')}>
                      {initialFarm && initialSpecification === null ? (
                        <p className="type-body-caption text-text-muted">{t('productionUnavailable')}</p>
                      ) : (
                        <>
                          <fieldset>
                            <legend className="mb-12 type-label-form">{t('fields.cropTypes')}</legend>
                            <div className="grid grid-cols-2 gap-12">
                              {cropTypes.map((type) => (
                                <label
                                  key={type}
                                  className="flex items-center gap-8 rounded-lg border border-border-hairline p-12 type-body-caption"
                                >
                                  <input
                                    type="checkbox"
                                    checked={crops.includes(type)}
                                    onChange={(event) => {
                                      setCrops((old) =>
                                        event.target.checked ? [...old, type] : old.filter((value) => value !== type),
                                      );
                                      setDirty(true);
                                      setSaved(false);
                                      setSpecDirty(true);
                                    }}
                                    className="size-18 accent-brand-primary"
                                  />
                                  {options(`cropTypes.${type}`)}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          {text('currentProduction', { maxLength: 1000 })}
                          {text('harvestSeasons', { maxLength: 300 })}
                          {text('notes', { maxLength: 1000 })}
                        </>
                      )}
                    </WizardDisclosure>
                    <WizardDisclosure icon="verify-filled" title={t('highlights')} description={t('highlightsNote')}>
                      {(['highlight1', 'highlight2', 'highlight3'] as const).map((key) =>
                        text(key, { maxLength: 200 }),
                      )}
                    </WizardDisclosure>
                  </div>
                </div>
                <div hidden={step !== 4}>
                  <div className="flex flex-col gap-24">
                    <WizardCard icon="category" title={t('purpose')}>
                      <div className="grid grid-cols-2 gap-16">
                        {(['sale', 'rent'] as const).map((type) => (
                          <label
                            key={type}
                            className={`flex cursor-pointer flex-col gap-16 rounded-card border p-20 ${data.listingType === type ? 'border-brand-primary bg-bg-selected' : 'border-border-hairline'}`}
                          >
                            <span className="flex justify-between">
                              <Icon name={type === 'sale' ? 'building' : 'clipboard-tick'} size={24} />
                              <input
                                type="radio"
                                name="listingType"
                                checked={data.listingType === type}
                                onChange={() => update('listingType', type)}
                                className="size-18 accent-brand-primary"
                              />
                            </span>
                            <span className="type-heading-h4">{t(type)}</span>
                            <span className="type-body-caption text-text-muted">
                              {t(type === 'sale' ? 'saleNote' : 'rentNote')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </WizardCard>
                    <WizardCard icon="document-text" title={t('pricing')}>
                      {data.listingType === 'sale' ? (
                        <>
                          {text('askingPrice', { type: 'number', min: 1, step: '1' })}
                          {text('statedSalePricePerFeddan', { type: 'number', min: 1, step: '1' })}
                        </>
                      ) : (
                        text('annualRentPerFeddan', { type: 'number', min: 1, step: '1' })
                      )}
                      <p className="rounded-lg border border-overlay-gold-hairline bg-bg-notice p-16 type-body-caption">
                        {t('pricesNote')}
                      </p>
                    </WizardCard>
                    <WizardCard icon="clipboard-tick" title={t('availability')}>
                      <fieldset>
                        <legend className="mb-12 type-label-form">{t('fields.availability')}</legend>
                        <div className="grid grid-cols-2 gap-12">
                          {availabilityChoices.map((value, index) => (
                            <label
                              key={value}
                              className={`flex min-h-56 cursor-pointer items-center gap-8 rounded-lg border p-12 type-label-small-strong ${data.availability === value || (index === 1 && storedAvailabilityDate(data.availability)) ? 'border-brand-primary bg-bg-selected text-text-brand' : 'border-border-hairline'}`}
                            >
                              <input
                                type="radio"
                                name="availability"
                                value={value}
                                checked={
                                  data.availability === value ||
                                  (index === 1 && Boolean(storedAvailabilityDate(data.availability)))
                                }
                                onChange={() =>
                                  update(
                                    'availability',
                                    index === 1 && availabilityDate ? `From ${availabilityDate}` : value,
                                  )
                                }
                                className="size-18 shrink-0 accent-brand-primary"
                              />
                              {t(index === 0 ? 'availableNow' : 'availableLater')}
                            </label>
                          ))}
                        </div>
                        {(data.availability === 'From a later date' || storedAvailabilityDate(data.availability)) && (
                          <TextInput
                            className="mt-16 min-w-0"
                            name="availabilityDate"
                            label={t('availableFrom')}
                            type="date"
                            value={availabilityDate}
                            required
                            fieldStyle="form"
                            error={invalid && !availabilityDate ? t('required') : undefined}
                            onChange={(event) => {
                              setAvailabilityDate(event.target.value);
                              update(
                                'availability',
                                event.target.value ? `From ${event.target.value}` : 'From a later date',
                              );
                            }}
                          />
                        )}
                        {data.availability &&
                          !(availabilityChoices as readonly string[]).includes(data.availability) &&
                          !storedAvailabilityDate(data.availability) && (
                            <p className="mt-12 type-body-caption text-text-muted">
                              {t('recordedAvailability', { value: data.availability })}
                            </p>
                          )}
                      </fieldset>
                    </WizardCard>
                    <WizardCard icon="document-text" title={t('description')}>
                      <TextArea
                        label={t('fields.listingDescription')}
                        name="listingDescription"
                        value={data.listingDescription}
                        onChange={(event) => update('listingDescription', event.target.value)}
                        rows={5}
                        maxLength={8000}
                        fieldStyle="form"
                      />
                    </WizardCard>
                  </div>
                </div>
              </fieldset>
              {step === 7 && (
                <div className="mt-24 flex flex-col gap-24">
                  {[1, 2, 3, 4].map((section) => (
                    <Card key={section} className="flex flex-col gap-16">
                      <div className="flex items-center justify-between gap-16">
                        <h3 className="type-label-large">{t(`steps.${wizardSteps[section - 1]!}`)}</h3>
                        <Button type="button" variant="ghost" size="sm" onClick={() => go(section)}>
                          {t('edit')}
                        </Button>
                      </div>
                      <dl className="flex flex-col">
                        {(section === 1
                          ? ['name', 'farmType', 'mainActivity', 'areaFeddan', 'irrigationMethod']
                          : section === 2
                            ? [
                                'governorate',
                                'areaName',
                                'nearestMainRoad',
                                'roadDistanceKm',
                                'soilType',
                                'farmDescription',
                              ]
                            : section === 3
                              ? [
                                  'waterSource',
                                  'currentProduction',
                                  'harvestSeasons',
                                  'notes',
                                  'highlight1',
                                  'highlight2',
                                  'highlight3',
                                ]
                              : [
                                  ...(data.listingType === 'sale'
                                    ? ['askingPrice', 'statedSalePricePerFeddan']
                                    : ['annualRentPerFeddan']),
                                  'availability',
                                  'listingDescription',
                                ]
                        ).map((key) => (
                          <div
                            key={key}
                            className="grid grid-cols-2 gap-16 border-t border-border-hairline py-12 type-body-caption"
                          >
                            <dt className="text-text-muted">
                              {t(`fields.${key as Exclude<keyof typeof data, 'listingType'>}`)}
                            </dt>
                            <dd className="wrap-anywhere text-end text-text-primary">
                              {displayValue(key as keyof typeof data)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {section === 3 && (
                        <dl className="flex flex-col">
                          <div className="grid grid-cols-2 gap-16 border-t border-border-hairline py-12 type-body-caption">
                            <dt className="text-text-muted">{t('onFarm')}</dt>
                            <dd className="wrap-anywhere text-end text-text-primary">
                              {amenities.length
                                ? amenities
                                    .map((key) => (t as (value: string) => string)(`amenities.${key}`))
                                    .join(', ')
                                : t('notStated')}
                            </dd>
                          </div>
                          <div className="grid grid-cols-2 gap-16 border-t border-border-hairline py-12 type-body-caption">
                            <dt className="text-text-muted">{t('fields.cropTypes')}</dt>
                            <dd className="text-end">
                              {initialFarm && initialSpecification === null
                                ? t('productionUnavailable')
                                : crops.length
                                  ? crops
                                      .map((type) => (options as (key: string) => string)('cropTypes.' + type))
                                      .join(', ')
                                  : t('notStated')}
                            </dd>
                          </div>
                          <div className="grid grid-cols-2 gap-16 border-t border-border-hairline py-12 type-body-caption">
                            <dt className="text-text-muted">{t('facilities')}</dt>
                            <dd className="wrap-anywhere text-end">
                              {facilities === null
                                ? t('facilitiesUnavailable')
                                : facilities.length
                                  ? facilities.map((item) => item.name).join(', ')
                                  : t('notStated')}
                            </dd>
                          </div>
                        </dl>
                      )}
                    </Card>
                  ))}
                  <p className="rounded-lg border border-overlay-gold-hairline bg-bg-notice p-16 type-body-caption">
                    {t('private')}
                  </p>
                </div>
              )}
              {!farm && step === 5 && (
                <p className="rounded-card bg-bg-surface p-24 type-body-default text-text-muted">{t('firstSave')}</p>
              )}
              {farm && (
                <div hidden={step !== 5 && step !== 7} className="mt-24">
                  <FarmMediaPanel
                    farmId={farm.id}
                    canUpload={canEdit && step === 5 && !pending}
                    onBusyChange={setMediaBusy}
                    onPendingChange={setMediaPending}
                  />
                  <p className="mt-16 type-body-caption text-text-muted">{t('noOrder')}</p>
                </div>
              )}
              {listing ? (
                <div hidden={step !== 6 && step !== 7} className="mt-24">
                  <RequestDocumentsPanel
                    requestId={listing.id}
                    canEdit={canEdit && step === 6 && !pending}
                    onBusyChange={setDocsBusy}
                    onPendingChange={setDocsPending}
                  />
                </div>
              ) : step === 6 ? (
                <p className="rounded-card bg-bg-surface p-24 type-body-default text-text-muted">{t('noRequest')}</p>
              ) : null}
              {error && (
                <p
                  role="alert"
                  className="mt-24 rounded-lg border border-status-favorite bg-bg-surface p-16 type-body-caption text-status-error"
                >
                  {error}
                </p>
              )}
              <div
                data-testid="wizard-actions"
                className="mt-24 flex items-start justify-between gap-12 border-t border-border-hairline pt-24"
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || uploading}
                  onClick={() => (step > 1 ? go(step - 1) : setLeave(true))}
                >
                  {t('back')}
                </Button>
                <p className="hidden max-w-240 self-center px-12 type-label-caption text-text-muted desktop:block">
                  {t('saveNote')}
                </p>
                <Button
                  type="button"
                  variant="primary"
                  className="min-w-0 flex-1 whitespace-normal tablet:flex-none"
                  disabled={pending || uploading || (!locationReady && step > 1) || (!canEdit && step === 7)}
                  onClick={() => (canEdit ? void perform(step === 7 ? 'submit' : 'next') : go(Math.min(7, step + 1)))}
                >
                  {pending
                    ? step === 7
                      ? t('submitting')
                      : t('saving')
                    : step === 7
                      ? listing?.status === 'changesRequested'
                        ? t('resubmit')
                        : t('submit')
                      : t('continue')}
                  <Icon name="arrow-right" size={18} className="shrink-0" />
                </Button>
              </div>
            </div>
            <aside className="hidden min-w-0 flex-col gap-24 tablet:col-start-2 tablet:row-start-1 tablet:flex desktop:col-start-3">
              <Card tone="light" surface="muted" className="border-overlay-gold-hairline">
                <Icon name="verify-filled" size={28} className="mb-16 text-text-gold" />
                <h2 className="type-label-large">{t('reviewed')}</h2>
                <p className="mt-12 type-body-caption text-text-muted">{t('reviewNote')}</p>
              </Card>
              <Card>
                <p className="mb-16 type-overline-field text-text-muted">{t('listingAs')}</p>
                <div className="flex items-center gap-12">
                  <Avatar initials={toNavbarUser(user).initials} />
                  <p className="type-label-small-strong wrap-anywhere">{user.fullName ?? user.mobileE164}</p>
                </div>
                <p className="mt-12 type-label-caption text-text-muted">{t('accountNote')}</p>
              </Card>
              <Card>
                <h2 className="type-overline-field text-text-brand">{t('why')}</h2>
                <p className="mt-16 type-body-caption text-text-muted">{t('whyNote')}</p>
              </Card>
            </aside>
          </div>
        )}
      </main>
      <SubmissionProgress open={submitting} />
      <Dialog open={leave} onOpenChange={setLeave} title={t('leaveTitle')} description={t('leaveBody')}>
        {error && (
          <p role="alert" className="type-body-caption text-status-error">
            {error}
          </p>
        )}
        <Button
          type="button"
          variant="primary"
          disabled={pending || uploading || !canEdit || !locationReady}
          onClick={() => void perform('exit')}
        >
          {t('saveLeave')}
        </Button>
        <Button type="button" variant="outline" onClick={() => setLeave(false)}>
          {t('keepEditing')}
        </Button>
      </Dialog>
    </div>
  );
}
