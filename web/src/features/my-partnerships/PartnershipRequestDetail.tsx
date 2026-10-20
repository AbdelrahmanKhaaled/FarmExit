'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';

export type PartnershipRequest = {
  id: string;
  requestNumber: string;
  farmId: string;
  farmName: string;
  status: string;
  description: string | null;
  objective: string[] | null;
  reviews: { decision: string; comment: string | null; createdAt: string | null }[];
};

const EDITABLE = new Set(['draft', 'changesRequested']);

export function PartnershipRequestDetail({ initial }: { initial: PartnershipRequest }) {
  const t = useTranslations('workspace.partnerships');
  const router = useRouter();
  const [req, setReq] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const canEdit = EDITABLE.has(req.status);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    const form = new FormData(e.currentTarget);
    const goalsRaw = String(form.get('objective') ?? '').trim();
    const body = {
      description: String(form.get('description') ?? '').trim() || null,
      objective: goalsRaw ? goalsRaw.split('\n').map((g) => g.trim()).filter(Boolean) : [],
      contributionDetails: String(form.get('contributionDetails') ?? '').trim() || undefined,
      operations: String(form.get('operations') ?? '').trim() || undefined,
      salesChannel: String(form.get('salesChannel') ?? '').trim() || undefined,
      extraInformation: String(form.get('extraInformation') ?? '').trim() || undefined,
    };
    const res = await fetch(`/api/partnership-requests/${req.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(t('saveError'));
      return;
    }
    setReq((await res.json()) as PartnershipRequest);
    setMessage(t('saved'));
  }

  async function submitForReview() {
    const res = await fetch(`/api/partnership-requests/${req.id}/submit`, { method: 'POST' });
    if (!res.ok) {
      setError(t('submitError'));
      return;
    }
    setReq((await res.json()) as PartnershipRequest);
    setMessage(t('submitted'));
    router.push(`/my/requests/${req.id}`);
  }

  return (
    <div className="flex flex-col gap-16" data-testid="partnership-request-detail">
      <h2 className="type-display-h4">{req.requestNumber}</h2>
      <Surface className="flex flex-col gap-8 p-24">
        <p><span className="type-label-meta text-text-muted">{t('farm')}</span> {req.farmName}</p>
        <p>
          <span className="type-label-meta text-text-muted">{t('status')}</span>{' '}
          {(t as (k: string, o?: { defaultValue?: string }) => string)(`statuses.${req.status}`, {
            defaultValue: req.status,
          })}
        </p>
      </Surface>
      <p className="type-body-caption text-text-muted">{t('nonbindingNote')}</p>
      {canEdit && (
        <Surface className="p-24">
          <form onSubmit={save} className="flex flex-col gap-12">
            <label className="flex flex-col gap-8">
              <span className="type-label-form">{t('description')}</span>
              <textarea name="description" defaultValue={req.description ?? ''} rows={4} className="rounded-lg border border-border-subtle px-12 py-8" />
            </label>
            <label className="flex flex-col gap-8">
              <span className="type-label-form">{t('objective')}</span>
              <textarea
                name="objective"
                defaultValue={(req.objective ?? []).join('\n')}
                rows={3}
                className="rounded-lg border border-border-subtle px-12 py-8"
                placeholder={t('objectiveHint')}
              />
            </label>
            <TextInput label={t('contributionDetails')} name="contributionDetails" fieldStyle="form" />
            <TextInput label={t('operations')} name="operations" fieldStyle="form" />
            <TextInput label={t('salesChannel')} name="salesChannel" fieldStyle="form" />
            <TextInput label={t('extraInformation')} name="extraInformation" fieldStyle="form" />
            <Button type="submit" variant="outline" size="sm">{t('saveDraft')}</Button>
          </form>
          <Button type="button" variant="primary" className="mt-16" onClick={() => void submitForReview()}>
            {t('submit')}
          </Button>
        </Surface>
      )}
      {req.reviews.length > 0 && (
        <Surface className="p-24">
          <h3 className="type-heading-h4">{t('reviews')}</h3>
          <ul className="mt-12 flex flex-col gap-8">
            {req.reviews.map((r, i) => (
              <li key={i} className="type-body-caption text-text-secondary">
                {r.decision}: {r.comment ?? '—'}
              </li>
            ))}
          </ul>
        </Surface>
      )}
      {message && <p className="type-body-caption text-text-brand">{message}</p>}
      {error && <p className="type-body-caption text-status-error">{error}</p>}
    </div>
  );
}
