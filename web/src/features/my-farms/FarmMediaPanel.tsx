'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, buttonClasses } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';
import { WizardCard } from './WizardCard';
import { Icon } from '@/components/icons/Icon';
import { uploadPrivateFile } from './upload';

type MediaItem = {
  id: string;
  altEn: string | null;
  altAr: string | null;
  contentType: string;
  isIllustrative: boolean;
};

export function FarmMediaPanel({
  farmId,
  canUpload,
  onBusyChange,
  onPendingChange,
}: {
  farmId: string;
  canUpload: boolean;
  onBusyChange?: (busy: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const t = useTranslations('workspace.media');
  const w = useTranslations('workspace.wizard.media');
  const [percent, setPercent] = useState<number | null>(null);

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [selected, setSelected] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [formTouched, setFormTouched] = useState(false);
  useEffect(() => {
    onPendingChange?.(selected);
    return () => onPendingChange?.(false);
  }, [selected, onPendingChange]);
  useEffect(() => {
    onBusyChange?.(uploading);
    return () => onBusyChange?.(false);
  }, [uploading, onBusyChange]);

  async function reload() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/farms/${farmId}/media?page=1&pageSize=50`).catch(() => null);
    if (!res?.ok) {
      setError(t('loadError'));
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { items: MediaItem[] };
    setItems(data.items);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/farms/${farmId}/media?page=1&pageSize=50`).catch(() => null);
      if (!active) return;
      if (!res?.ok) {
        setError(t('loadError'));
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { items: MediaItem[] };
      setItems(data.items);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [farmId, t]);

  async function uploadMedia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canUpload || uploading) return;
    setError(null);
    setUploading(true);
    setProgress(t('uploading'));
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('fileRequired'));
      setUploading(false);
      setProgress(null);
      return;
    }
    const body = new FormData();
    body.append('file', file);
    const altEn = String(form.get('altEn') ?? '').trim();
    const altAr = String(form.get('altAr') ?? '').trim();
    if (altEn) body.append('altEn', altEn);
    if (altAr) body.append('altAr', altAr);
    if (form.get('isIllustrative') === 'on') body.append('isIllustrative', 'true');

    try {
      setPercent(null);
      await uploadPrivateFile(`/api/farms/${farmId}/media`, body, setPercent);
      formElement.reset();
      setSelected(false);
      setSelectedName('');
      setFormTouched(false);
      await reload();
    } catch {
      setError(t('uploadError'));
    } finally {
      setUploading(false);
      setProgress(null);
      setPercent(null);
    }
  }

  return (
    <WizardCard title={t('title')} icon="gallery" description={t('privateNote')}>
      <div data-testid="farm-media-panel">
        {loading && <p className="mt-12 type-body-caption text-text-muted">{t('loading')}</p>}
        {error && (
          <p
            role="alert"
            className="mt-12 rounded-lg border border-status-favorite p-12 type-body-caption text-status-error"
          >
            {error}
          </p>
        )}
        {progress && (
          <div role="status" className="mt-12 flex flex-col gap-8">
            <p className="type-body-caption text-text-brand">{percent === 100 ? w('waiting') : progress}</p>
            <progress
              aria-label={w('progress')}
              max={100}
              value={percent ?? undefined}
              className="h-8 w-full accent-brand-primary"
            />
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="mt-12 type-body-caption text-text-secondary">{t('empty')}</p>
        )}
        <ul className="mt-16 grid grid-cols-2 gap-12 tablet:grid-cols-3">
          {items.map((m) => (
            <li key={m.id} className="flex flex-col gap-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/farms/${farmId}/media/${m.id}/file`}
                alt={m.altEn ?? m.altAr ?? t('imageAlt')}
                className="aspect-video w-full rounded-lg object-cover bg-bg-muted"
              />
              <p className="type-label-caption text-text-muted">{m.isIllustrative ? t('illustrative') : t('photo')}</p>
            </li>
          ))}
        </ul>
        {(canUpload || selected || formTouched) && (
          <form
            hidden={!canUpload}
            onChange={() => setFormTouched(true)}
            onSubmit={uploadMedia}
            className="mt-24 flex flex-col gap-12 border-t border-border-subtle pt-24"
          >
            <h4 className="type-heading-h5">{t('uploadTitle')}</h4>
            <label
              className="flex cursor-pointer flex-col items-center gap-16 rounded-card border border-dashed border-border-strong bg-bg-muted p-24 text-center"
              onDragOver={(event) => {
                if (canUpload && !uploading) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!canUpload || uploading || !fileInput.current || !event.dataTransfer.files[0]) return;
                const selection = new DataTransfer();
                selection.items.add(event.dataTransfer.files[0]);
                fileInput.current.files = selection.files;
                setSelected(true);
                setSelectedName(event.dataTransfer.files[0].name);
                setFormTouched(true);
                setError(null);
              }}
            >
              <Icon name="gallery" size={32} className="text-text-brand" />
              <span className="type-label-large">{w('drop')}</span>
              <span className="type-body-caption text-text-muted">{w('hint')}</span>
              <span className={buttonClasses({ variant: 'outline', size: 'sm' })}>
                {w('choose')}
                <Icon name="upload" size={16} />
              </span>
              {selectedName && (
                <span className="max-w-full wrap-anywhere type-body-caption text-text-secondary">{selectedName}</span>
              )}
              <input
                name="file"
                ref={fileInput}
                type="file"
                onChange={(event) => {
                  setSelected(Boolean(event.target.files?.length));
                  setSelectedName(event.target.files?.[0]?.name ?? '');
                }}
                aria-label={w('choose')}
                accept="image/jpeg,image/png,image/webp"
                required
                className="sr-only"
                disabled={uploading}
              />
            </label>
            <TextInput label={t('altEn')} name="altEn" fieldStyle="form" />
            <TextInput label={t('altAr')} name="altAr" fieldStyle="form" />
            <label className="flex items-center gap-8 type-body-small">
              <input name="isIllustrative" type="checkbox" />
              {t('illustrativeLabel')}
            </label>
            <Button type="submit" variant="primary" size="sm" disabled={uploading}>
              {uploading ? t('uploading') : t('upload')}
            </Button>
            {selected && !uploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.currentTarget.form?.reset();
                  setSelected(false);
                  setSelectedName('');
                  setFormTouched(false);
                  setError(null);
                }}
              >
                {w('clear')}
              </Button>
            )}
          </form>
        )}
      </div>
    </WizardCard>
  );
}
