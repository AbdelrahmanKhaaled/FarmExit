'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';

export type PartnershipApplication = {
  id: string;
  requestNumber: string;
  status: string;
  parentPartnershipRequestId: string;
  applicantKind: string | null;
  applicationMessage: string | null;
  whyGoodFit: string | null;
  companyName: string | null;
  reviews: { decision: string; comment: string | null }[];
};

const EDITABLE = new Set(['draft', 'changesRequested']);

export function PartnershipApplicationDetail({ initial }: { initial: PartnershipApplication }) {
  const t = useTranslations('workspace.applications');
  const router = useRouter();
  const [app, setApp] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const canEdit = EDITABLE.has(app.status);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    const form = new FormData(e.currentTarget);
    const body = {
      applicationMessage: String(form.get('applicationMessage') ?? '').trim() || null,
      whyGoodFit: String(form.get('whyGoodFit') ?? '').trim() || null,
      relevantExperience: String(form.get('relevantExperience') ?? '').trim() || null,
      companyName: String(form.get('companyName') ?? '').trim() || undefined,
      companyContactName: String(form.get('companyContactName') ?? '').trim() || undefined,
    };
    const res = await fetch(`/api/partnership-applications/${app.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(t('saveError'));
      return;
    }
    setApp((await res.json()) as PartnershipApplication);
    setMessage(t('saved'));
  }

  async function uploadDocument(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    setUploading(true);
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      setError(t('fileRequired'));
      setUploading(false);
      return;
    }
    const body = new FormData();
    body.append('file', file);
    body.append('slotKey', String(form.get('slotKey') ?? 'supporting_document_1'));
    const res = await fetch(`/api/requests/${app.id}/documents`, { method: 'POST', body });
    setUploading(false);
    if (!res.ok) {
      setError(t('uploadError'));
      return;
    }
    setMessage(t('documentUploaded'));
    formElement.reset();
  }

  async function submitApplication() {
    const res = await fetch(`/api/partnership-applications/${app.id}/submit`, { method: 'POST' });
    if (!res.ok) {
      setError(t('submitError'));
      return;
    }
    setApp((await res.json()) as PartnershipApplication);
    router.push(`/my/requests/${app.id}`);
  }

  return (
    <div className="flex flex-col gap-16" data-testid="partnership-application-detail">
      <h2 className="type-display-h4">{app.requestNumber}</h2>
      <Surface className="flex flex-col gap-8 p-24">
        <p>
          <span className="type-label-meta text-text-muted">{t('parent')}</span> {app.parentPartnershipRequestId}
        </p>
        <p>
          <span className="type-label-meta text-text-muted">{t('kind')}</span> {app.applicantKind ?? '—'}
        </p>
        <p>
          <span className="type-label-meta text-text-muted">{t('status')}</span>{' '}
          {(t as (k: string, o?: { defaultValue?: string }) => string)(`statuses.${app.status}`, {
            defaultValue: app.status,
          })}
        </p>
      </Surface>
      <p className="type-body-caption text-text-muted">{t('nonbindingNote')}</p>
      {canEdit && (
        <>
          <Surface className="p-24">
            <form onSubmit={save} className="flex flex-col gap-12">
              <label className="flex flex-col gap-8">
                <span className="type-label-form">{t('message')}</span>
                <textarea
                  name="applicationMessage"
                  defaultValue={app.applicationMessage ?? ''}
                  rows={4}
                  className="rounded-lg border border-border-subtle px-12 py-8"
                />
              </label>
              <label className="flex flex-col gap-8">
                <span className="type-label-form">{t('whyGoodFit')}</span>
                <textarea
                  name="whyGoodFit"
                  defaultValue={app.whyGoodFit ?? ''}
                  rows={3}
                  className="rounded-lg border border-border-subtle px-12 py-8"
                />
              </label>
              <TextInput label={t('experience')} name="relevantExperience" fieldStyle="form" />
              {app.applicantKind === 'company' && (
                <>
                  <TextInput
                    label={t('companyName')}
                    name="companyName"
                    defaultValue={app.companyName ?? ''}
                    fieldStyle="form"
                  />
                  <TextInput label={t('companyContact')} name="companyContactName" fieldStyle="form" />
                </>
              )}
              <Button type="submit" variant="outline" size="sm">
                {t('saveDraft')}
              </Button>
            </form>
          </Surface>
          <Surface className="p-24">
            <h3 className="type-heading-h4">{t('documentsTitle')}</h3>
            <form onSubmit={uploadDocument} className="mt-12 flex flex-col gap-12">
              <input name="slotKey" type="hidden" value="supporting_document_1" />
              <label className="flex flex-col gap-8">
                <span className="type-label-form">{t('file')}</span>
                <input name="file" type="file" required className="type-body-small" />
              </label>
              <Button type="submit" variant="outline" size="sm" disabled={uploading}>
                {t('upload')}
              </Button>
            </form>
            <Button type="button" variant="primary" className="mt-16" onClick={() => void submitApplication()}>
              {t('submit')}
            </Button>
          </Surface>
        </>
      )}
      {app.reviews.length > 0 && (
        <Surface className="p-24">
          <h3 className="type-heading-h4">{t('reviews')}</h3>
          <ul className="mt-12 flex flex-col gap-8">
            {app.reviews.map((r, i) => (
              <li key={i} className="type-body-caption text-text-secondary">
                {r.decision}: {r.comment ?? '—'}
              </li>
            ))}
          </ul>
        </Surface>
      )}
      <Link href="/my/applications" className="type-label-button text-text-brand">
        {t('back')}
      </Link>
      {message && <p className="type-body-caption text-text-brand">{message}</p>}
      {error && <p className="type-body-caption text-status-error">{error}</p>}
    </div>
  );
}
