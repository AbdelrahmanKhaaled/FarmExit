'use client';
import { BilingualFields } from '@/components/content/BilingualFields';
import { contentText, type LocalizedContent } from '@/lib/content/localized';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Select, TextArea, TextInput } from '@/components/ui/Field';
import { Card } from '@/components/ui/Surface';
import { Icon } from '@/components/icons/Icon';
import { Dialog } from '@/components/overlay/Dialog';
import { TaskFrame, Choice } from '@/features/phase7/TaskFrame';
import { useFormReady } from '@/features/phase7/useFormReady';
import { WizardCard } from '@/features/my-farms/WizardCard';
import { RequestDocumentsPanel } from '@/features/my-farms/RequestDocumentsPanel';
import { FarmFacilitiesPanel } from '@/features/my-farms/FarmFacilitiesPanel';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { jsonRequest } from '@/features/my-farms/types';
import { managementTypes } from '@/lib/domain/enums';
import type { ManagementRequest } from './ManagementRequestDetail';
import type { Farm } from '@/features/my-farms/types';
import { managementGoals, managementChallenges, formatManagementChoices } from '@/features/phase7/reference-options';
export type ManagementFarmOption = Pick<Farm, 'id' | 'name'> &
  Partial<Pick<Farm, 'governorate' | 'areaName' | 'areaFeddan' | 'farmType' | 'waterSource' | 'irrigationMethod'>>;

export function ManagementWizard({
  farms,
  initialFarmId,
  initial,
  initialStep = 1,
}: {
  farms: ManagementFarmOption[];
  initialFarmId?: string;
  initial?: ManagementRequest;
  initialStep?: number;
}) {
  const t = useTranslations('workspace.management'),
    w = useTranslations('workspace.phase7'),
    locale = useLocale(),
    router = useRouter();
  const [localizedContent, setLocalizedContent] = useState<LocalizedContent>(initial?.localizedContent ?? {});
  const [req, setReq] = useState(initial),
    [step, setStep] = useState(Math.max(1, Math.min(7, initialStep))),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [dirty, setDirty] = useState(false),
    [success, setSuccess] = useState(false),
    [docsBusy, setDocsBusy] = useState(false),
    [docsPending, setDocsPending] = useState(false);
  const busy = useRef(false);
  const [leave, setLeave] = useState(false);
  const [customTerm, setCustomTerm] = useState(Boolean(initial?.term && initial.term !== 'One year'));
  const [farmId, setFarmId] = useState(
    initial?.farmId ?? (farms.some((f) => f.id === initialFarmId) ? initialFarmId! : (farms[0]?.id ?? '')),
  );
  const [data, setData] = useState({
    professionalNeed: initial?.professionalNeed ?? '',
    managementTypes: initial?.managementTypes ?? ([] as string[]),
    term: initial?.term ?? '',
    currentSituation: initial?.currentSituation ?? '',
    goals: (initial?.goals ?? []).join('\n'),
    challenges: initial?.challenges ?? ([] as string[]),
    outcomes: initial?.outcomes ?? '',
    additionalInformation: initial?.additionalInformation ?? '',
  });
  const steps = ([1, 2, 3, 4, 5, 6, 7] as const).map((i) => w(`managementSteps.s${i}`));
  const context = farms.find((f) => f.id === farmId)?.name ?? initial?.farmName;
  const farmContext = farms.find((f) => f.id === farmId);
  const ready = useFormReady();
  const options = useTranslations('marketplace.options');
  const farmFields: [string, string | undefined][] = [
    [w('location'), [farmContext?.areaName, farmContext?.governorate].filter(Boolean).join(', ') || undefined],
    [w('area'), farmContext?.areaFeddan != null ? `${farmContext.areaFeddan} ${w('areaUnit')}` : undefined],
    [
      w('farmActivity'),
      farmContext?.farmType && (options.has as (key: string) => boolean)(`farmTypes.${farmContext.farmType}`)
        ? (options as (key: string) => string)(`farmTypes.${farmContext.farmType}`)
        : (farmContext?.farmType ?? undefined),
    ],
  ];
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty || docsPending) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, docsPending]);
  function update<K extends keyof typeof data>(key: K, value: (typeof data)[K]) {
    setData((old) => ({ ...old, [key]: value }));
    setDirty(true);
  }
  const goals = data.goals
    .split('\n')
    .map((g) => g.trim())
    .filter(Boolean);
  const customGoals = data.goals
    .split('\n')
    .filter((g) => !managementGoals.includes(g.trim() as (typeof managementGoals)[number]))
    .join('\n');
  function go(n: number) {
    setStep(n);
    window.scrollTo(0, 0);
  }
  async function persist() {
    if (!farmId || !data.professionalNeed) throw new Error('validation');
    const body = {
      localizedContent,
      ...data,
      term: localizedContent.en?.term || localizedContent.ar?.term || data.term.trim(),
      currentSituation:
        localizedContent.en?.currentSituation || localizedContent.ar?.currentSituation || data.currentSituation.trim(),
      outcomes: localizedContent.en?.outcomes || localizedContent.ar?.outcomes || data.outcomes.trim(),
      additionalInformation:
        localizedContent.en?.additionalInformation ||
        localizedContent.ar?.additionalInformation ||
        data.additionalInformation.trim(),
      goals: data.goals
        .split('\n')
        .map((g) => g.trim())
        .filter(Boolean),
    };
    const updated = await jsonRequest<ManagementRequest>(
      req ? `/api/farm-management-requests/${req.id}` : `/api/farms/${farmId}/management-requests`,
      req ? 'PATCH' : 'POST',
      body,
    );
    if (!updated?.id || (req && updated.id !== req.id) || !['draft', 'changesRequested'].includes(updated.status))
      throw new Error('confirmation');
    setReq(updated);
    setDirty(false);
    if (!req) window.history.replaceState(null, '', `/${locale}/my/management/${updated.id}`);
    return updated;
  }
  async function act(action: 'next' | 'exit' | 'submit') {
    if (busy.current || docsBusy || !ready) return;
    if (docsPending) {
      setError(w('pendingDocument'));
      go(6);
      return;
    }
    if (action === 'next' && step === 1 && !req) {
      if (!farmId) {
        setError(w('chooseFarm'));
        return;
      }
      go(2);
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const updated = await persist();
      if (action === 'submit') {
        if (!data.currentSituation.trim()) {
          go(3);
          throw new Error('situation');
        }
        const submitted = await jsonRequest<ManagementRequest>(
          `/api/farm-management-requests/${updated.id}/submit`,
          'POST',
        );
        if (submitted?.id !== updated.id || submitted.status !== 'underFarmExitReview' || !submitted.requestNumber)
          throw new Error('confirmation');
        setReq(submitted);
        setSuccess(true);
      } else if (action === 'exit') router.push('/my/management');
      else go(Math.min(7, step + 1));
    } catch (cause) {
      const status = cause instanceof Error ? cause.message : '';
      setError(
        !farmId || !data.professionalNeed
          ? w('chooseNeed')
          : status === '401'
            ? t('sessionError')
            : status === '409'
              ? t('conflictError')
              : status === '400'
                ? t('validationError')
                : action === 'submit'
                  ? t('submitError')
                  : t('saveError'),
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  if (farms.length === 0)
    return (
      <Card>
        <p>{t('noOwnerFarms')}</p>
        <ButtonLink href="/my/farms">{w('farms')}</ButtonLink>
      </Card>
    );
  if (success && req)
    return (
      <TaskFrame complete title={w('managementTitle')} context={context} steps={steps} step={7} onStep={() => {}} saved>
        <Card className="flex flex-col items-center gap-24 text-center">
          <Icon name="check" size={48} className="text-text-brand" />
          <h2 className="type-heading-h3">{w('submittedTitle')}</h2>
          <p className="type-body-default text-text-muted">{w('managementSubmitted')}</p>
          <PortalStatus status={req.status} />
          <p>{req.requestNumber}</p>
          <ButtonLink href={`/my/management/${req.id}`}>{w('track')}</ButtonLink>
          <ButtonLink href="/my/management" variant="outline">
            {w('allManagement')}
          </ButtonLink>
        </Card>
      </TaskFrame>
    );
  return (
    <TaskFrame
      heading={(w as (key: string) => string)(`headings.m${step}`)}
      intro={w('managementIntro')}
      title={w('managementTitle')}
      context={context}
      steps={steps}
      step={step}
      onStep={go}
      onSaveExit={() => void act('exit')}
      saved={!!req && !dirty}
      pending={pending || docsBusy || !ready}
      actions={
        <>
          <Button
            variant="outline"
            disabled={pending || docsBusy}
            onClick={() => (step > 1 ? go(step - 1) : dirty || req ? setLeave(true) : router.push('/my/management'))}
          >
            {w('back')}
          </Button>
          <Button disabled={pending || docsBusy} onClick={() => void act(step === 7 ? 'submit' : 'next')}>
            {pending ? w('saving') : step === 7 ? t('submit') : w('continue')}
            <Icon name="arrow-right" size={18} />
          </Button>
        </>
      }
    >
      <div data-testid="management-wizard" className="flex flex-col gap-24">
        {req?.reviews
          .filter((r) => r.comment)
          .map((r, i) => (
            <Card key={i} surface="muted">
              <h2 className="type-label-large">{t('reviews')}</h2>
              <p className="mt-12 type-body-default">{r.comment}</p>
            </Card>
          ))}
        {step > 1 && (
          <Card padding="sm">
            <p className="type-overline-field text-text-gold">{t('farm')}</p>
            <p className="mt-8 type-label-medium">{context}</p>
          </Card>
        )}
        <fieldset disabled={pending || !ready} className="min-w-0">
          <div hidden={step !== 1}>
            <WizardCard icon="tree" title={steps[0]!} description={w('selectFarmNote')}>
              <BilingualFields
                value={localizedContent}
                onChange={(v) => {
                  setLocalizedContent(v);
                  setDirty(true);
                  setData((d) => ({
                    ...d,
                    currentSituation: v.en?.currentSituation || v.ar?.currentSituation || d.currentSituation,
                    outcomes: v.en?.outcomes || v.ar?.outcomes || d.outcomes,
                    additionalInformation:
                      v.en?.additionalInformation || v.ar?.additionalInformation || d.additionalInformation,
                  }));
                }}
                fields={[
                  { key: 'currentSituation', label: t('currentSituation') },
                  { key: 'outcomes', label: t('outcomes') },
                  { key: 'additionalInformation', label: t('additionalInformation') },
                ]}
              />
              <div className="flex flex-col gap-12">
                {farms.map((f) => (
                  <Choice
                    key={f.id}
                    type="radio"
                    name="farmId"
                    value={f.id}
                    label={f.name}
                    checked={farmId === f.id}
                    disabled={!!req}
                    onChange={() => {
                      setFarmId(f.id);
                      setDirty(true);
                    }}
                  />
                ))}
              </div>
              {req && <p className="type-body-caption text-text-muted">{w('farmLocked')}</p>}
              <ButtonLink href="/my/farms/new" variant="ghost">
                {w('addFarm')}
              </ButtonLink>
            </WizardCard>
            {farmFields.some(([, value]) => value) && (
              <div className="mt-24">
                <WizardCard icon="check" title={w('attachedFarm')}>
                  <dl className="flex flex-col gap-16">
                    {farmFields
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div
                          key={label}
                          className="grid grid-cols-2 gap-16 border-b border-border-subtle pb-12 type-body-caption"
                        >
                          <dt className="text-text-muted">{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                </WizardCard>
              </div>
            )}
          </div>
          <div hidden={step !== 2} className="flex flex-col gap-24">
            <WizardCard icon="user" title={w('who')}>
              <div className="grid grid-cols-2 gap-16">
                {['farmManager', 'agriculturalEngineer', 'both'].map((type) => (
                  <div key={type} className={type === 'both' ? 'col-span-2' : ''}>
                    <Choice
                      big
                      type="radio"
                      name="professionalNeed"
                      value={type}
                      label={(t as (key: string) => string)(`needs.${type}`)}
                      description={(w as (key: string) => string)(`needDescriptions.${type}`)}
                      checked={data.professionalNeed === type}
                      onChange={() => update('professionalNeed', type)}
                    />
                  </div>
                ))}
              </div>
            </WizardCard>
            <WizardCard icon="category" title={t('managementTypes')}>
              <div className="grid grid-cols-2 gap-12">
                {managementTypes.map((type) => (
                  <Choice
                    key={type}
                    type="radio"
                    name="managementTypes"
                    value={type}
                    label={t(`managementTypeLabels.${type}`)}
                    checked={data.managementTypes.includes(type)}
                    onChange={() => update('managementTypes', [type])}
                  />
                ))}
              </div>
            </WizardCard>
            <WizardCard icon="calendar" title={t('term')}>
              <Select
                label={t('term')}
                name="term"
                value={customTerm ? 'custom' : data.term}
                onChange={(e) => {
                  setCustomTerm(e.target.value === 'custom');
                  update('term', e.target.value === 'custom' ? '' : e.target.value);
                }}
                fieldStyle="form"
              >
                <option value="">{t('selectTerm')}</option>
                <option value="One year">{t('oneYear')}</option>
                <option value="custom">{t('customTerm')}</option>
              </Select>
              {customTerm && (
                <TextInput
                  label={t('customTerm')}
                  name="customTerm"
                  value={data.term}
                  maxLength={100}
                  onChange={(e) => update('term', e.target.value)}
                  fieldStyle="form"
                />
              )}
            </WizardCard>
          </div>
          <div hidden={step !== 3} className="flex flex-col gap-24">
            <WizardCard icon="building" title={t('currentSituation')}>
              <BilingualFields
                value={localizedContent}
                legacy={{ currentSituation: data.currentSituation, outcomes: data.outcomes }}
                fields={[
                  { key: 'currentSituation', label: t('currentSituation'), maxLength: 8000 },
                  { key: 'outcomes', label: w('outcomes'), maxLength: 8000 },
                ]}
                onChange={(v) => {
                  setLocalizedContent(v);
                  setData((d) => ({
                    ...d,
                    currentSituation: v.en?.currentSituation || v.ar?.currentSituation || d.currentSituation,
                    outcomes: v.en?.outcomes || v.ar?.outcomes || d.outcomes,
                  }));
                  setDirty(true);
                }}
              />
              <fieldset className="flex flex-col gap-12">
                <legend className="mb-12 type-label-small-strong">{t('challenges')}</legend>
                <div className="grid gap-12 tablet:grid-cols-2">
                  {[
                    ...managementChallenges,
                    ...data.challenges.filter(
                      (v) => !managementChallenges.includes(v as (typeof managementChallenges)[number]),
                    ),
                  ].map((value) => {
                    const index = managementChallenges.indexOf(value as (typeof managementChallenges)[number]);
                    return (
                      <Choice
                        key={value}
                        name="challenges"
                        value={value}
                        label={index < 0 ? value : t(`challengeOptions.c${index as 0 | 1 | 2 | 3}`)}
                        checked={data.challenges.includes(value)}
                        onChange={() =>
                          update(
                            'challenges',
                            data.challenges.includes(value)
                              ? data.challenges.filter((v) => v !== value)
                              : [...data.challenges, value],
                          )
                        }
                      />
                    );
                  })}
                </div>
              </fieldset>
            </WizardCard>
            <WizardCard icon="tree" title={w('goalsTitle')}>
              <div className="flex flex-col gap-12">
                {managementGoals.map((value, index) => (
                  <Choice
                    key={value}
                    name="goalOptions"
                    value={value}
                    label={t(`goalOptions.g${index as 0 | 1 | 2}`)}
                    checked={goals.includes(value)}
                    onChange={() =>
                      update(
                        'goals',
                        [
                          ...goals.filter(
                            (g) => managementGoals.includes(g as (typeof managementGoals)[number]) && g !== value,
                          ),
                          ...(goals.includes(value) ? [] : [value]),
                          customGoals,
                        ]
                          .filter(Boolean)
                          .join('\n'),
                      )
                    }
                  />
                ))}
              </div>
              <TextArea
                label={t('customGoals')}
                name="goals"
                rows={4}
                value={customGoals}
                onChange={(e) =>
                  update(
                    'goals',
                    [
                      ...goals.filter((g) => managementGoals.includes(g as (typeof managementGoals)[number])),
                      e.target.value,
                    ]
                      .filter(Boolean)
                      .join('\n'),
                  )
                }
                fieldStyle="form"
              />
            </WizardCard>
          </div>
          <div hidden={step !== 4}>
            <WizardCard icon="clipboard-tick" title={steps[3]!}>
              <p className="type-body-default text-text-muted">{w('responsibilitiesUnavailable')}</p>
              <div className="flex flex-col gap-12">
                {(['operations', 'irrigation', 'harvest', 'reporting'] as const).map((value) => (
                  <Choice
                    key={value}
                    name="unsupportedResponsibility"
                    value={value}
                    label={w(`responsibilityLabels.${value}`)}
                    checked={false}
                    disabled
                    onChange={() => {}}
                  />
                ))}
              </div>
            </WizardCard>
          </div>
          <div hidden={step !== 5} className="flex flex-col gap-24">
            <WizardCard icon="building" title={steps[4]!}>
              <p className="type-body-caption text-text-muted">{w('resourcesUnavailable')}</p>
            </WizardCard>
            {farmId && <FarmFacilitiesPanel farmId={farmId} canEdit={false} />}
          </div>
          <div hidden={step !== 6}>
            <WizardCard icon="messages" title={w('additional')}>
              <BilingualFields
                value={localizedContent}
                legacy={{ additionalInformation: data.additionalInformation }}
                fields={[{ key: 'additionalInformation', label: w('additional'), maxLength: 8000 }]}
                onChange={(v) => {
                  setLocalizedContent(v);
                  setData((d) => ({
                    ...d,
                    additionalInformation:
                      v.en?.additionalInformation || v.ar?.additionalInformation || d.additionalInformation,
                  }));
                  setDirty(true);
                }}
              />
            </WizardCard>
          </div>
          <div hidden={step !== 7} className="flex flex-col gap-24">
            {[1, 2, 3].map((n) => (
              <WizardCard key={n} icon="clipboard-tick" title={steps[n - 1]!}>
                <dl className="flex flex-col gap-16">
                  {(n === 1
                    ? [[t('farm'), context]]
                    : n === 2
                      ? [
                          [
                            t('need'),
                            data.professionalNeed
                              ? (t as (key: string) => string)(`needs.${data.professionalNeed}`)
                              : w('notProvided'),
                          ],
                          [
                            t('managementTypes'),
                            data.managementTypes
                              .map((v) =>
                                managementTypes.includes(v as (typeof managementTypes)[number])
                                  ? (t as (key: string) => string)(`managementTypeLabels.${v}`)
                                  : v,
                              )
                              .join(', '),
                          ],
                          [t('term'), data.term],
                        ]
                      : [
                          [
                            t('currentSituation'),
                            contentText(localizedContent, locale, 'currentSituation', data.currentSituation),
                          ],
                          [
                            w('goalsTitle'),
                            formatManagementChoices(goals, managementGoals, [
                              t('goalOptions.g0'),
                              t('goalOptions.g1'),
                              t('goalOptions.g2'),
                            ]),
                          ],
                          [
                            t('challenges'),
                            formatManagementChoices(data.challenges, managementChallenges, [
                              t('challengeOptions.c0'),
                              t('challengeOptions.c1'),
                              t('challengeOptions.c2'),
                              t('challengeOptions.c3'),
                            ]),
                          ],
                          [w('outcomes'), contentText(localizedContent, locale, 'outcomes', data.outcomes)],
                          [
                            w('additional'),
                            contentText(
                              localizedContent,
                              locale,
                              'additionalInformation',
                              data.additionalInformation,
                            ),
                          ],
                        ]
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="grid grid-cols-2 gap-16 border-b border-border-subtle pb-12 type-body-caption"
                    >
                      <dt className="text-text-muted">{label}</dt>
                      <dd className="wrap-anywhere">{value || w('notProvided')}</dd>
                    </div>
                  ))}
                </dl>
                <Button variant="ghost" size="sm" onClick={() => go(n)}>
                  {w('edit')}
                </Button>
              </WizardCard>
            ))}
          </div>
        </fieldset>
        {req && (
          <div hidden={step !== 6 && step !== 7}>
            <RequestDocumentsPanel
              requestId={req.id}
              canEdit={step === 6 && !pending && ready}
              onBusyChange={setDocsBusy}
              onPendingChange={setDocsPending}
            />
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-status-error bg-bg-surface p-16 type-body-caption text-status-error"
          >
            {error}
          </p>
        )}
        <Dialog open={leave} onOpenChange={setLeave} title={w('leaveTitle')} description={w('leaveNote')}>
          {error && (
            <p role="alert" className="type-body-caption text-status-error">
              {error}
            </p>
          )}
          <Button disabled={pending || docsBusy} onClick={() => void act('exit')}>
            {w('saveExit')}
          </Button>
          <Button variant="outline" onClick={() => setLeave(false)}>
            {w('keepEditing')}
          </Button>
        </Dialog>
      </div>
    </TaskFrame>
  );
}
