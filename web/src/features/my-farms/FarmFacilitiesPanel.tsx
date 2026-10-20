'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/icons/Icon';
import { WizardCard } from './WizardCard';

const FACILITY_TYPES = [
  'cold_storage_freezing',
  'produce_storage',
  'agricultural_processing_packing',
  'agricultural_service_facility',
] as const;

export type Facility = {
  id: string;
  facilityType: string;
  name: string;
  description: string | null;
  governorate: string | null;
  areaName: string | null;
  status: string;
};

export function FarmFacilitiesPanel({
  farmId,
  canEdit,
  onPendingChange,
  onLoaded,
}: {
  farmId: string;
  canEdit: boolean;
  onPendingChange?: (pending: boolean) => void;
  onLoaded?: (items: Facility[] | null) => void;
}) {
  const t = useTranslations('workspace.facilities');
  const w = useTranslations('workspace.wizard');
  const [formDirty, setFormDirty] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [savingFacility, setSavingFacility] = useState(false);
  useEffect(() => {
    onPendingChange?.(formDirty);
    return () => onPendingChange?.(false);
  }, [formDirty, onPendingChange]);
  const [items, setItems] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/farms/${farmId}/facilities?page=1&pageSize=50`).catch(() => null);
    if (!res?.ok) {
      setError(t('loadError'));
      onLoaded?.(null);
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { items: Facility[] };
    setItems(data.items);
    onLoaded?.(data.items);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/farms/${farmId}/facilities?page=1&pageSize=50`).catch(() => null);
      if (!active) return;
      if (!res?.ok) {
        setError(t('loadError'));
        onLoaded?.(null);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { items: Facility[] };
      setItems(data.items);
      onLoaded?.(data.items);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [farmId, t, onLoaded]);

  async function createFacility(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit || savingFacility) return;
    setError(null);
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const body = {
      facilityType: String(form.get('facilityType')),
      name: String(form.get('name') ?? '').trim(),
      description: String(form.get('description') ?? '').trim() || null,
      governorate: String(form.get('governorate') ?? '').trim() || null,
      areaName: String(form.get('areaName') ?? '').trim() || null,
    };
    setSavingFacility(true);
    const res = await fetch(`/api/farms/${farmId}/facilities`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    setSavingFacility(false);
    if (!res?.ok) {
      setError(t('saveError'));
      return;
    }
    formElement.reset();
    setSelectedType('');
    setFormDirty(false);
    await reload();
  }

  async function updateFacility(e: React.FormEvent<HTMLFormElement>, facilityId: string) {
    e.preventDefault();
    if (!canEdit || savingFacility) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get('name') ?? '').trim(),
      description: String(form.get('description') ?? '').trim() || null,
      governorate: String(form.get('governorate') ?? '').trim() || null,
      areaName: String(form.get('areaName') ?? '').trim() || null,
    };
    setSavingFacility(true);
    const res = await fetch(`/api/farms/${farmId}/facilities/${facilityId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    setSavingFacility(false);
    if (!res?.ok) {
      setError(t('saveError'));
      return;
    }
    setEditingId(null);
    setFormDirty(false);
    await reload();
  }

  return (
    <WizardCard title={t('title')} icon="building" description={w('unsupportedFacilities')}>
      <div data-testid="farm-facilities-panel">
        {loading && <p className="mt-12 type-body-caption text-text-muted">{t('loading')}</p>}
        {error && <p className="mt-12 type-body-caption text-status-error">{error}</p>}
        {!canEdit && !loading && !error && items.length === 0 && (
          <p className="mt-12 type-body-caption text-text-secondary">{t('empty')}</p>
        )}
        <ul className={items.length ? 'mb-24 flex flex-col gap-16' : undefined}>
          {items.map((f) => (
            <li key={f.id} className="rounded-lg border border-border-subtle p-16">
              <p className="type-label-medium">{f.name}</p>
              <p className="type-body-caption text-text-muted">
                {(t as (k: string) => string)(`types.${f.facilityType}`)}
              </p>
              {editingId === f.id && (canEdit || formDirty) ? (
                <form
                  hidden={!canEdit}
                  onChange={() => setFormDirty(true)}
                  onSubmit={(e) => updateFacility(e, f.id)}
                  className="mt-12 flex flex-col gap-8"
                >
                  <fieldset disabled={savingFacility} className="contents">
                    <TextInput label={t('name')} name="name" defaultValue={f.name} required fieldStyle="form" />
                    <TextInput
                      label={t('description')}
                      name="description"
                      defaultValue={f.description ?? ''}
                      fieldStyle="form"
                    />
                    <TextInput
                      label={t('governorate')}
                      name="governorate"
                      defaultValue={f.governorate ?? ''}
                      fieldStyle="form"
                    />
                    <TextInput
                      label={t('areaName')}
                      name="areaName"
                      defaultValue={f.areaName ?? ''}
                      fieldStyle="form"
                    />
                    <div className="flex gap-8">
                      <Button type="submit" variant="primary" size="sm">
                        {t('save')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setFormDirty(false);
                        }}
                      >
                        {t('cancel')}
                      </Button>
                    </div>
                  </fieldset>
                </form>
              ) : (
                <>
                  {f.description && <p className="mt-8 type-body-caption text-text-secondary">{f.description}</p>}
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-12"
                      onClick={() => setEditingId(f.id)}
                    >
                      {t('edit')}
                    </Button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        {(canEdit || formDirty) && (
          <form
            hidden={!canEdit}
            onChange={() => setFormDirty(true)}
            onSubmit={createFacility}
            className="flex flex-col gap-12"
          >
            <fieldset disabled={savingFacility} className="contents">
              <fieldset>
                <legend className="mb-12 type-label-form">{t('type')}</legend>
                <div className="grid grid-cols-2 gap-12">
                  {FACILITY_TYPES.map((type) => (
                    <label
                      key={type}
                      className={`flex min-h-56 cursor-pointer items-center gap-8 rounded-lg border p-12 type-label-small-strong ${selectedType === type ? 'border-brand-primary bg-bg-selected text-text-brand' : 'border-border-hairline'}`}
                    >
                      <Icon name="building" size={18} className="hidden shrink-0 tablet:block" />
                      <span className="min-w-0 flex-1">{t(`types.${type}`)}</span>
                      <input
                        type="radio"
                        name="facilityType"
                        value={type}
                        required
                        checked={selectedType === type}
                        onChange={() => setSelectedType(type)}
                        className="size-18 shrink-0 accent-brand-primary"
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
              <div hidden={!selectedType} className="flex flex-col gap-16">
                <TextInput label={t('name')} name="name" required fieldStyle="form" />
                <TextInput label={t('description')} name="description" fieldStyle="form" />
                <TextInput label={t('governorate')} name="governorate" fieldStyle="form" />
                <TextInput label={t('areaName')} name="areaName" fieldStyle="form" />
                <Button type="submit" variant="primary" size="sm">
                  {t('add')}
                </Button>
                {formDirty && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(event) => {
                      event.currentTarget.form?.reset();
                      setSelectedType('');
                      setFormDirty(false);
                    }}
                  >
                    {w('clearFacility')}
                  </Button>
                )}
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </WizardCard>
  );
}
