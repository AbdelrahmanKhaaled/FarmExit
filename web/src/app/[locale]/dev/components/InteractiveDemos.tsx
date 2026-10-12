'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { AppliedChip, FilterChip } from '@/components/ui/Chip';
import { TextInput, Select, TextArea } from '@/components/ui/Field';
import { FavoriteButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { Dialog } from '@/components/overlay/Dialog';
import { Sheet } from '@/components/overlay/Sheet';
import type { Sample } from './samples';

/* Development-only: client-side demos for the Component Preview. */

export function ChipDemo({ s }: { s: Sample }) {
  const options = [
    { key: 'all', label: s.all, count: 9 },
    { key: 'sale', label: s.forSale, count: 6 },
    { key: 'rent', label: s.forRent, count: 3 },
  ];
  const [active, setActive] = useState('all');
  const [applied, setApplied] = useState(true);
  const tc = useTranslations('common.actions');
  return (
    <div className="flex flex-wrap items-center gap-8" data-testid="chip-demo">
      {options.map((o) => (
        <FilterChip key={o.key} active={active === o.key} count={o.count} onClick={() => setActive(o.key)}>
          {o.label}
        </FilterChip>
      ))}
      {applied && (
        <AppliedChip removeLabel={tc('removeFilter', { label: s.forSale })} onClick={() => setApplied(false)}>
          {s.forSale}
        </AppliedChip>
      )}
    </div>
  );
}

export function FavoriteDemo({ s }: { s: Sample }) {
  const [saved, setSaved] = useState(false);
  return <FavoriteButton saved={saved} label={s.favorite} onClick={() => setSaved((v) => !v)} />;
}

export function FieldDemo({ s }: { s: Sample }) {
  return (
    <div className="grid gap-24 tablet:grid-cols-2 desktop:grid-cols-3">
      <TextInput label={s.areaLabel} placeholder={s.areaPlaceholder} helper={s.areaHelper} inputMode="numeric" />
      <TextInput label={s.areaLabel} defaultValue="0" error={s.areaError} inputMode="numeric" />
      <TextInput label={s.areaLabel} defaultValue="120" disabled helper={s.areaHelper} />
      <Select label={s.governorate} placeholder={s.governoratePlaceholder} helper={s.governorateHelper}>
        {s.governorates.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </Select>
      <Select label={s.governorate} defaultValue={s.governorates[0]} helper={s.governorateHelper}>
        {s.governorates.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </Select>
      <Select label={s.governorate} placeholder={s.governoratePlaceholder} error={s.governorateError}>
        {s.governorates.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </Select>
      <Select label={s.governorate} fieldStyle="filter" defaultValue="">
        <option value="">{s.allGovernorates}</option>
        {s.governorates.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </Select>
      <TextArea label={s.message} placeholder={s.messagePlaceholder} className="tablet:col-span-2" />
    </div>
  );
}

export function OverlayDemo({ s }: { s: Sample }) {
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [side, setSide] = useState(false);
  return (
    <div className="flex flex-wrap gap-12">
      <Button variant="outline" onClick={() => setDialog(true)} data-testid="open-dialog">
        Dialog
      </Button>
      <Button variant="outline" onClick={() => setDrawer(true)} data-testid="open-drawer">
        Sheet · bottom
      </Button>
      <Button variant="outline" onClick={() => setSide(true)} data-testid="open-side-sheet">
        Sheet · end
      </Button>

      <Dialog open={dialog} onOpenChange={setDialog} title={s.dialogTitle} onBack={() => setDialog(false)}>
        <Text variant="body-default" tone="body">
          {s.dialogBody}
        </Text>
        <TextInput label={s.areaLabel} placeholder={s.areaPlaceholder} />
        <Button variant="primary" size="lg" fullWidth onClick={() => setDialog(false)}>
          {s.browse}
        </Button>
      </Dialog>

      <Sheet
        open={drawer}
        onOpenChange={setDrawer}
        title={s.filters}
        description={s.filtersSummary}
        footer={
          <>
            <Button variant="outline" size="lg" onClick={() => setDrawer(false)}>
              {s.clearAll}
            </Button>
            <Button variant="primary" size="lg" className="grow" onClick={() => setDrawer(false)}>
              {s.showFarms}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-24 pb-16">
          <Select label={s.governorate} fieldStyle="filter" defaultValue="">
            <option value="">{s.allGovernorates}</option>
            {s.governorates.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
          <TextInput label={s.areaLabel} placeholder={s.areaPlaceholder} />
          {Array.from({ length: 8 }, (_, i) => (
            <Text key={i} variant="body-small" tone="body">
              {s.body}
            </Text>
          ))}
        </div>
      </Sheet>

      <Sheet open={side} onOpenChange={setSide} side="end" title={s.previewTitle}>
        <div className="flex flex-col gap-16">
          <Text variant="heading-card-title" tone="primary">
            {s.cardTitle}
          </Text>
          <Text variant="body-default" tone="body">
            {s.body}
          </Text>
        </div>
      </Sheet>
    </div>
  );
}
