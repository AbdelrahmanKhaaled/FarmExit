'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';

export function NewPartnershipApplicationForm({ parentId }: { parentId: string }) {
  const t = useTranslations('workspace.applications');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/partnership-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        parentPartnershipRequestId: parentId,
        applicantKind: String(form.get('applicantKind')),
      }),
    });
    if (!res.ok) {
      setError(t('createError'));
      return;
    }
    const created = (await res.json()) as { id: string };
    router.push(`/my/applications/${created.id}`);
  }

  return (
    <Surface className="p-24">
      <form onSubmit={create} className="flex flex-col gap-12" data-testid="new-partnership-application-form">
        <p className="type-body-caption text-text-muted">{t('parent')}: {parentId}</p>
        <label className="flex flex-col gap-8">
          <span className="type-label-form">{t('kind')}</span>
          <select name="applicantKind" required className="rounded-lg border border-border-subtle px-12 py-8">
            <option value="individual">{t('individual')}</option>
            <option value="company">{t('company')}</option>
          </select>
        </label>
        <Button type="submit" variant="primary">{t('create')}</Button>
        {error && <p className="type-body-caption text-status-error">{error}</p>}
      </form>
    </Surface>
  );
}

export function NewPartnershipApplicationMissingParent() {
  const t = useTranslations('workspace.applications');
  return (
    <Surface className="p-32 text-center text-text-secondary">
      <p>{t('noParent')}</p>
      <Link href="/my/applications" className="mt-16 inline-block type-label-button text-text-brand">{t('back')}</Link>
    </Surface>
  );
}
