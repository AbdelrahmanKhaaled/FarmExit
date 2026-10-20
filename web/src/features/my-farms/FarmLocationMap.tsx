'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui/Button';
import 'leaflet/dist/leaflet.css';

export type FarmPin = { latitude: number; longitude: number };
type Props = { pin: FarmPin | null; disabled: boolean; onChange: (pin: FarmPin | null) => void };

export function FarmLocationMap({ pin, disabled, onChange }: Props) {
  const t = useTranslations('workspace.wizard');
  const container = useRef<HTMLDivElement>(null);
  const icon = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const latest = useRef({ pin, onChange });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    latest.current = { pin, onChange };
  }, [pin, onChange]);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    // Leaflet accesses window at module evaluation: import only after mounting in the browser.
    void import('leaflet')
      .then((L) => {
        if (disposed || !container.current) return;
        const current = latest.current.pin;
        const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: !disabled });
        map.current = instance;
        // Egypt is only the initial viewport, never a selected or saved location.
        instance.setView(current ? [current.latitude, current.longitude] : [26.8, 30.8], current ? 15 : 5);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(instance);
        tiles.on('loading', () => setLoading(true));
        tiles.on('load', () => setLoading(false));
        tiles.on('tileerror', () => {
          setFailed(true);
          setLoading(false);
        });
        const select = (latitude: number, longitude: number) => {
          if (disabled) return;
          latest.current.onChange({ latitude: Number(latitude.toFixed(8)), longitude: Number(longitude.toFixed(8)) });
        };
        const place = () => {
          const value = latest.current.pin;
          if (!value) {
            marker.current?.remove();
            marker.current = null;
            return;
          }
          if (marker.current) marker.current.setLatLng([value.latitude, value.longitude]);
          else {
            marker.current = L.marker([value.latitude, value.longitude], {
              draggable: !disabled,
              title: t('selectedPin'),
              alt: t('selectedPin'),
              icon: L.divIcon({
                html: icon.current?.innerHTML ?? '',
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
              }),
            }).addTo(instance);
            marker.current.on('dragend', () => {
              const position = marker.current!.getLatLng();
              select(position.lat, position.lng);
            });
          }
        };
        instance.on('click', (event) => select(event.latlng.lat, event.latlng.wrap().lng));
        // The marker is controlled by React; keep its renderer local to this map instance.
        instance.on('farm-pin-change', place);
        place();
        observer = new ResizeObserver(() => instance.invalidateSize());
        observer.observe(container.current);
      })
      .catch(() => {
        if (!disposed) {
          setFailed(true);
          setLoading(false);
        }
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [disabled, t]);

  useEffect(() => {
    map.current?.fire('farm-pin-change');
  }, [pin]);

  return (
    <div className="flex flex-col gap-16" data-testid="farm-location-picker">
      <div ref={icon} hidden aria-hidden="true">
        <span className="flex size-40 items-center justify-center rounded-full border-2 border-white bg-brand-primary text-white shadow-sm">
          <Icon name="location-pin" size={24} />
        </span>
      </div>
      <div className="relative isolate overflow-hidden rounded-lg border border-border-subtle bg-bg-muted">
        <div ref={container} className="h-280 w-full" dir="ltr" role="region" aria-label={t('mapLabel')} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-12">
        <p className="type-body-caption text-text-muted" role="status">
          {loading ? t('mapLoading') : failed ? t('mapTileError') : pin ? t('selectedPin') : t('selectPinHint')}
        </p>
        <div className="flex flex-wrap gap-8">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || loading}
            onClick={() => {
              const center = map.current?.getCenter();
              if (center)
                onChange({ latitude: Number(center.lat.toFixed(8)), longitude: Number(center.wrap().lng.toFixed(8)) });
            }}
          >
            {t('placePin')}
          </Button>
          {pin && (
            <Button type="button" variant="outline" disabled={disabled} onClick={() => onChange(null)}>
              {t('clearPin')}
            </Button>
          )}
        </div>
      </div>
      {pin && (
        <output className="sr-only" dir="ltr" data-testid="selected-coordinates">
          {pin.latitude.toFixed(8)}, {pin.longitude.toFixed(8)}
        </output>
      )}
    </div>
  );
}
