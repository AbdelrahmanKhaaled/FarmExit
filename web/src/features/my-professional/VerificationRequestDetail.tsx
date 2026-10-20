'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button, ButtonLink } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Field';
import { Card } from '@/components/ui/Surface';
import { Icon } from '@/components/icons/Icon';
import { TaskFrame } from '@/features/phase7/TaskFrame';
import { useFormReady } from '@/features/phase7/useFormReady';
import { RequestTracking } from '@/features/phase7/RequestTracking';
import { WizardDisclosure } from '@/features/my-farms/WizardDisclosure';
import { WizardCard } from '@/features/my-farms/WizardCard';
import { RequestDocumentsPanel } from '@/features/my-farms/RequestDocumentsPanel';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { jsonRequest } from '@/features/my-farms/types';
export type VerificationRequest = {
  id: string;
  requestNumber: string;
  status: string;
  professionalCapabilityId: string;
  professionalType: string;
  verificationSummary: string | null;
  reviews: { decision: string; comment: string | null; createdAt: string | null }[];
};
export function VerificationRequestDetail({
  initial,
  initialStep = 4,
  history,
}: {
  initial: VerificationRequest;
  initialStep?: number;
  history?: { toStatus: string; reason: string | null; createdAt: string | null }[];
}) {
  const t = useTranslations('workspace.professionalVerification'),
    w = useTranslations('workspace.phase7');
  const [req, setReq] = useState(initial),
    [step, setStep] = useState(initialStep === 5 ? 5 : 4),
    [summary, setSummary] = useState(initial.verificationSummary ?? ''),
    [pending, setPending] = useState(false),
    [dirty, setDirty] = useState(false),
    [docsBusy, setDocsBusy] = useState(false),
    [docsPending, setDocsPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [success, setSuccess] = useState(false);
  const router = useRouter();
  const ready = useFormReady();
  const busy = useRef(false),
    canEdit = ['draft', 'changesRequested'].includes(req.status),
    steps = ([1, 2, 3, 4, 5] as const).map((i) => w(`professionalSteps.s${i}`));
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
  async function save(submit = false, exit = false, stay = false) {
    if (busy.current || docsBusy || !canEdit || !ready) return;
    if (docsPending) {
      setError(w('pendingDocument'));
      setStep(4);
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      let updated = req;
      if (dirty) {
        updated = await jsonRequest<VerificationRequest>(`/api/professional-verification-requests/${req.id}`, 'PATCH', {
          verificationSummary: summary.trim(),
        });
        if (updated?.id !== req.id) throw new Error('confirmation');
        setReq(updated);
        setDirty(false);
      }
      if (submit) {
        updated = await jsonRequest<VerificationRequest>(
          `/api/professional-verification-requests/${req.id}/submit`,
          'POST',
        );
        if (updated?.id !== req.id || updated.status !== 'underReview' || !updated.requestNumber)
          throw new Error('confirmation');
        setReq(updated);
        setSuccess(true);
      } else if (exit) router.push('/my/professional/verification');
      else if (!stay) setStep(5);
    } catch {
      setError(submit ? t('submitError') : t('saveError'));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function goProfile(n: number) {
    if (dirty || docsPending) {
      setError(w('profileEditSeparate'));
      return;
    }
    router.push(`/my/professional?step=${n}`);
  }
  if (!canEdit && !success)
    return (
      <RequestTracking
        id={req.id}
        title={t('listTitle')}
        requestNumber={req.requestNumber}
        status={req.status}
        reviews={req.reviews}
        history={history}
        fields={[
          [t('type'), (t as (key: string) => string)(`types.${req.professionalType}`)],
          [t('summary'), req.verificationSummary],
        ]}
      />
    );
  if (success)
    return (
      <TaskFrame complete title={w('professionalTitle')} professional steps={steps} step={5} onStep={() => {}} saved>
        <Card className="flex flex-col items-center gap-24 text-center">
          <Icon name="check" size={48} className="text-text-brand" />
          <h2 className="type-heading-h3">{w('verificationSubmitted')}</h2>
          <p className="type-body-default text-text-muted">{w('verificationPending')}</p>
          <PortalStatus status={req.status} />
          <p>{req.requestNumber}</p>
          <ButtonLink href={`/my/professional/verification/${req.id}`}>{w('track')}</ButtonLink>
          <ButtonLink href="/my/professional" variant="outline">
            {t('backToProfile')}
          </ButtonLink>
        </Card>
      </TaskFrame>
    );
  return (
    <TaskFrame
      heading={(w as (key: string) => string)(`headings.p${step}`)}
      intro={w('professionalIntro')}
      title={w('professionalTitle')}
      context={(t as (key: string) => string)(`types.${req.professionalType}`)}
      professional
      steps={steps}
      step={step}
      onStep={(n) => (n >= 4 ? setStep(n) : goProfile(n))}
      pending={pending || docsBusy || !ready}
      saved={!dirty && !docsPending}
      onSaveExit={() => void save(false, true)}
      actions={
        <>
          <Button
            variant="outline"
            disabled={pending || docsBusy}
            onClick={() => (step === 5 ? setStep(4) : goProfile(3))}
          >
            {w('back')}
          </Button>
          <Button disabled={pending || docsBusy} onClick={() => void save(step === 5)}>
            {pending ? w('saving') : step === 5 ? t('submit') : w('continue')}
          </Button>
        </>
      }
    >
      <div data-testid="verification-request-detail" className="flex flex-col gap-24">
        {req.reviews
          .filter((r) => r.comment)
          .map((r, i) => (
            <Card key={i} surface="muted">
              <h2 className="type-label-large">{t('reviews')}</h2>
              <p className="mt-12 type-body-default">{r.comment}</p>
            </Card>
          ))}
        <p className="type-body-caption text-text-muted">{t('documentsNote')}</p>
        {step === 5 && (
          <WizardCard icon="clipboard-tick" title={steps[4]!}>
            <PortalStatus status={req.status} />
            <p className="type-label-large">{(t as (key: string) => string)(`types.${req.professionalType}`)}</p>
            <p className="whitespace-pre-line type-body-default">{summary || w('notProvided')}</p>
            <Button variant="ghost" onClick={() => setStep(4)}>
              {w('edit')}
            </Button>
          </WizardCard>
        )}
        <RequestDocumentsPanel
          requestId={req.id}
          canEdit={step === 4 && !pending && ready}
          onBusyChange={setDocsBusy}
          onPendingChange={setDocsPending}
        />
        <div hidden={step !== 4}>
          <WizardDisclosure icon="document-text" title={t('summary')} description={w('optionalNote')}>
            <TextArea
              label={t('summary')}
              name="verificationSummary"
              disabled={pending || !ready}
              value={summary}
              maxLength={8000}
              rows={5}
              onChange={(e) => {
                setSummary(e.target.value);
                setDirty(true);
              }}
              fieldStyle="form"
            />
            <Button variant="outline" disabled={pending || docsBusy} onClick={() => void save(false, false, true)}>
              {t('save')}
            </Button>
          </WizardDisclosure>
        </div>
        <Button type="button" variant="ghost" disabled={pending || docsBusy} onClick={() => goProfile(2)}>
          {t('backToProfile')}
        </Button>
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
