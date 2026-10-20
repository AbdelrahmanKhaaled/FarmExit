'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
};

const LENGTH = 6;

export function OtpInput({ value, onChange, disabled, error }: Props) {
  const t = useTranslations('auth');
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('');

  const setAt = (index: number, char: string) => {
    const next = digits
      .map((d, i) => (i === index ? char : d === ' ' ? '' : d))
      .join('')
      .replace(/\s/g, '');
    onChange(next.slice(0, LENGTH));
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (text) {
      e.preventDefault();
      onChange(text);
      refs.current[Math.min(text.length, LENGTH - 1)]?.focus();
    }
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <p className="sr-only">{t('otp.label')}</p>
      <div className="flex justify-between gap-8" dir="ltr">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            aria-label={t('otp.digit', { n: i + 1 })}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              'h-60 min-w-0 max-w-56 flex-1 rounded-lg border bg-bg-surface text-center type-heading-h4 text-text-primary outline-none focus:ring-1 focus:ring-brand-accent',
              error ? 'border-status-favorite' : 'border-border-strong focus:border-brand-accent',
            )}
            value={d === ' ' ? '' : d}
            onPaste={onPaste}
            onKeyDown={(e) => onKeyDown(i, e)}
            onChange={(e) => {
              const ch = e.target.value.replace(/\D/g, '').slice(-1);
              setAt(i, ch);
              if (ch && i < LENGTH - 1) refs.current[i + 1]?.focus();
            }}
          />
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-status-favorite p-12 type-label-caption text-status-favorite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
