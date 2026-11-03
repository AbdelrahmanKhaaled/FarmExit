'use client';
import { useSyncExternalStore, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { AddFarmWizard, type AddFarmWizardProps } from './AddFarmWizard';
import { readEntryMode, type EntryMode } from './entry-mode';

/** Resolve browser-owned draft metadata before mounting editable controls or autosave. */
const subscribe = () => () => {};
export function EntryModeWizard(props: AddFarmWizardProps) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const t = useTranslations('home.hero.search');
  if (!hydrated) return <p role="status">{t('loading')}</p>;
  return (
    <ResolvedEntryWizard
      key={[props.user.id, props.initialListing?.id, props.initialFarm?.id, props.entryMode].join(':')}
      {...props}
    />
  );
}
function ResolvedEntryWizard(props: AddFarmWizardProps) {
  const t = useTranslations('home.hero.search');
  const [resolved, setResolved] = useState<{ mode?: EntryMode; conflict?: boolean; failed?: boolean }>(() => {
    try {
      const stored = props.initialListing
        ? readEntryMode(props.user.id, props.initialListing.id)
        : props.initialFarm
          ? readEntryMode(props.user.id, `farm:${props.initialFarm.id}`)
          : undefined;
      const mode = stored ?? props.entryMode;
      const conflict = Boolean(
        (stored && props.entryMode && stored !== props.entryMode) ||
        (mode && props.initialListing && props.initialListing.listingType !== (mode === 'rent' ? 'rent' : 'sale')),
      );
      // Test storage before enabling a mode whose persistence relies on this browser.
      if (mode) {
        localStorage.setItem('fx:entry-storage-check', '1');
        localStorage.removeItem('fx:entry-storage-check');
      }
      return { mode, conflict };
    } catch {
      return { failed: Boolean(props.entryMode || props.initialListing || props.initialFarm), mode: undefined };
    }
  });
  if (!resolved) return <p role="status">{t('loading')}</p>;
  if (resolved.failed) return <p role="alert">{t('storageError')}</p>;
  if (resolved.conflict)
    return (
      <div className="flex flex-col gap-16 p-24">
        <p role="alert">{t('conflict')}</p>
        <button
          type="button"
          onClick={() => {
            const mode =
              props.initialListing &&
              resolved.mode &&
              props.initialListing.listingType !== (resolved.mode === 'rent' ? 'rent' : 'sale')
                ? undefined
                : resolved.mode;
            const query = new URLSearchParams(window.location.search);
            if (mode) query.set('entryMode', mode);
            else query.delete('entryMode');
            window.history.replaceState(null, '', window.location.pathname + '?' + query);
            setResolved({ mode });
          }}
        >
          {t('original')}
        </button>
        <Link href={`/my/farms/new?entryMode=${props.entryMode ?? resolved.mode}`}>{t('newListing')}</Link>
      </div>
    );
  return <AddFarmWizard {...props} entryMode={resolved.mode} />;
}
