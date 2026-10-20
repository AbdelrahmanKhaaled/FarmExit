'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Field, controlFrameClasses } from '@/components/ui/Field';
import { normalizeMobile } from '@/lib/auth/phone';

type Props = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

export function MobileInput({ value, onChange, error, disabled }: Props) {
  const t = useTranslations('auth');
  const [touched, setTouched] = useState(false);
  const message = error ?? (touched && value && !normalizeMobile(value) ? t('errors.invalidMobile') : undefined);
  return (
    <Field fieldStyle="form" label={t('mobile.label')} helper={t('mobile.helper')} error={message}>
      {({ id, describedBy, invalid }) => (
        <div className={controlFrameClasses('form', invalid)} dir="ltr">
          <span className="flex shrink-0 items-center gap-8 self-stretch border-e border-border-subtle pe-12 type-label-small-strong">
            <span className="type-label-caption text-text-muted">EG</span>+20
          </span>
          <input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            inputMode="tel"
            autoComplete="tel-national"
            type="tel"
            placeholder="10 0000 0000"
            className="min-w-0 flex-1 bg-transparent py-16 outline-none placeholder:text-text-subtle"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => {
              setTouched(true);
              const normalized = normalizeMobile(value);
              if (normalized) onChange(normalized.slice(3));
            }}
          />
        </div>
      )}
    </Field>
  );
}
