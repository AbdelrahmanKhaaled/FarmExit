'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';

export function NewPartnershipRequestForm({
  farms,
  initialFarmId,
}: {
  farms: { id: string; name: string }[];
  initialFarmId?: string;
}) {
  const t = useTranslations('workspace.partnerships');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  if (farms.length === 0) {
    return <p className="type-body-caption text-text-secondary">{t('noOwnerFarms')}</p>;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const farmId = String(form.get('farmId'));
    const body = {
      description: String(form.get('description') ?? '').trim() || undefined,
      objective: String(form.get('objective') ?? '')
        .split('\n')
        .map((g) => g.trim())
        .filter(Boolean),
    };
    const res = await fetch(`/api/farms/${farmId}/partnership-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setError(t('createError'));
      return;
    }
    const created = (await res.json()) as { id: string };
    router.push(`/my/partnerships/${created.id}`);
  }

  return (
    <Surface className="p-24">
      <form onSubmit={onSubmit} className="flex flex-col gap-12" data-testid="new-partnership-form">
        <Select label={t('farm')} name="farmId" required fieldStyle="form" defaultValue={initialFarmId ?? farms[0]?.id}>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </Select>
        <label className="flex flex-col gap-8">
          <span className="type-label-form">{t('description')}</span>
          <textarea name="description" rows={4} className="rounded-lg border border-border-subtle px-12 py-8" />
        </label>
        <label className="flex flex-col gap-8">
          <span className="type-label-form">{t('objective')}</span>
          <textarea name="objective" rows={3} className="rounded-lg border border-border-subtle px-12 py-8" />
        </label>
        <Button type="submit" variant="primary">{t('create')}</Button>
        {error && <p className="type-body-caption text-status-error">{error}</p>}
      </form>
    </Surface>
  );
}
