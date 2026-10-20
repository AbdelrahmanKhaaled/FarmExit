'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/icons/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Surface';
import { Link } from '@/i18n/navigation';
import './phase7.css';

export function TaskFrame({
  title,
  context,
  steps,
  step,
  onStep,
  onSaveExit,
  pending,
  saved,
  children,
  actions,
  professional = false,
  complete = false,
  heading,
  intro,
}: {
  title: string;
  context?: string;
  steps: string[];
  step: number;
  onStep: (step: number) => void;
  onSaveExit?: () => void;
  pending?: boolean;
  saved?: boolean;
  children: ReactNode;
  actions?: ReactNode;
  professional?: boolean;
  complete?: boolean;
  heading?: string;
  intro?: string;
}) {
  const t = useTranslations('workspace.phase7');
  const nav = (
    <nav aria-label={title} className="flex flex-col gap-4">
      {steps.map((label, i) => (
        <button
          type="button"
          key={label}
          disabled={pending}
          aria-current={step === i + 1 ? 'step' : undefined}
          onClick={() => onStep(i + 1)}
          className={`flex min-h-56 items-center gap-12 rounded-lg px-12 py-8 text-start ${step === i + 1 ? 'bg-bg-selected text-text-brand' : 'text-text-secondary'}`}
        >
          <span
            className={`flex size-32 shrink-0 items-center justify-center rounded-full border type-label-caption-strong ${step === i + 1 ? 'border-brand-primary bg-bg-surface' : 'border-border-subtle'}`}
          >
            {i + 1}
          </span>
          <span className="type-label-small-strong">{label}</span>
        </button>
      ))}
    </nav>
  );
  return (
    <div data-phase7-task data-complete={complete || undefined} className="min-h-dvh bg-bg-page pb-64">
      <header className="border-b border-border-nav bg-bg-surface">
        <div className="mx-auto flex min-h-78 max-w-1312 items-center justify-between gap-12 px-16 tablet:px-40 desktop:px-0">
          <div className="flex min-w-0 items-center gap-16">
            <span className="hidden tablet:block">
              <Logo height={40} />
            </span>
            <p className="type-label-small-strong">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-16">
            {onSaveExit && (
              <span role="status" className="hidden type-label-caption text-text-muted tablet:block">
                {saved ? t('saved') : t('unsaved')}
              </span>
            )}
            <Link href="/my/messages" className="hidden type-label-caption text-text-brand tablet:block">
              {t('help')}
            </Link>
            {onSaveExit ? (
              <Button variant="outline" type="button" size="sm" disabled={pending} onClick={onSaveExit}>
                {t('saveExit')}
              </Button>
            ) : (
              <Link href="/my" className="type-label-caption text-text-brand">
                {t('portal')}
              </Link>
            )}
          </div>
        </div>
      </header>
      <div
        data-testid="phase7-task-grid"
        className={
          complete
            ? 'mx-auto max-w-656 px-16 py-64'
            : 'mx-auto grid max-w-1312 items-start gap-24 px-16 py-24 tablet:grid-cols-[minmax(0,1fr)_240px] tablet:px-40 tablet:py-40 desktop:grid-cols-[296px_minmax(0,1fr)_264px] desktop:gap-48 desktop:px-0'
        }
      >
        <aside className={complete ? 'hidden' : 'hidden desktop:col-start-1 desktop:row-start-1 desktop:block'}>
          <Card padding="sm">
            <p className="type-overline-field text-text-gold">{title}</p>
            {context && <p className="mb-20 mt-8 type-label-large wrap-anywhere">{context}</p>}
            {nav}
            <p className="mt-24 border-t border-border-subtle pt-20 type-label-caption text-text-muted">
              {professional ? t('professionalPrivate') : t('private')}
            </p>
          </Card>
        </aside>
        <div className={complete ? 'min-w-0' : 'min-w-0 tablet:col-start-1 tablet:row-start-1 desktop:col-start-2'}>
          <div className={complete ? 'hidden' : 'mb-24 flex flex-col gap-12'}>
            <div className="flex items-center justify-between">
              <p className="type-overline-field text-text-gold">{t('step', { n: step, total: steps.length })}</p>
              <details className="relative desktop:hidden">
                <summary className="cursor-pointer list-none p-8" aria-label={t('steps')}>
                  <Icon name="menu" size={20} />
                </summary>
                <div className="absolute end-0 top-40 z-20 w-280 rounded-card border border-border-hairline bg-bg-surface p-12 shadow-premium-rest">
                  {nav}
                </div>
              </details>
            </div>
            <h1 className="type-heading-h3">{heading ?? steps[step - 1]}</h1>
            {intro && <p className="type-body-default text-text-muted">{intro}</p>}
            <div className="flex gap-4 desktop:hidden" aria-hidden="true">
              {steps.map((s, i) => (
                <span
                  key={s}
                  className={`h-4 flex-1 rounded-full ${i + 1 === step ? 'bg-brand-primary' : 'bg-border-subtle'}`}
                />
              ))}
            </div>
          </div>
          {children}
          {actions && (
            <div
              data-testid="phase7-actions"
              className="mt-24 flex items-start justify-between gap-12 border-t border-border-hairline pt-24"
            >
              <fieldset disabled={pending} className="contents">
                {actions}
              </fieldset>
            </div>
          )}
        </div>
        <aside
          className={
            complete
              ? 'hidden'
              : 'hidden min-w-0 flex-col gap-24 tablet:col-start-2 tablet:row-start-1 tablet:flex desktop:col-start-3'
          }
        >
          <Card surface="muted" className="border-overlay-gold-hairline">
            <Icon name="verify-filled" size={28} className="mb-16 text-text-gold" />
            <h2 className="type-label-large">{professional ? t('verificationTitle') : t('reviewTitle')}</h2>
            <p className="mt-12 type-body-caption text-text-muted">
              {professional ? t('verificationNote') : t('reviewNote')}
            </p>
          </Card>
          <Card>
            <Icon name="lock" size={20} className="mb-12 text-text-brand" />
            <h2 className="type-overline-field text-text-brand">{t('communication')}</h2>
            <p className="mt-12 type-body-caption text-text-muted">{t('communicationNote')}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function Choice({
  name,
  value,
  label,
  checked,
  onChange,
  disabled,
  big = false,
  type = 'checkbox',
  description,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  big?: boolean;
  type?: 'checkbox' | 'radio';
  description?: string;
}) {
  return (
    <label
      className={`relative flex cursor-pointer justify-between gap-12 rounded-lg border type-label-small-strong ${big ? 'min-h-132 flex-col items-start p-20' : 'min-h-52 items-center p-12'} ${checked ? 'border-brand-primary bg-bg-selected text-text-brand' : 'border-border-hairline'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      {big && <Icon name="user" size={28} />}
      <span className={big ? 'min-w-0 type-heading-h4' : 'min-w-0'}>{label}</span>
      {description && <span className="type-body-caption text-text-muted">{description}</span>}
      <span className={big ? 'absolute end-20 top-20 size-18' : 'relative size-18 shrink-0'}>
        <input
          type={type}
          aria-label={label}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="block size-18 appearance-none rounded-full border border-border-subtle bg-bg-surface checked:border-brand-primary checked:bg-brand-primary"
        />
        {checked && (
          <Icon name="check" size={12} className="pointer-events-none absolute start-3 top-3 text-text-on-dark" />
        )}
      </span>
    </label>
  );
}
