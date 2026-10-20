'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Button, buttonClasses } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/icons/Icon';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { WizardCard } from './WizardCard';
import { WizardDisclosure } from './WizardDisclosure';
import { jsonRequest } from './types';
import { uploadPrivateFile, PrivateUploadError } from './upload';
export type RequestDocument = {
  id: string;
  slotKey: string;
  documentType: string | null;
  originalName: string | null;
  mimeType: string | null;
  fileSizeBytes: string | null;
  reviewStatus: string;
  reviewNote: string | null;
  createdAt: string | null;
};
function DocumentUploadArea({
  additional,
  replacing,
  children,
}: {
  additional: boolean;
  replacing: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('workspace.wizard.docs');
  return additional ? (
    <WizardDisclosure
      icon="folder"
      title={t('additional')}
      description={t('additionalNote')}
      open={replacing || undefined}
    >
      {children}
    </WizardDisclosure>
  ) : (
    <>{children}</>
  );
}
export function RequestDocumentsPanel({
  requestId,
  canEdit,
  onBusyChange,
  onPendingChange,
}: {
  requestId: string;
  canEdit: boolean;
  onBusyChange?: (busy: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const t = useTranslations('workspace.wizard.docs');
  const [items, setItems] = useState<RequestDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slot, setSlot] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploaded, setUploaded] = useState(false);
  useEffect(() => {
    onPendingChange?.(Boolean(file));
    return () => onPendingChange?.(false);
  }, [file, onPendingChange]);
  useEffect(() => {
    onBusyChange?.(busy);
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    let active = true;
    void jsonRequest<RequestDocument[]>(`/api/requests/${requestId}/documents`)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setError(t('loadError'));
      });
    return () => {
      active = false;
    };
  }, [requestId, t]);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || busy) return;
    setUploaded(false);
    setError(null);
    if (!file?.size || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('invalid'));
      return;
    }
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set('file', file);
    const targetSlot = slot || `supporting_${crypto.randomUUID()}`;
    setSlot(targetSlot);
    body.set('slotKey', targetSlot);
    setBusy(true);
    setProgress(null);
    try {
      const result = (await uploadPrivateFile(
        `/api/requests/${requestId}/documents`,
        body,
        setProgress,
      )) as RequestDocument;
      if (!result || !/^\d+$/.test(result.id) || result.slotKey !== targetSlot || result.reviewStatus !== 'uploaded')
        throw new Error('unconfirmed metadata');
      setItems((old) => [result, ...(old ?? []).filter((item) => item.id !== result.id)]);
      setUploaded(true);
      setFile(null);
      setSlot('');
      form.reset();
      // Storage is already confirmed: a refresh failure must not invite uploading the same file again.
      try {
        setItems(await jsonRequest<RequestDocument[]>(`/api/requests/${requestId}/documents`));
      } catch {
        setError(t('refreshError'));
      }
    } catch (reason) {
      const status = reason instanceof PrivateUploadError ? reason.status : 0;
      setError(
        t(
          status === 401
            ? 'sessionError'
            : status === 403 || status === 404
              ? 'accessError'
              : status === 413
                ? 'sizeError'
                : status === 415
                  ? 'invalid'
                  : status === 409
                    ? 'lockedError'
                    : 'error',
        ),
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }
  const current = items?.filter(
    (item, index, all) => all.findIndex((other) => other.slotKey === item.slotKey) === index,
  );
  return (
    <WizardCard icon="document-text" title={t('title')} description={t('privacy')}>
      <div data-testid="request-documents-panel" className="flex min-w-0 flex-col gap-16">
        {items?.length === 0 && <p className="type-body-caption text-text-muted">{t('empty')}</p>}
        <ul className="flex flex-col gap-16">
          {current?.map((item) => (
            <li
              key={item.id}
              className={`grid grid-cols-[24px_minmax(0,1fr)] items-start gap-12 rounded-lg border p-16 tablet:flex tablet:flex-wrap ${item.reviewStatus === 'changesRequested' ? 'border-overlay-gold-hairline bg-bg-notice' : 'border-border-hairline'}`}
            >
              <Icon name="document-text" size={24} className="shrink-0 text-text-brand" />
              <div className="min-w-0 flex-1">
                <p className="type-label-small-strong wrap-anywhere">{item.documentType || t('supportingDocument')}</p>
                <p className="mt-6 type-label-caption wrap-anywhere text-text-muted">{item.originalName}</p>
                <div className="mt-8">
                  <PortalStatus status={item.reviewStatus} />
                </div>
                {item.reviewNote && <p className="mt-8 type-body-caption text-text-notice">{item.reviewNote}</p>}
              </div>
              {(items?.filter((version) => version.slotKey === item.slotKey).length ?? 0) > 1 && (
                <details className="col-span-2 min-w-0 tablet:basis-full">
                  <summary className="cursor-pointer type-label-caption-strong text-text-brand">{t('history')}</summary>
                  <ul className="mt-12 flex flex-col gap-8">
                    {items
                      ?.filter((version) => version.slotKey === item.slotKey && version.id !== item.id)
                      .map((version) => (
                        <li key={version.id}>
                          <a
                            className="type-body-caption text-text-brand"
                            href={`/api/requests/${requestId}/documents/${version.id}/download`}
                          >
                            {version.originalName} —{' '}
                            {version.createdAt ? version.createdAt.slice(0, 10) : t('download')}
                          </a>
                        </li>
                      ))}
                  </ul>
                </details>
              )}
              <div className="col-span-2 flex flex-wrap gap-12 tablet:basis-full">
                <a
                  href={`/api/requests/${requestId}/documents/${item.id}/download`}
                  className="inline-flex min-h-44 items-center type-label-small-strong text-text-brand"
                >
                  {t('download')}
                </a>
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setSlot(item.slotKey);
                      setUploaded(false);
                      document.querySelector<HTMLInputElement>('[data-testid="document-file"]')?.focus();
                    }}
                  >
                    {t('replace')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {(canEdit || file) && (
          <DocumentUploadArea additional={Boolean(items?.length)} replacing={Boolean(slot)}>
            <form
              hidden={!canEdit}
              onSubmit={upload}
              className="flex flex-col gap-16 border-t border-border-hairline pt-24"
            >
              {slot && items?.some((item) => item.slotKey === slot) && (
                <div className="flex flex-wrap items-center justify-between gap-12">
                  <p className="type-body-caption text-text-muted">{t('replacement')}</p>
                  <Button type="button" variant="ghost" disabled={busy} onClick={() => setSlot('')}>
                    {t('newDocument')}
                  </Button>
                </div>
              )}
              <TextInput label={t('type')} name="documentType" maxLength={120} disabled={busy} fieldStyle="form" />
              <label className="flex cursor-pointer flex-col items-center gap-16 rounded-card border border-dashed border-border-strong bg-bg-muted p-24 text-center">
                <Icon name="folder" size={32} className="text-text-brand" />
                <span className="type-label-large">{t('choose')}</span>
                <span className="type-body-caption text-text-muted">{t('file')}</span>
                <span className={buttonClasses({ variant: 'outline', size: 'sm' })}>
                  {t('choose')}
                  <Icon name="upload" size={16} />
                </span>
                {file && (
                  <span className="max-w-full wrap-anywhere type-body-caption text-text-secondary">{file.name}</span>
                )}
                <input
                  data-testid="document-file"
                  name="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  disabled={busy}
                  required
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setUploaded(false);
                  }}
                  aria-label={t('choose')}
                  className="sr-only"
                />
              </label>
              <p className="type-label-caption text-text-muted">{t('versions')}</p>
              <Button type="submit" variant="primary" disabled={busy || !file}>
                {busy ? t('uploading') : t('upload')}
              </Button>
              {file && !busy && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(event) => {
                    event.currentTarget.form?.reset();
                    setFile(null);
                    setSlot('');
                    setError(null);
                  }}
                >
                  {t('clear')}
                </Button>
              )}
            </form>
          </DocumentUploadArea>
        )}
        {busy && !uploaded && (
          <div role="status" className="flex flex-col gap-8">
            <p className="type-body-caption text-text-brand">{progress === 100 ? t('waiting') : t('uploading')}</p>
            <progress
              aria-label={t('progress')}
              max={100}
              value={progress ?? undefined}
              className="h-8 w-full accent-brand-primary"
            />
          </div>
        )}
        {uploaded && (
          <p role="status" className="type-body-caption text-text-brand">
            {t('uploaded')}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-status-favorite p-12 type-body-caption text-status-error">
            {error}
          </p>
        )}
      </div>
    </WizardCard>
  );
}
