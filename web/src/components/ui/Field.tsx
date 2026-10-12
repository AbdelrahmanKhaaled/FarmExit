'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';

/*
 * Figma: Components → Group / Form Fields (Text Input) · Group / Marketplace Filters (Select Field).
 * Two field styles share the same tokens:
 * - `form`   → label Label/Small Strong (text/secondary), 56px control, value Label/Large (Select Field / Form)
 * - `filter` → label Overline/Field (text/muted), 52px control, value Body/Default (Text Input, Select Field / Filter)
 * Border/strong at rest; focus = lime (brand/accent) 1.5px; error = status/favorite 1.5px + red helper.
 */
export type FieldStyle = 'form' | 'filter';

const LABEL: Record<FieldStyle, string> = {
  form: 'type-label-small-strong text-text-secondary',
  filter: 'type-overline-field text-text-muted',
};

const CONTROL: Record<FieldStyle, string> = {
  form: 'min-h-56 gap-12 type-label-large',
  filter: 'min-h-52 gap-8 type-body-default',
};

type FieldShellProps = {
  label: ReactNode;
  helper?: ReactNode;
  /** Error message. When set, the control is marked invalid and the message replaces the helper. */
  error?: ReactNode;
  fieldStyle?: FieldStyle;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
};

/** Label + control + helper/error, wired for assistive tech. Used by TextInput, Select and TextArea. */
export function Field({ label, helper, error, fieldStyle = 'filter', className, children }: FieldShellProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? helper;
  return (
    <div className={cn('flex flex-col gap-8', className)}>
      <label htmlFor={id} className={LABEL[fieldStyle]}>
        {label}
      </label>
      {children({ id, describedBy: message ? messageId : undefined, invalid: Boolean(error) })}
      {message && (
        <p id={messageId} className={cn('type-label-caption', error ? 'text-status-favorite' : 'text-text-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}

/** Visual frame shared by all controls. Focus and error states use an inset ring so the 1→1.5px change never shifts layout. */
export function controlFrameClasses(fieldStyle: FieldStyle, invalid: boolean) {
  return cn(
    'flex w-full items-center rounded-lg border bg-bg-surface px-16 text-text-primary transition-colors duration-150',
    CONTROL[fieldStyle],
    invalid
      ? 'border-status-favorite shadow-[inset_0_0_0_0.5px_var(--color-status-favorite)]'
      : 'border-border-strong focus-within:border-brand-accent focus-within:shadow-[inset_0_0_0_0.5px_var(--color-brand-accent)]',
    'has-disabled:bg-bg-disabled has-disabled:text-text-disabled',
  );
}

const NATIVE =
  'min-w-0 flex-1 bg-transparent text-inherit outline-none placeholder:text-text-subtle disabled:cursor-not-allowed';

type CommonProps = {
  label: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  fieldStyle?: FieldStyle;
  className?: string;
};

export function TextInput({
  label,
  helper,
  error,
  fieldStyle = 'filter',
  className,
  ...input
}: CommonProps & Omit<ComponentProps<'input'>, 'className' | 'id'>) {
  return (
    <Field label={label} helper={helper} error={error} fieldStyle={fieldStyle} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className={controlFrameClasses(fieldStyle, invalid)}>
          <input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={NATIVE}
            {...input}
          />
        </div>
      )}
    </Field>
  );
}

export function TextArea({
  label,
  helper,
  error,
  fieldStyle = 'form',
  className,
  rows = 4,
  ...textarea
}: CommonProps & Omit<ComponentProps<'textarea'>, 'className' | 'id'>) {
  return (
    <Field label={label} helper={helper} error={error} fieldStyle={fieldStyle} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className={cn(controlFrameClasses(fieldStyle, invalid), 'items-start py-14')}>
          <textarea
            id={id}
            rows={rows}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(NATIVE, 'resize-y')}
            {...textarea}
          />
        </div>
      )}
    </Field>
  );
}

/**
 * Native select (accessible, mobile-friendly pickers) styled as the Figma Select Field with the Chevron Down icon.
 * Pass `placeholder` to render the muted "Select a governorate" state.
 */
export function Select({
  label,
  helper,
  error,
  fieldStyle = 'form',
  className,
  placeholder,
  defaultValue,
  children,
  ...select
}: CommonProps & { placeholder?: string } & Omit<ComponentProps<'select'>, 'className' | 'id'>) {
  const iconSize = fieldStyle === 'form' ? 20 : 18;
  return (
    <Field label={label} helper={helper} error={error} fieldStyle={fieldStyle} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className={cn(controlFrameClasses(fieldStyle, invalid), 'relative')}>
          <select
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            // An uncontrolled select with a placeholder starts on the empty option.
            defaultValue={defaultValue ?? (placeholder !== undefined && select.value === undefined ? '' : undefined)}
            className={cn(
              NATIVE,
              'cursor-pointer appearance-none self-stretch',
              invalid ? 'pe-56' : 'pe-28',
              // Muted while the empty placeholder option is selected.
              placeholder && 'has-[option[value=""]:checked]:text-text-subtle',
            )}
            {...select}
          >
            {placeholder !== undefined && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {children}
          </select>
          <span className="pointer-events-none absolute inset-y-0 end-16 flex items-center gap-8">
            {invalid && <Icon name="close-circle" size={iconSize} className="text-status-favorite" />}
            <Icon name="chevron-down" size={iconSize} className="text-text-primary" />
          </span>
        </div>
      )}
    </Field>
  );
}
