'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextArea, TextInput } from '@/components/ui/Field';
import { Card } from '@/components/ui/Surface';
import { PortalHeading, PortalStatus } from '@/features/my-farmexit/PortalUI';
import { TaskFrame, Choice } from '@/features/phase7/TaskFrame';
import { useFormReady } from '@/features/phase7/useFormReady';
import { WizardCard } from '@/features/my-farms/WizardCard';
import { WizardDisclosure } from '@/features/my-farms/WizardDisclosure';
import { jsonRequest } from '@/features/my-farms/types';
import { farmTypes, managementTypes } from '@/lib/domain/enums';
import { VerificationRequestDetail, type VerificationRequest } from './VerificationRequestDetail';
export type Expertise = { expertiseType: string; expertiseValue: string };
export type Capability = {
  id: string;
  professionalType: string;
  verificationStatus: string;
  verifiedAt: string | null;
  notApprovedReason: string | null;
  expertise?: Expertise[];
  serviceAreas: string[];
};
export type ProfessionalProfile = {
  id: string;
  headline: string | null;
  bio: string | null;
  baseGovernorate: string | null;
  yearsExperience: number | null;
  experienceSummary: string | null;
  capabilities: Capability[];
};
const types = ['farmManager', 'agriculturalEngineer'] as const;
export function ProfessionalHub({
  initial,
  name,
  initialStep,
}: {
  initial: ProfessionalProfile | null;
  name?: string | null;
  initialStep?: number;
}) {
  const t = useTranslations('workspace.professional'),
    w = useTranslations('workspace.phase7'),
    m = useTranslations('workspace.management');
  const [profile, setProfile] = useState(initial),
    [editing, setEditing] = useState(!initial || initialStep !== undefined),
    [step, setStep] = useState(Math.max(1, Math.min(3, initialStep ?? 1))),
    [selected, setSelected] = useState(initial?.capabilities[0]?.professionalType ?? 'farmManager'),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [saved, setSaved] = useState(!!initial),
    [request, setRequest] = useState<VerificationRequest | null>(null);
  const busy = useRef(false);
  const [data, setData] = useState({
    headline: initial?.headline ?? '',
    bio: initial?.bio ?? '',
    baseGovernorate: initial?.baseGovernorate ?? '',
    yearsExperience: initial?.yearsExperience?.toString() ?? '',
    experienceSummary: initial?.experienceSummary ?? '',
  });
  const capability = profile?.capabilities.find((c) => c.professionalType === selected);
  const [expertise, setExpertise] = useState<Expertise[]>(capability?.expertise ?? []),
    [areas, setAreas] = useState((capability?.serviceAreas ?? []).join(', '));
  const router = useRouter();
  const ready = useFormReady();
  const steps = ([1, 2, 3, 4, 5] as const).map((i) => w(`professionalSteps.s${i}`));
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (!saved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [saved]);
  function changeType(type: string) {
    setSelected(type);
    const c = profile?.capabilities.find((c) => c.professionalType === type);
    setExpertise(c?.expertise ?? []);
    setAreas((c?.serviceAreas ?? []).join(', '));
    setSaved(false);
  }
  function update(key: keyof typeof data, value: string) {
    setData((old) => ({ ...old, [key]: value }));
    setSaved(false);
  }
  function toggle(group: string, value: string) {
    setExpertise((old) =>
      old.some((e) => e.expertiseType === group && e.expertiseValue === value)
        ? old.filter((e) => e.expertiseType !== group || e.expertiseValue !== value)
        : [...old, { expertiseType: group, expertiseValue: value }],
    );
    setSaved(false);
  }
  function expertiseLabel(item: Expertise) {
    const key =
      item.expertiseType === 'farmActivity'
        ? `farmTypes.${item.expertiseValue}`
        : item.expertiseType === 'areaOfExpertise'
          ? `expertiseLabels.${item.expertiseValue}`
          : null;
    if (key && (w.has as (key: string) => boolean)(key)) return (w as (key: string) => string)(key);
    if (
      item.expertiseType === 'managementType' &&
      managementTypes.includes(item.expertiseValue as (typeof managementTypes)[number])
    )
      return (m as (key: string) => string)(`managementTypeLabels.${item.expertiseValue}`);
    return item.expertiseValue;
  }
  function go(n: number) {
    if (n > 3) {
      setError(w('profileFirst'));
      return;
    }
    setStep(n);
    window.scrollTo(0, 0);
  }
  async function save(exit = false) {
    if (busy.current || !ready) return;
    if (
      data.yearsExperience !== '' &&
      (!Number.isInteger(Number(data.yearsExperience)) ||
        Number(data.yearsExperience) < 0 ||
        Number(data.yearsExperience) > 80)
    ) {
      setError(w('invalidExperience'));
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      let current = profile;
      let c = current?.capabilities.find((c) => c.professionalType === selected);
      if (!c) {
        current = await jsonRequest<ProfessionalProfile>('/api/professional-profile/capabilities', 'POST', {
          professionalType: selected,
        });
        setProfile(current);
        c = current.capabilities.find((c) => c.professionalType === selected);
        if (!c) throw new Error('confirmation');
      }
      if (step >= 2 || exit) {
        current = await jsonRequest<ProfessionalProfile>('/api/professional-profile', 'PUT', {
          ...data,
          yearsExperience: data.yearsExperience === '' ? undefined : Number(data.yearsExperience),
        });
        setProfile(current);
      }
      if ((step >= 3 || exit) && c.verificationStatus !== 'verified') {
        const serviceAreas = areas
          .split(/[,،]/)
          .map((v) => v.trim())
          .filter(Boolean);
        if (serviceAreas.length > 30 || serviceAreas.some((v) => v.length > 120) || expertise.length > 40)
          throw new Error('limits');
        current = await jsonRequest<ProfessionalProfile>(`/api/professional-profile/capabilities/${c.id}`, 'PATCH', {
          expertise,
          serviceAreas,
        });
        setProfile(current);
      }
      setSaved(true);
      if (exit) {
        setEditing(false);
        return;
      }
      if (step < 3) {
        setStep(step + 1);
        window.scrollTo(0, 0);
        return;
      }
      if (c.verificationStatus === 'verified') {
        setEditing(false);
        return;
      }
      const rows = await jsonRequest<{ items: VerificationRequest[] }>(
        '/api/professional-verification-requests?page=1&pageSize=50',
      );
      const active = rows.items.find(
        (r) => r.professionalCapabilityId === c.id && ['draft', 'changesRequested', 'underReview'].includes(r.status),
      );
      const verification =
        active ??
        (await jsonRequest<VerificationRequest>('/api/professional-verification-requests', 'POST', {
          professionalCapabilityId: c.id,
        }));
      if (!verification?.id || !verification.requestNumber) throw new Error('confirmation');
      setRequest(verification);
    } catch {
      setError(t('saveError'));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  if (request) return <VerificationRequestDetail initial={request} />;
  if (!editing && profile)
    return (
      <div data-testid="professional-hub" className="flex flex-col gap-24">
        <PortalHeading
          title={t('title')}
          description={t('intro')}
          action={
            <ButtonLink href="/my/professional/verification" variant="outline">
              {t('verificationList')}
            </ButtonLink>
          }
        />
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-16">
            <h3 className="type-heading-h4">{w('professionalDetails')}</h3>
            <Button
              variant="outline"
              onClick={() => {
                setStep(2);
                setEditing(true);
              }}
            >
              {w('edit')}
            </Button>
          </div>
          <dl className="mt-24 flex flex-col gap-16">
            {[
              [t('headline'), profile.headline],
              [t('baseGovernorate'), profile.baseGovernorate],
              [t('yearsExperience'), profile.yearsExperience?.toString()],
              [t('bio'), profile.bio],
              [t('experienceSummary'), profile.experienceSummary],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-2 gap-16 border-b border-border-subtle pb-12 type-body-caption"
              >
                <dt className="text-text-muted">{label}</dt>
                <dd className="wrap-anywhere whitespace-pre-line">{value || w('notProvided')}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <h3 className="type-heading-h4">{t('capabilitiesTitle')}</h3>
          <ul className="mt-24 grid gap-16 tablet:grid-cols-2">
            {profile.capabilities.map((c) => (
              <li key={c.id} className="flex min-w-0 flex-col gap-16 rounded-card border border-border-subtle p-20">
                <h4 className="type-label-large">{(t as (key: string) => string)(`types.${c.professionalType}`)}</h4>
                <PortalStatus status={c.verificationStatus} />
                {c.notApprovedReason && <p className="type-body-caption">{c.notApprovedReason}</p>}
                <p className="type-body-caption text-text-muted">{c.serviceAreas.join(', ') || w('notProvided')}</p>
                {c.expertise?.length ? (
                  <ul className="flex flex-wrap gap-8">
                    {c.expertise.map((e, i) => (
                      <li key={i} className="rounded-full bg-bg-muted px-12 py-6 type-label-caption">
                        {expertiseLabel(e)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {c.verificationStatus !== 'verified' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      changeType(c.professionalType);
                      setStep(3);
                      setEditing(true);
                    }}
                  >
                    {t('startVerification')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-24 flex flex-wrap gap-12">
            {types
              .filter((type) => !profile.capabilities.some((c) => c.professionalType === type))
              .map((type) => (
                <Button
                  key={type}
                  variant="outline"
                  onClick={() => {
                    changeType(type);
                    setStep(1);
                    setEditing(true);
                  }}
                >
                  {t(type === 'farmManager' ? 'addFarmManager' : 'addEngineer')}
                </Button>
              ))}
          </div>
        </Card>
      </div>
    );
  return (
    <TaskFrame
      heading={(w as (key: string) => string)(`headings.p${step}`)}
      intro={w('professionalIntro')}
      title={w('professionalTitle')}
      context={name ?? undefined}
      professional
      steps={steps}
      step={step}
      onStep={go}
      pending={pending || !ready}
      saved={saved}
      onSaveExit={() => void save(true)}
      actions={
        <>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => (step > 1 ? go(step - 1) : profile ? setEditing(false) : router.push('/my'))}
          >
            {w('back')}
          </Button>
          <Button disabled={pending} onClick={() => void save()}>
            {pending ? w('saving') : w('continue')}
          </Button>
        </>
      }
    >
      <div data-testid="professional-wizard" className="flex flex-col gap-24">
        <fieldset disabled={pending || !ready} className="min-w-0">
          <div hidden={step !== 1}>
            <WizardCard icon="user" title={steps[0]!}>
              <div className="grid grid-cols-2 gap-16">
                {types.map((type) => (
                  <Choice
                    key={type}
                    big
                    type="radio"
                    name="professionalType"
                    value={type}
                    label={t(`types.${type}`)}
                    description={w(`needDescriptions.${type}`)}
                    checked={selected === type}
                    onChange={() => changeType(type)}
                  />
                ))}
              </div>
              <p className="type-body-caption text-text-muted">{w('capabilityNote')}</p>
            </WizardCard>
          </div>
          <div hidden={step !== 2} className="flex flex-col gap-24">
            <WizardCard icon="user" title={w('aboutYou')}>
              {name && <TextInput label={w('fullName')} value={name} readOnly fieldStyle="form" />}
              <TextInput
                label={t('headline')}
                name="headline"
                maxLength={255}
                value={data.headline}
                onChange={(e) => update('headline', e.target.value)}
                fieldStyle="form"
              />
              <TextInput
                label={t('baseGovernorate')}
                name="baseGovernorate"
                maxLength={120}
                value={data.baseGovernorate}
                onChange={(e) => update('baseGovernorate', e.target.value)}
                fieldStyle="form"
              />
              <TextArea
                label={t('bio')}
                name="bio"
                maxLength={8000}
                rows={4}
                value={data.bio}
                onChange={(e) => update('bio', e.target.value)}
                fieldStyle="form"
              />
            </WizardCard>
            <WizardCard icon="verify-filled" title={w('experience')}>
              <TextInput
                label={t('yearsExperience')}
                name="yearsExperience"
                type="number"
                min={0}
                max={80}
                step={1}
                value={data.yearsExperience}
                onChange={(e) => update('yearsExperience', e.target.value)}
                fieldStyle="form"
              />
              <TextArea
                label={t('experienceSummary')}
                name="experienceSummary"
                maxLength={8000}
                rows={4}
                value={data.experienceSummary}
                onChange={(e) => update('experienceSummary', e.target.value)}
                fieldStyle="form"
              />
            </WizardCard>
          </div>
          <div hidden={step !== 3} className="flex flex-col gap-24">
            <WizardCard icon="tree" title={w('farmActivity')}>
              <div className="grid grid-cols-2 gap-12">
                {farmTypes.map((value) => (
                  <Choice
                    key={value}
                    name="farmActivity"
                    value={value}
                    label={w(`farmTypes.${value}`)}
                    checked={expertise.some((e) => e.expertiseType === 'farmActivity' && e.expertiseValue === value)}
                    disabled={capability?.verificationStatus === 'verified'}
                    onChange={() => toggle('farmActivity', value)}
                  />
                ))}
              </div>
              <TextInput
                label={w('cropExpertise')}
                name="cropExpertise"
                maxLength={150}
                value={expertise.find((e) => e.expertiseType === 'cropExpertise')?.expertiseValue ?? ''}
                disabled={capability?.verificationStatus === 'verified'}
                fieldStyle="form"
                onChange={(event) => {
                  const value = event.target.value;
                  setExpertise((old) => [
                    ...old.filter((e) => e.expertiseType !== 'cropExpertise'),
                    ...(value ? [{ expertiseType: 'cropExpertise', expertiseValue: value }] : []),
                  ]);
                  setSaved(false);
                }}
              />
            </WizardCard>
            <WizardCard icon="category" title={w('offeredManagement')}>
              <div className="grid grid-cols-2 gap-12">
                {managementTypes.map((value) => (
                  <Choice
                    key={value}
                    name="managementType"
                    value={value}
                    label={m(`managementTypeLabels.${value}`)}
                    checked={expertise.some((e) => e.expertiseType === 'managementType' && e.expertiseValue === value)}
                    disabled={capability?.verificationStatus === 'verified'}
                    onChange={() => toggle('managementType', value)}
                  />
                ))}
              </div>
              <fieldset>
                <legend className="mb-12 type-label-form">{w('expertise')}</legend>
                <div className="grid grid-cols-2 gap-12">
                  {(selected === 'agriculturalEngineer'
                    ? ([
                        'dripIrrigation',
                        'soilFertilisation',
                        'greenhouses',
                        'productionPlanning',
                        'cropProtection',
                      ] as const)
                    : ([
                        'dripIrrigation',
                        'soilFertilisation',
                        'farmOperations',
                        'teamManagement',
                        'greenhouses',
                      ] as const)
                  ).map((value) => (
                    <Choice
                      key={value}
                      name="areaOfExpertise"
                      value={value}
                      label={w(`expertiseLabels.${value}`)}
                      checked={expertise.some(
                        (e) => e.expertiseType === 'areaOfExpertise' && e.expertiseValue === value,
                      )}
                      disabled={capability?.verificationStatus === 'verified'}
                      onChange={() => toggle('areaOfExpertise', value)}
                    />
                  ))}
                </div>
              </fieldset>
            </WizardCard>
            <WizardCard icon="location-pin" title={w('serviceAreas')}>
              <TextInput
                label={w('governorates')}
                name="serviceAreas"
                value={areas}
                onChange={(e) => {
                  setAreas(e.target.value);
                  setSaved(false);
                }}
                fieldStyle="form"
                disabled={capability?.verificationStatus === 'verified'}
              />
              <p className="type-body-caption text-text-muted">{w('areasHint')}</p>
              {capability?.verificationStatus === 'verified' && (
                <p className="type-body-caption text-text-muted">{w('verifiedLocked')}</p>
              )}
            </WizardCard>
            <WizardDisclosure icon="calendar" title={w('workingPreferences')} description={w('workingPreferencesNote')}>
              <p className="type-body-caption text-text-muted">{w('preferencesUnavailable')}</p>
            </WizardDisclosure>
          </div>
        </fieldset>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-status-error bg-bg-surface p-16 type-body-caption text-status-error"
          >
            {error}
          </p>
        )}
      </div>
    </TaskFrame>
  );
}
