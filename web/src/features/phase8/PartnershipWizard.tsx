'use client';
import { BilingualFields } from '@/components/content/BilingualFields';
import { contentText, type LocalizedContent } from '@/lib/content/localized';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Select, TextInput, TextArea } from '@/components/ui/Field';
import { Card } from '@/components/ui/Surface';
import { Icon } from '@/components/icons/Icon';
import { TaskFrame, Choice } from '@/features/phase7/TaskFrame';
import { RequestTracking } from '@/features/phase7/RequestTracking';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { WizardCard } from '@/features/my-farms/WizardCard';
import { WizardDisclosure } from '@/features/my-farms/WizardDisclosure';
import { RequestDocumentsPanel } from '@/features/my-farms/RequestDocumentsPanel';
import { content } from './content';

export type PartnershipRecord = {
  localizedContent?: LocalizedContent;
  id: string;
  requestNumber: string;
  status: string;
  farmId?: string;
  farmName?: string;
  description?: string | null;
  objective?: string[] | null;
  acceptedPartnerTypes?: string[] | null;
  contributionDetails?: string | null;
  operations?: string | null;
  salesChannel?: string | null;
  extraInformation?: string | null;
  parentPartnershipRequestId?: string;
  applicantKind?: string | null;
  applicationMessage?: string | null;
  whyGoodFit?: string | null;
  relevantExperience?: string | null;
  approach?: string | null;
  companyName?: string | null;
  companyRegistrationNumber?: string | null;
  companyContactName?: string | null;
  companyContactRole?: string | null;
  companySector?: string | null;
  reviews: { decision: string; comment: string | null; createdAt?: string | null }[];
};
type Values = Record<string, string> &
  Record<
    | 'description'
    | 'contributionDetails'
    | 'operations'
    | 'salesChannel'
    | 'extraInformation'
    | 'applicationMessage'
    | 'whyGoodFit'
    | 'relevantExperience'
    | 'approach'
    | 'companyName'
    | 'companyRegistrationNumber'
    | 'companyContactName'
    | 'companyContactRole'
    | 'companySector',
    string
  >;
const ownerFields = ['description', 'contributionDetails', 'operations', 'salesChannel', 'extraInformation'];
const applicantFields = [
  'applicationMessage',
  'whyGoodFit',
  'relevantExperience',
  'approach',
  'companyName',
  'companyRegistrationNumber',
  'companyContactName',
  'companyContactRole',
  'companySector',
];
const editable = new Set(['draft', 'changesRequested']);
const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function PartnershipWizard({
  initial,
  farms = [],
  initialFarmId,
  parentId,
  application = false,
  account,
}: {
  initial?: PartnershipRecord;
  farms?: { id: string; name: string }[];
  initialFarmId?: string;
  parentId?: string;
  application?: boolean;
  account?: { fullName: string | null; mobileE164: string };
}) {
  const locale = useLocale();
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);
  const c = content[locale === 'ar' ? 'ar' : 'en'];
  const router = useRouter();
  const [localizedContent, setLocalizedContent] = useState<LocalizedContent>(initial?.localizedContent ?? {});
  const [record, setRecord] = useState(initial);
  const [step, setStep] = useState(initial ? 2 : 1);
  const [values, setValues] = useState<Values>(
    () =>
      Object.fromEntries(
        [...ownerFields, ...applicantFields].map((key) => [
          key,
          (initial?.[key as keyof PartnershipRecord] as string) ?? '',
        ]),
      ) as Values,
  );
  const [objectives, setObjectives] = useState(initial?.objective ?? []);
  const [accepted, setAccepted] = useState(initial?.acceptedPartnerTypes ?? []);
  const [kind, setKind] = useState(initial?.applicantKind ?? 'individual');
  const [farmId, setFarmId] = useState(initial?.farmId ?? initialFarmId ?? farms[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [docPending, setDocPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [notice, setNotice] = useState('');
  const steps = application ? c.appSteps : c.ownerSteps;
  const base = application ? '/my/applications' : '/my/partnerships';
  const endpoint = application ? '/api/partnership-applications' : '/api/partnership-requests';
  const canEdit = !record || editable.has(record.status);
  const blocked = !ready || pending || docBusy;
  const fields = application ? applicantFields : ownerFields;
  const title = application ? c.appTitle : c.ownerTitle;

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty || docPending) event.preventDefault();
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, docPending]);

  function change(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
    setNotice('');
  }
  async function request(url: string, method: string, data?: unknown): Promise<PartnershipRecord> {
    const response = await fetch(url, {
      method,
      headers: data === undefined ? undefined : { 'content-type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    if (!response.ok) {
      // The API owns permissions and business validation. Keep entered values on every failure.
      const body = await response.json().catch(() => null);
      throw new Error(Array.isArray(body?.message) ? body.message.join(' · ') : body?.message || c.error);
    }
    const result = await response.json();
    if (!result || typeof result.id !== 'string' || typeof result.status !== 'string') throw new Error(c.error);
    return result;
  }
  async function persist(): Promise<PartnershipRecord> {
    let current = record;
    if (!current) {
      if (application)
        current = await request(endpoint, 'POST', { parentPartnershipRequestId: parentId, applicantKind: kind });
      else {
        if (!farmId) throw new Error(c.required);
        current = await request(`/api/farms/${farmId}/partnership-requests`, 'POST', {
          description: values.description,
          localizedContent,
          objective: objectives,
        });
      }
      setRecord(current);
      window.history.replaceState(null, '', `/${locale}${base}/${current.id}`);
    }
    // A company draft is created before the company name is entered on step 2.
    // The update contract requires a name; do not send an empty update from step 1.
    if (application && kind === 'company' && !current.companyName && !values.companyName && step === 1) {
      setDirty(false);
      setNotice(c.saved);
      return current;
    }
    const body: Record<string, unknown> = Object.fromEntries(
      fields
        .filter((key) => !application || !key.startsWith('company') || kind === 'company')
        .map((key) => [key, values[key]]),
    );
    // The company API rejects blank company identity fields. Omit untouched blanks in a new draft;
    // send attempted clears of existing values so the real validation is visible.
    if (application)
      for (const key of ['companyName', 'companyContactName']) {
        if (!values[key] && !current[key as keyof PartnershipRecord]) delete body[key];
      }
    if (!application) {
      body.localizedContent = localizedContent;
      body.objective = objectives;
      body.acceptedPartnerTypes = accepted;
    }
    const saved = await request(`${endpoint}/${current.id}`, 'PATCH', body);
    setRecord(saved);
    setDirty(false);
    setNotice(c.saved);
    return saved;
  }
  async function act(action: 'next' | 'save' | 'exit' | 'submit', target?: number) {
    if (lock.current || !canEdit || docBusy) return;
    if (docPending) {
      setError(c.uploadPending);
      return;
    }
    if (
      action === 'next' &&
      ((!application && step === 2 && (!objectives.length || !values.description.trim())) ||
        (application &&
          step === 2 &&
          kind === 'company' &&
          (!values.companyName.trim() || !values.companyContactName.trim())))
    ) {
      setError(c.required);
      return;
    }
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const saved = await persist();
      if (action === 'submit') {
        const submitted = await request(`${endpoint}/${saved.id}/submit`, 'POST');
        if (submitted.status !== 'underFarmExitReview') throw new Error(c.error);
        setRecord(submitted);
        setComplete(true);
      } else if (action === 'exit') router.push(base);
      else if (action === 'next') {
        setStep(target ?? Math.min(step + 1, steps.length));
        window.scrollTo({ top: 0 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : c.error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function move(target: number) {
    if (blocked) return;
    // Persist when navigating so changing steps never silently discards data.
    if (record || target > 1) void act('next', target);
    else setStep(target);
  }
  const input = (key: string, label: string, maxLength = 8000, multiline = true) =>
    multiline ? (
      <TextArea
        key={key}
        label={label}
        name={key}
        value={values[key]}
        onChange={(e) => change(key, e.target.value)}
        maxLength={maxLength}
        rows={4}
        fieldStyle="form"
      />
    ) : (
      <TextInput
        key={key}
        label={label}
        name={key}
        value={values[key]}
        onChange={(e) => change(key, e.target.value)}
        maxLength={maxLength}
        fieldStyle="form"
      />
    );
  const unavailable = (label: string, options?: readonly string[], radio = false) => (
    <div className="flex flex-col gap-12">
      {options && <p className="type-label-small-strong">{label}</p>}
      {options ? (
        <div className="grid gap-12 tablet:grid-cols-2">
          {options.map((option, i) => (
            <Choice
              key={option}
              name={label}
              value={String(i)}
              label={option}
              checked={false}
              onChange={() => {}}
              disabled
              type={radio ? 'radio' : 'checkbox'}
            />
          ))}
        </div>
      ) : (
        <Select label={label} disabled fieldStyle="form">
          <option>{c.choose}</option>
        </Select>
      )}
      <p className="type-label-caption text-text-muted">{c.unsupported}</p>
    </div>
  );
  const aside = (
    <>
      <Card surface="muted" className="border-overlay-gold-hairline">
        <Icon name="verify-filled" size={28} className="mb-16 text-text-gold" />
        <h2 className="type-label-large">{c.reviewTitle}</h2>
        <p className="mt-12 type-body-caption text-text-muted">{c.reviewNote}</p>
      </Card>
      <Card>
        <Icon name="lock" size={20} className="mb-12 text-text-brand" />
        <h2 className="type-overline-field text-text-brand">{c.communication}</h2>
        <p className="mt-12 type-body-caption text-text-muted">{c.communicationNote}</p>
      </Card>
    </>
  );
  const displayFields: [string, string | null][] = application
    ? [
        [c.message, values.applicationMessage],
        [c.fit, values.whyGoodFit],
        [c.experience, values.relevantExperience],
        [c.approach, values.approach],
        ...(kind === 'company'
          ? ([
              [c.companyName, values.companyName],
              [c.contact, values.companyContactName],
              [c.registration, values.companyRegistrationNumber],
              [c.contactRole, values.companyContactRole],
              [c.sector, values.companySector],
            ] as [string, string][])
          : []),
      ]
    : [
        [c.farm, record?.farmName ?? farms.find((f) => f.id === farmId)?.name ?? null],
        [c.objective, objectives.join('\n')],
        [c.description, contentText(record?.localizedContent, locale, 'description', values.description)],
        [
          c.accepted,
          accepted.map((k) => (k === 'individual' ? c.individual : k === 'company' ? c.company : k)).join(' · '),
        ],
        [c.contributionDetails, contentText(record?.localizedContent, locale, 'contributionDetails', values.contributionDetails)],
        [c.operations, contentText(record?.localizedContent, locale, 'operations', values.operations)],
        [c.salesChannel, contentText(record?.localizedContent, locale, 'salesChannel', values.salesChannel)],
        [c.extra, contentText(record?.localizedContent, locale, 'extraInformation', values.extraInformation)],
      ];

  if (record && !canEdit && !complete)
    return (
      <RequestTracking
        id={record.id}
        requestNumber={record.requestNumber}
        status={record.status}
        title={title}
        fields={displayFields}
        privateNote={c.private}
        reviews={record.reviews.map((r) => ({ ...r, createdAt: r.createdAt ?? null }))}
      />
    );
  return (
    <div
      data-ready={ready || undefined}
      data-testid={
        application
          ? initial
            ? 'partnership-application-detail'
            : 'new-partnership-application-form'
          : initial
            ? 'partnership-request-detail'
            : 'new-partnership-form'
      }
    >
      <TaskFrame
        title={title}
        heading={application && step === 2 ? (kind === 'company' ? c.aboutCompany : c.aboutYou) : undefined}
        steps={steps}
        step={step}
        onStep={move}
        context={record?.farmName ?? (application ? record?.requestNumber : farms.find((f) => f.id === farmId)?.name)}
        pending={blocked}
        saved={!dirty && Boolean(record)}
        complete={complete}
        aside={aside}
        privateNote={c.private}
        onSaveExit={complete ? undefined : () => void act('exit')}
        actions={
          complete ? undefined : (
            <>
              <Button variant="outline" type="button" onClick={() => (step > 1 ? move(step - 1) : void act('exit'))}>
                {c.back}
              </Button>
              <Button type="button" onClick={() => void act(step === steps.length ? 'submit' : 'next')}>
                {step === steps.length ? c.submit : c.continue}
              </Button>
            </>
          )
        }
      >
        {complete ? (
          <Card className="text-center">
            <h1 className="type-heading-h3">{c.success}</h1>
            <p className="mt-16 type-body-default text-text-muted">{c.successNote}</p>
            <p className="mt-16 type-label-large">{record?.requestNumber}</p>
            <p className="mt-16 type-body-caption">{c.nonbinding}</p>
            <Link
              prefetch={false}
              href={`${base}/${record?.id}`}
              className="mt-24 inline-block type-label-button text-text-brand"
            >
              {c.track}
            </Link>
          </Card>
        ) : (
          <div className="flex min-w-0 flex-col gap-24">
            {record?.status === 'changesRequested' && (
              <Card>
                <PortalStatus status={record.status} />
                {record.reviews.map(
                  (r, i) =>
                    r.comment && (
                      <p key={i} className="mt-12 type-body-caption">
                        {r.comment}
                      </p>
                    ),
                )}
              </Card>
            )}
            <fieldset disabled={blocked} className="contents">
              {!application && step === 1 && (
                <WizardCard title={c.farm} icon="tree">
                  {record ? (
                    <p>{record.farmName}</p>
                  ) : farms.length ? (
                    <Select
                      label={c.farm}
                      name="farmId"
                      value={farmId}
                      onChange={(e) => {
                        setFarmId(e.target.value);
                        setDirty(true);
                      }}
                      fieldStyle="form"
                    >
                      {farms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <p>{c.noFarms}</p>
                  )}
                </WizardCard>
              )}
              {!application && step === 2 && (
                <WizardCard title={c.objective} icon="tree">
                  <div className="flex flex-col gap-12">
                    {[...content.en.goals, ...objectives.filter((o) => !content.en.goals.includes(o))].map(
                      (goal, i) => (
                        <Choice
                          key={goal}
                          name="objective"
                          value={goal}
                          label={c.goals[i] ?? goal}
                          type="radio"
                          checked={objectives.includes(goal)}
                          onChange={() => {
                            setObjectives([goal]);
                            setDirty(true);
                          }}
                        />
                      ),
                    )}
                  </div>
                  {objectives.length > 1 && <p className="type-body-caption">{objectives.join(' · ')}</p>}
                  <BilingualFields
                    value={localizedContent}
                    legacy={Object.fromEntries(ownerFields.map((key) => [key, values[key] ?? '']))}
                    onChange={(v) => {
                      setLocalizedContent(v);
                      setDirty(true);
                      setValues((d) => ({
                        ...d,
                        ...Object.fromEntries(
                          ownerFields.map((key) => [key, v.en?.[key] || v.ar?.[key] || d[key] || '']),
                        ),
                      }));
                    }}
                    fields={ownerFields.map((key) => ({
                      key,
                      label:
                        (
                          {
                            description: c.description,
                            contributionDetails: c.contributionDetails,
                            operations: c.operations,
                            salesChannel: c.salesChannel,
                            extraInformation: c.extra,
                          } as Record<string, string>
                        )[key] ?? key,
                    }))}
                  />
                </WizardCard>
              )}
              {!application && step === 3 && (
                <>
                  <WizardCard title={c.accepted} icon="user">
                    <div className="grid gap-12 tablet:grid-cols-2">
                      {['individual', 'company'].map((k) => (
                        <Choice
                          key={k}
                          name="acceptedPartnerTypes"
                          value={k}
                          label={k === 'individual' ? c.individual : c.company}
                          checked={accepted.includes(k)}
                          onChange={() => {
                            setAccepted((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]));
                            setDirty(true);
                          }}
                        />
                      ))}
                    </div>
                    {unavailable(c.background, c.backgrounds)}
                  </WizardCard>
                  <WizardCard title={c.lookingFor} icon="user">
                    <TextArea label={c.lookingFor} disabled helper={c.unsupported} fieldStyle="form" />
                  </WizardCard>
                </>
              )}
              {!application && step === 4 && (
                <WizardCard title={c.contribution} icon="tree">
                  {unavailable(c.contribution, c.contributions)}
                  {input('contributionDetails', c.contributionDetails)}
                  <p className="type-body-caption text-text-muted">{c.nonbinding}</p>
                </WizardCard>
              )}
              {!application && step === 5 && (
                <>
                  <WizardCard title={c.ownerSteps[4] ?? ''} icon="tree">
                    {unavailable(c.currentTeam)}
                    {input('operations', c.operations)}
                    <Select
                      label={c.salesChannel}
                      name="salesChannel"
                      value={values.salesChannel}
                      onChange={(e) => change('salesChannel', e.target.value)}
                      fieldStyle="form"
                    >
                      <option value="">{c.choose}</option>
                      <option value="Local nurseries and traders">{c.localSales}</option>
                      {values.salesChannel && values.salesChannel !== 'Local nurseries and traders' && (
                        <option value={values.salesChannel}>{values.salesChannel}</option>
                      )}
                    </Select>
                  </WizardCard>
                  <WizardDisclosure title={c.extra} icon="folder" description={c.extra}>
                    {input('extraInformation', c.extra)}
                  </WizardDisclosure>
                </>
              )}
              {application && step === 1 && (
                <WizardCard title={c.appSteps[0] ?? ''} icon="user">
                  <div className="grid gap-16 tablet:grid-cols-2">
                    {['individual', 'company'].map((k) => (
                      <Choice
                        key={k}
                        name="applicantKind"
                        value={k}
                        type="radio"
                        big
                        label={k === 'individual' ? c.individual : c.company}
                        disabled={Boolean(record)}
                        checked={kind === k}
                        onChange={() => {
                          setKind(k);
                          setDirty(true);
                        }}
                      />
                    ))}
                  </div>
                  {record && <p className="type-body-caption text-text-muted">{c.immutable}</p>}
                </WizardCard>
              )}
              {application && step === 2 && (
                <>
                  <WizardCard title={kind === 'company' ? c.companyDetails : c.yourDetails} icon="user">
                    {kind === 'company' ? (
                      <>
                        {input('companyName', c.companyName, 200, false)}
                        {input('companyRegistrationNumber', c.registration, 100, false)}
                        {unavailable(c.governorate)}
                        {input('companyContactName', c.contact, 150, false)}
                        <Select
                          label={c.contactRole}
                          name="companyContactRole"
                          value={values.companyContactRole}
                          onChange={(e) => change('companyContactRole', e.target.value)}
                          fieldStyle="form"
                        >
                          <option value="">{c.choose}</option>
                          <option value="Authorized representative">{c.contact}</option>
                          {values.companyContactRole && values.companyContactRole !== 'Authorized representative' && (
                            <option value={values.companyContactRole}>{values.companyContactRole}</option>
                          )}
                        </Select>
                      </>
                    ) : (
                      <>
                        {account && (
                          <>
                            <TextInput label={c.name} value={account.fullName ?? ''} readOnly fieldStyle="form" />
                            <TextInput label={c.mobile} value={account.mobileE164} readOnly fieldStyle="form" />
                          </>
                        )}
                        {unavailable(c.governorate)}
                      </>
                    )}
                  </WizardCard>
                  <WizardCard title={kind === 'company' ? c.companyProfile : c.background} icon="user">
                    {unavailable(kind === 'company' ? c.sector : c.background, c.backgrounds)}
                    {kind === 'company' && values.companySector && input('companySector', c.sector, 150, false)}
                    {input('relevantExperience', kind === 'company' ? c.aboutCompany : c.experience)}
                  </WizardCard>
                  {kind === 'company' && account && (
                    <WizardCard title={c.yourDetails} icon="user">
                      <TextInput label={c.name} value={account.fullName ?? ''} readOnly fieldStyle="form" />
                      <p className="type-body-caption text-text-muted">{c.communicationNote}</p>
                    </WizardCard>
                  )}
                </>
              )}
              {application && step === 3 && (
                <WizardCard title={c.appSteps[2] ?? ''} icon="tree">
                  {input('whyGoodFit', c.fit)}
                  {unavailable(c.contribution, c.contributions)}
                  {input('applicationMessage', c.message)}
                  <WizardDisclosure title={c.approach} description={c.approach} icon="folder">
                    {input('approach', c.approach)}
                  </WizardDisclosure>
                </WizardCard>
              )}
            </fieldset>
            {step === (application ? 4 : 6) && record && (
              <RequestDocumentsPanel
                requestId={record.id}
                canEdit={!pending}
                onBusyChange={setDocBusy}
                onPendingChange={setDocPending}
              />
            )}
            {step === steps.length && (
              <>
                <WizardCard title={c.review} icon="verify-filled">
                  <dl className="flex flex-col gap-20">
                    {displayFields.map(([label, value]) => (
                      <div key={label} className="border-b border-border-subtle pb-16">
                        <dt className="type-label-caption text-text-muted">{label}</dt>
                        <dd className="mt-8 whitespace-pre-line type-body-default wrap-anywhere">{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="type-body-caption text-text-muted">{c.nonbinding}</p>
                </WizardCard>
                {record && <RequestDocumentsPanel requestId={record.id} canEdit={false} />}
              </>
            )}
            <p className="type-label-caption text-text-muted">{c.private}</p>
            {notice && (
              <p role="status" className="type-body-caption text-text-brand">
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="type-body-caption text-status-error">
                {error}
              </p>
            )}
          </div>
        )}
      </TaskFrame>
    </div>
  );
}
