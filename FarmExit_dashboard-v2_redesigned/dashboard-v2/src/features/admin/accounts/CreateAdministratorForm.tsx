'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { useRouter } from '@/i18n/navigation';
import { createAdministratorAction } from '@/features/admin/actions/accounts';

export type RoleOption = { role: string; permissions: string[] };

export function CreateAdministratorForm({ options }: { options: RoleOption[] }) {
  const t = useTranslations('admin.accountActions');
  const enums = useTranslations('admin.enums.adminRole');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  return (
    <div className="mb-5">
      <Button
        type="button"
        onClick={() => {
          setOpen(!open);
          setMessage('');
        }}
      >
        {t('addAdmin')}
      </Button>
      {open ? (
        <form
          className="admin-detail-panel mt-3 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            setMessage('');
            start(async () => {
              try {
                const result = await createAdministratorAction({
                  fullName: String(data.get('fullName')).trim(),
                  email: String(data.get('email')).trim(),
                  mobile: String(data.get('mobile')).trim(),
                  password: String(data.get('password')),
                  roles,
                });
                setMessage(result.ok ? t('created') : result.message);
                if (result.ok) {
                  form.reset();
                  setRoles([]);
                  setOpen(false);
                  router.refresh();
                }
              } catch {
                setMessage(t('error'));
              }
            });
          }}
        >
          <h2 className="admin-section-title">{t('addAdmin')}</h2>
          <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              {t('name')}
              <input
                name="fullName"
                autoComplete="name"
                required
                minLength={2}
                maxLength={150}
                className="admin-form-control mt-1 max-w-none"
              />
            </label>
            <label className="text-sm">
              {t('email')}
              <input
                name="email"
                type="email"
                autoComplete="off"
                required
                maxLength={255}
                className="admin-form-control mt-1 max-w-none"
              />
            </label>
            <label className="text-sm">
              {t('mobile')}
              <input
                name="mobile"
                type="tel"
                autoComplete="off"
                required
                maxLength={30}
                className="admin-form-control mt-1 max-w-none"
              />
            </label>
            <label className="text-sm">
              {t('password')}
              <input
                name="password"
                aria-label={t('password')}
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,128}"
                className="admin-form-control mt-1 max-w-none"
              />
              <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">{t('passwordHint')}</span>
            </label>
          </fieldset>
          <fieldset disabled={pending} className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">{t('roles')}</legend>
            <p className="text-xs text-[var(--admin-text-muted)]">{t('rolesHint')}</p>
            {options.map((option) => (
              <label
                key={option.role}
                className="block rounded-lg border border-[var(--admin-border-subtle)] p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={roles.includes(option.role)}
                  onChange={(e) =>
                    setRoles(e.target.checked ? [...roles, option.role] : roles.filter((role) => role !== option.role))
                  }
                  className="me-2"
                />
                {enums(option.role)}
                <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                  {option.permissions
                    .map((permission) => t(`permissions.${permission.replaceAll('.', '_')}`))
                    .join(' · ')}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || roles.length === 0}>
              {t(pending ? 'saving' : 'create')}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      ) : null}
      {message ? (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      ) : null}
    </div>
  );
}
