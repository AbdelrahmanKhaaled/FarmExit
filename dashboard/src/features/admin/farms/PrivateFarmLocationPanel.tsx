'use client';

import { useTranslations } from 'next-intl';

export type PrivateFarmLocation = {
  farmId: string;
  privatePinLatitude: number | null;
  privatePinLongitude: number | null;
  nearestMainRoad: string | null;
  roadDistanceKm: number | null;
};

type Props = {
  location: PrivateFarmLocation | null;
  denied: boolean;
  readOnly: boolean;
};

function PinMap({ lat, lng }: { lat: number; lng: number }) {
  const delta = 0.02;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return (
    <iframe
      title="Private farm location"
      className="h-48 w-full rounded border border-[var(--admin-border-subtle)]"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`}
    />
  );
}

export function PrivateFarmLocationPanel({ location, denied, readOnly }: Props) {
  const t = useTranslations('admin.privateLocation');

  if (denied) {
    return <p className="text-sm text-[var(--admin-text-muted)]">{t('denied')}</p>;
  }

  if (!location) {
    return <p className="text-sm text-[var(--admin-text-muted)]">{t('unavailable')}</p>;
  }

  const hasPin = location.privatePinLatitude != null && location.privatePinLongitude != null;

  return (
    <div className="space-y-3 rounded border border-[var(--admin-border-subtle)] p-4 text-sm">
      <p className="text-xs text-[var(--admin-text-muted)]">{t('confidential')}</p>
      {readOnly ? <p className="text-xs text-[var(--admin-text-muted)]">{t('staffReadOnly')}</p> : null}
      {hasPin ? (
        <>
          <p className="font-mono text-xs">
            {location.privatePinLatitude!.toFixed(6)}, {location.privatePinLongitude!.toFixed(6)}
          </p>
          <PinMap lat={location.privatePinLatitude!} lng={location.privatePinLongitude!} />
        </>
      ) : (
        <p className="text-[var(--admin-text-muted)]">{t('noCoordinates')}</p>
      )}
      {location.nearestMainRoad ? (
        <p>{t('road')}: {location.nearestMainRoad}{location.roadDistanceKm != null ? ` (${location.roadDistanceKm} km)` : ''}</p>
      ) : null}
    </div>
  );
}
