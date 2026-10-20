'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Select, TextInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Choice } from './TaskFrame';
import { governorates } from '@/lib/data/marketplace';
import { GOVERNORATE_API_LABEL } from '@/lib/data/marketplace-api';

const known = Object.values(GOVERNORATE_API_LABEL);

export function GovernorateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('workspace.phase7');
  const names = useTranslations('marketplace.governorates');
  const [custom, setCustom] = useState(Boolean(value && !known.includes(value)));
  return (
    <>
      <Select
        label={label}
        name="baseGovernorate"
        value={custom ? 'custom' : value}
        onChange={(e) => {
          setCustom(e.target.value === 'custom');
          onChange(e.target.value === 'custom' ? '' : e.target.value);
        }}
      >
        <option value="">{t('chooseGovernorate')}</option>
        {governorates.map((key) => (
          <option key={key} value={GOVERNORATE_API_LABEL[key]}>
            {names(key)}
          </option>
        ))}
        <option value="custom">{t('otherGovernorate')}</option>
      </Select>
      {custom && (
        <TextInput
          label={t('otherGovernorate')}
          name="customGovernorate"
          value={value}
          maxLength={120}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </>
  );
}

export function ServiceAreasField({
  label,
  values,
  onChange,
  disabled,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabled: boolean;
}) {
  const t = useTranslations('workspace.phase7');
  const names = useTranslations('marketplace.governorates');
  const [custom, setCustom] = useState('');
  const choices = [...known, ...values.filter((v) => !known.includes(v))];
  const display = (value: string) => {
    const key = governorates.find((key) => GOVERNORATE_API_LABEL[key] === value);
    return key ? names(key) : value;
  };
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-8 type-label-small-strong text-text-secondary">{label}</legend>
      <details className="rounded-lg border border-border-strong bg-bg-surface p-16">
        <summary className="cursor-pointer type-label-large wrap-anywhere">
          {values.map(display).join(', ') || t('chooseGovernorate')}
        </summary>
        <div className="mt-16 flex flex-col gap-12">
          {choices.map((value) => (
            <Choice
              key={value}
              name="serviceAreas"
              value={value}
              label={display(value)}
              checked={values.includes(value)}
              onChange={() => onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])}
            />
          ))}
          <TextInput
            label={t('otherGovernorate')}
            name="otherServiceArea"
            value={custom}
            maxLength={120}
            onChange={(e) => setCustom(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!custom.trim() || values.length >= 30}
            onClick={() => {
              if (!values.includes(custom.trim())) onChange([...values, custom.trim()]);
              setCustom('');
            }}
          >
            {t('addArea')}
          </Button>
        </div>
      </details>
    </fieldset>
  );
}
