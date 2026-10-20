'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, buttonClasses } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/icons/Icon';
import { PortalStatus } from '@/features/my-farmexit/PortalUI';
import { WizardCard } from './WizardCard';
import { jsonRequest } from './types';
import { uploadPrivateFile } from './upload';
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
  const [slot, setSlot] = useState('supporting_document_1');
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
    body.set('slotKey', slot.trim());
    setBusy(true);
    setProgress(null);
    try {
      await uploadPrivateFile(`/api/requests/${requestId}/documents`, body, setProgress);
      setItems(await jsonRequest<RequestDocument[]>(`/api/requests/${requestId}/documents`));
      setUploaded(true);
      setFile(null);
      form.reset();
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }
  return (
    <WizardCard icon="document-text" title={t('title')} description={t('privacy')}>
      <div data-testid="request-documents-panel" className="flex min-w-0 flex-col gap-16">
        {items?.length === 0 && <p className="type-body-caption text-text-muted">{t('empty')}</p>}
        <ul className="flex flex-col gap-16">
          {items?.map((item) => (
            <li
              key={item.id}
              className={`grid grid-cols-[24px_minmax(0,1fr)] items-start gap-12 rounded-lg border p-16 tablet:flex tablet:flex-wrap ${item.reviewStatus === 'changesRequested' ? 'border-overlay-gold-hairline bg-bg-notice' : 'border-border-hairline'}`}
            >
              <Icon name="document-text" size={24} className="shrink-0 text-text-brand" />
              <div className="min-w-0 flex-1">
                <p className="type-label-small-strong wrap-anywhere">{item.documentType || item.slotKey}</p>
                <p className="mt-6 type-label-caption wrap-anywhere text-text-muted">{item.originalName}</p>
                <div className="mt-8">
                  <PortalStatus status={item.reviewStatus} />
                </div>
                {item.reviewNote && <p className="mt-8 type-body-caption text-text-notice">{item.reviewNote}</p>}
              </div>
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
          <form
            hidden={!canEdit}
            onSubmit={upload}
            className="flex flex-col gap-16 border-t border-border-hairline pt-24"
          >
            <TextInput
              label={t('slot')}
              name="slotKey"
              required
              maxLength={60}
              value={slot}
              onChange={(event) => setSlot(event.target.value)}
              disabled={busy}
              fieldStyle="form"
            />
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
            <Button type="submit" variant="primary" disabled={busy || !file || !slot.trim()}>
              {busy ? t('uploading') : t('upload')}
            </Button>
            {file && !busy && (
              <Button
                type="button"
                variant="ghost"
                onClick={(event) => {
                  event.currentTarget.form?.reset();
                  setFile(null);
                  setError(null);
                }}
              >
                {t('clear')}
              </Button>
            )}
          </form>
        )}
        {busy && (
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
